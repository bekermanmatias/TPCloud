import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sensorDataRouter } from './routes/sensorData.js';
import { silosRouter } from './routes/silos.js';
import { initDatabase } from './database/init.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api/sensor-data', sensorDataRouter);
app.use('/api/silos', silosRouter);

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
      sensorData: '/api/sensor-data',
      silos: '/api/silos'
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
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

