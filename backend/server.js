import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sensorDataRouter } from './routes/sensorData.js';
import { silosRouter } from './routes/silos.js';
import { cameraRouter } from './routes/camera.js';
import { authRouter } from './routes/auth.js';
import { initDatabase } from './database/init.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api/auth', authRouter);
app.use('/api/sensor-data', sensorDataRouter);
app.use('/api/silos', silosRouter);
app.use('/api/camera', cameraRouter);

// Alias para el ESP32: POST /api/datos-silo → handler IoT de sensorDataRouter
app.use('/api/datos-silo', (req, res, next) => {
  req.url = '/iot';
  sensorDataRouter(req, res, next);
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Salgest Backend API'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'Salgest Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth (login, register)',
      sensorData: '/api/sensor-data',
      silos: '/api/silos',
      camera: '/api/camera/:siloId'
    }
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Inicializar base de datos (si está configurada)
    if (process.env.DATABASE_URL) {
      await initDatabase();
      console.log('✅ Base de datos inicializada');
    } else {
      console.log('⚠️  Base de datos no configurada (modo sin persistencia)');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
      console.log(`📡 Endpoints disponibles:`);
      console.log(`   - GET  /health`);
      console.log(`   - POST /api/sensor-data`);
      console.log(`   - GET  /api/silos`);
      console.log(`   - GET  /api/silos/:id`);
      console.log(`   - GET  /api/silos/:id/history`);
      console.log(`   - POST /api/camera/:siloId  (imagen JPEG)`);
      console.log(`   - GET  /api/camera/:siloId  (última imagen)`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

