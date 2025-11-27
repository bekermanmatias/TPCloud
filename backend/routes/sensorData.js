import express from 'express';
import { saveSensorData, getLatestData } from '../services/sensorDataService.js';

const router = express.Router();

// POST /api/sensor-data - Recibir datos de sensores
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    // Validar datos requeridos
    if (!data.siloId || !data.timestamp) {
      return res.status(400).json({ 
        error: 'Datos incompletos: se requiere siloId y timestamp' 
      });
    }

    if (!data.temperature || !data.humidity || !data.grainLevel || !data.gases) {
      return res.status(400).json({ 
        error: 'Datos incompletos: faltan datos de sensores' 
      });
    }

    // Guardar datos
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

