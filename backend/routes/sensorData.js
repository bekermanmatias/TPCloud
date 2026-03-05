import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import { saveSensorData, getLatestData } from '../services/sensorDataService.js';
import { getSiloIdByKitCode, getSiloInfoByKitCode } from '../services/silosService.js';
import { saveCameraFrame } from '../services/cameraService.js';
import { getDensityAdjusted, GRAIN_HUM_REF, DEFAULT_HUM_REF } from '../constants/grainDensities.js';
import { evaluateAlerts } from '../services/alertsService.js';

const router = express.Router();

// ── Configuración de S3 para fotos de silos ────────────────────────────────────
const rawBucket = process.env.AWS_BUCKET_NAME;
const bucketName = rawBucket && rawBucket.startsWith('arn:aws:s3:::')
  ? rawBucket.split(':::').pop()
  : rawBucket;

if (!bucketName) {
  throw new Error('AWS_BUCKET_NAME no está definido. Configurá el nombre del bucket en el .env del backend.');
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: bucketName,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const kit = String(req.body?.kit_code || 'unknown').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = (file.originalname && path.extname(file.originalname)) || (file.mimetype === 'image/png' ? '.png' : '.jpg');
      const safeExt = ext.length <= 10 ? ext : '.jpg';
      const filename = `${kit}_${Date.now()}${safeExt}`;
      cb(null, `silo-photos/${filename}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/sensor-data - Recibir datos de sensores (siloId o kit_code para identificar el silo)
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };

    if (data.kit_code) {
      const siloId = await getSiloIdByKitCode(data.kit_code);
      if (!siloId) {
        return res.status(404).json({
          error: 'No existe un silo vinculado con ese código de kit',
          kit_code: data.kit_code
        });
      }
      data.siloId = siloId;
    }

    if (!data.siloId || !data.timestamp) {
      return res.status(400).json({
        error: 'Datos incompletos: se requiere siloId o kit_code, y timestamp'
      });
    }

    if (!data.temperature || !data.humidity || !data.grainLevel || !data.gases) {
      return res.status(400).json({
        error: 'Datos incompletos: faltan datos de sensores'
      });
    }

    const savedData = await saveSensorData(data);

    res.status(201).json({
      message: 'Datos recibidos correctamente',
      data: savedData
    });
  } catch (error) {
    console.error('Error al procesar datos de sensores:', error);
    res.status(500).json({
      error: 'Error al procesar datos de sensores',
      message: error.message
    });
  }
});

// POST /api/sensor-data/iot - Recibir datos desde ESP32 usando multipart/form-data (con foto)
router.post('/iot', upload.single('fotoSilo'), async (req, res) => {
  try {
    const kit_code = String(req.body?.kit_code || '').trim();
    const temperatura = Number(req.body?.temperatura);
    const humedad = Number(req.body?.humedad);
    // presion es opcional: el ESP32 la envía si tiene BME280/BMP280, null si no
    const presion = req.body?.presion != null ? Number(req.body.presion) : null;
    const gas = Number.parseInt(req.body?.gas, 10);
    // El ESP32 envía distancia_vacia (cm desde el sensor hasta la superficie del grano)
    const distancia_vacia = Number(req.body?.distancia_vacia);

    if (!kit_code) {
      return res.status(400).json({ error: 'kit_code es requerido' });
    }
    if (
      !Number.isFinite(temperatura) ||
      !Number.isFinite(humedad) ||
      Number.isNaN(gas) ||
      !Number.isFinite(distancia_vacia)
    ) {
      return res.status(400).json({
        error: 'Datos incompletos o inválidos',
        required: ['kit_code(string)', 'temperatura(float)', 'humedad(float)', 'gas(int)', 'distancia_vacia(float cm)']
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Falta el archivo fotoSilo (req.file)' });
    }

    const siloInfo = await getSiloInfoByKitCode(kit_code);
    if (!siloInfo) {
      return res.status(404).json({
        error: 'No existe un silo vinculado con ese código de kit',
        kit_code
      });
    }

    const { id: siloId, capacity, height, diameter, grainType } = siloInfo;

    // ── Cálculos de nivel ──────────────────────────────────────────────────────
    // height está en metros en la BD → convertimos a cm
    const alturaTotalCm = height * 100;
    // Nivel real = espacio total - espacio vacío medido por el sensor
    const nivelRealCm = Math.max(0, alturaTotalCm - distancia_vacia);
    // Porcentaje de llenado (0–100)
    const percentage = alturaTotalCm > 0
      ? Math.min(100, parseFloat(((nivelRealCm / alturaTotalCm) * 100).toFixed(1)))
      : 0;

    // ── Toneladas: volumen cilíndrico × densidad ajustada por humedad ──────────
    // La densidad base se corrige según la humedad real medida por el sensor:
    // cada 1% de HR sobre la referencia sube la densidad ~0.4% (máx ±15%).
    const densidad = getDensityAdjusted(grainType, humedad);  // t/m³ ajustada
    const humRef   = GRAIN_HUM_REF[grainType] ?? DEFAULT_HUM_REF;

    const radioM     = (diameter || 6) / 2;            // metros
    const nivelM     = nivelRealCm / 100;              // metros
    const volGranoM3 = Math.PI * radioM * radioM * nivelM;
    const tons       = parseFloat((volGranoM3 * densidad).toFixed(2));

    // Capacidad máxima teórica con densidad ajustada
    const volTotalM3   = Math.PI * radioM * radioM * height;
    const capacidadCalc = parseFloat((volTotalM3 * densidad).toFixed(2));
    // ──────────────────────────────────────────────────────────────────────────

    // URL pública en S3 generada por multer-s3
    const fotoSiloUrl = req.file.location;

    // Alinear flags de riesgo con los umbrales de alertas (importados del servicio)
    const humidityRisk = humedad > 70;   // igual que HUMIDITY_CRITICAL threshold
    const tempRisk = temperatura > 28;   // igual que TEMP_ATTENTION threshold
    const gasRisk = gas > 100;           // igual que GAS_MILD threshold

    const payload = {
      siloId,
      timestamp: new Date().toISOString(),
      temperature: { average: temperatura, min: temperatura, max: temperatura, hasRisk: tempRisk },
      humidity: humedad,
      humidityRisk,
      presion: Number.isFinite(presion) ? presion : null,
      grainLevel: { percentage, tons, distance: distancia_vacia, capacity: capacidadCalc, density: densidad, humRef },
      gases: { co2: gas, hasRisk: gasRisk },
      imagePath: fotoSiloUrl
    };

    await saveSensorData(payload);

    // Evaluar alertas en segundo plano (no bloquea la respuesta al ESP32)
    evaluateAlerts(siloId, payload, distancia_vacia, alturaTotalCm).catch((e) =>
      console.warn('⚠️  evaluateAlerts:', e.message)
    );

    res.status(201).json({
      kit_code,
      siloId,
      timestamp: payload.timestamp,
      temperatura,
      humedad,
      presion,
      gas,
      distancia_vacia,
      nivelRealCm,
      percentage,
      tons,
      densidad,
      humRef,
      grainType,
      capacidadCalc,
      fotoSiloUrl
    });
  } catch (error) {
    console.error('Error al procesar datos IoT (multipart):', error);
    res.status(500).json({
      error: 'Error al procesar datos IoT',
      message: error.message
    });
  }
});

// GET /api/sensor-data/latest/:siloId - Obtener último dato de un silo
router.get('/latest/:siloId', async (req, res) => {
  try {
    const { siloId } = req.params;
    const latestData = await getLatestData(siloId);
    
    if (!latestData) {
      return res.status(404).json({ 
        error: 'No se encontraron datos para el silo especificado' 
      });
    }
    
    res.json(latestData);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ 
      error: 'Error al obtener datos',
      message: error.message 
    });
  }
});

export { router as sensorDataRouter };

