import axios from 'axios';
import { SensorSimulator } from './sensorSimulator.js';

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const INTERVAL_MS = process.env.INTERVAL_MS || 5000;

// Lista de silos a simular
const SILOS = [
  'silo-001',
  'silo-002',
  'silo-003',
  'silo-004',
  'silo-005'
];

// Crear simuladores para cada silo
const simulators = SILOS.map(siloId => ({
  id: siloId,
  simulator: new SensorSimulator(siloId)
}));

console.log(`🚀 Simulador Multi-Silo iniciado`);
console.log(`📡 Enviando datos a: ${API_URL}`);
console.log(`⏱️  Intervalo: ${INTERVAL_MS}ms`);
console.log(`📦 Silos: ${SILOS.join(', ')}\n`);

// Función para enviar datos de un silo
async function sendSensorData(siloId, simulator) {
  try {
    const sensorData = simulator.generateData();
    
    const payload = {
      siloId: siloId,
      timestamp: new Date().toISOString(),
      ...sensorData
    };

    await axios.post(`${API_URL}/sensor-data`, payload);
    console.log(`✅ [${siloId}] Datos enviados - Temp: ${sensorData.temperature.average.toFixed(1)}°C, Nivel: ${sensorData.grainLevel.percentage.toFixed(1)}%`);
  } catch (error) {
    console.error(`❌ [${siloId}] Error:`, error.message);
  }
}

// Función para enviar datos de todos los silos
async function sendAllData() {
  console.log(`\n📊 Enviando datos de ${SILOS.length} silos...`);
  const promises = simulators.map(({ id, simulator }) => 
    sendSensorData(id, simulator)
  );
  await Promise.all(promises);
  console.log(`✅ Ciclo completado\n`);
}

// Enviar datos periódicamente
setInterval(sendAllData, INTERVAL_MS);

// Enviar primer ciclo inmediatamente
sendAllData();

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo simulador multi-silo...');
  process.exit(0);
});

