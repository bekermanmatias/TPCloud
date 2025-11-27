// Servicio para manejar datos de sensores
// Por ahora usa almacenamiento en memoria, luego se integrará con PostgreSQL

let sensorDataStore = new Map(); // Almacenamiento temporal en memoria
let latestDataBySilo = new Map(); // Últimos datos por silo

/**
 * Guarda datos de sensores
 * @param {Object} data - Datos del sensor
 * @returns {Object} Datos guardados
 */
export async function saveSensorData(data) {
  const timestamp = new Date(data.timestamp);
  const key = `${data.siloId}_${timestamp.getTime()}`;
  
  const sensorData = {
    id: key,
    siloId: data.siloId,
    timestamp: timestamp.toISOString(),
    temperature: data.temperature,
    humidity: data.humidity,
    humidityRisk: data.humidityRisk || false,
    grainLevel: data.grainLevel,
    gases: data.gases,
    createdAt: new Date().toISOString()
  };
  
  // Guardar en almacenamiento temporal
  sensorDataStore.set(key, sensorData);
  
  // Actualizar último dato del silo
  latestDataBySilo.set(data.siloId, sensorData);
  
  // Limitar almacenamiento (mantener solo últimos 1000 registros por silo)
  const siloData = Array.from(sensorDataStore.values())
    .filter(d => d.siloId === data.siloId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 1000);
  
  // Limpiar datos antiguos
  const keysToKeep = new Set(siloData.map(d => d.id));
  for (const [key, value] of sensorDataStore.entries()) {
    if (value.siloId === data.siloId && !keysToKeep.has(key)) {
      sensorDataStore.delete(key);
    }
  }
  
  console.log(`💾 Datos guardados para ${data.siloId} (${sensorDataStore.size} registros totales)`);
  
  return sensorData;
}

/**
 * Obtiene el último dato de un silo
 * @param {string} siloId - ID del silo
 * @returns {Object|null} Último dato o null si no existe
 */
export async function getLatestData(siloId) {
  return latestDataBySilo.get(siloId) || null;
}

/**
 * Obtiene historial de datos de un silo
 * @param {string} siloId - ID del silo
 * @param {Object} options - Opciones (limit, hours)
 * @returns {Array} Array de datos históricos
 */
export async function getSiloHistory(siloId, options = {}) {
  const { limit = 100, hours = 24 } = options;
  
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const history = Array.from(sensorDataStore.values())
    .filter(d => d.siloId === siloId && new Date(d.timestamp) >= cutoffTime)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
  
  return history;
}

/**
 * Obtiene todos los datos almacenados (para debugging)
 * @returns {Array} Todos los datos
 */
export async function getAllData() {
  return Array.from(sensorDataStore.values());
}

