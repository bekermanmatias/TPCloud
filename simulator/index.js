import axios from 'axios';
import { SensorSimulator } from './sensorSimulator.js';

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const SILO_ID = process.env.SILO_ID || 'silo-001';
const INTERVAL_MS = process.env.INTERVAL_MS || 5000; // Enviar datos cada 5 segundos

// Crear instancia del simulador
const simulator = new SensorSimulator(SILO_ID);

console.log(`🚀 Simulador IoT iniciado para ${SILO_ID}`);
console.log(`📡 Enviando datos a: ${API_URL}`);
console.log(`⏱️  Intervalo: ${INTERVAL_MS}ms\n`);

// Función para enviar datos al backend
async function sendSensorData() {
  try {
    const sensorData = simulator.generateData();
    
    const payload = {
      siloId: SILO_ID,
      timestamp: new Date().toISOString(),
      ...sensorData
    };

    const response = await axios.post(`${API_URL}/sensor-data`, payload);
    console.log(`✅ Datos enviados: ${new Date().toLocaleTimeString()}`);
    console.log(`   Temperatura: ${sensorData.temperature.average.toFixed(2)}°C`);
    console.log(`   Humedad: ${sensorData.humidity.toFixed(2)}%`);
    console.log(`   Nivel: ${sensorData.grainLevel.percentage.toFixed(1)}%`);
    console.log(`   CO2: ${sensorData.gases.co2.toFixed(0)} ppm\n`);
  } catch (error) {
    console.error(`❌ Error al enviar datos:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensaje: ${error.response.data?.message || 'Error desconocido'}\n`);
    }
  }
}

// Enviar datos periódicamente
setInterval(sendSensorData, INTERVAL_MS);

// Enviar primer dato inmediatamente
sendSensorData();

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo simulador...');
  process.exit(0);
});

