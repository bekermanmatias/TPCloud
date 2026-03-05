import { getPool } from '../database/init.js';

// Fallback en memoria cuando no hay BD (solo para desarrollo sin DATABASE_URL)
let sensorDataStore = new Map();
let latestDataBySilo = new Map();

function dbRowToLatestData(row) {
  if (!row) return null;
  return {
    id: `db-${row.id}`,
    siloId: row.silo_id,
    timestamp: new Date(row.timestamp).toISOString(),
    temperature: {
      sensors: [],
      average: Number(row.temperature_avg),
      min: Number(row.temperature_min),
      max: Number(row.temperature_max),
      hasRisk: Boolean(row.temperature_risk)
    },
    humidity: Number(row.humidity),
    humidityRisk: Boolean(row.humidity_risk),
    grainLevel: {
      percentage: Number(row.grain_level_percentage),
      tons: Number(row.grain_level_tons),
      distance: Number(row.grain_level_distance),
      capacity: null
    },
    gases: { co2: Number(row.co2), hasRisk: Boolean(row.co2_risk) },
    imagePath: row.image_path || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

function dbRowToHistoryRow(row) {
  return {
    timestamp: new Date(row.timestamp).toISOString(),
    temperature: {
      average: Number(row.temperature_avg),
      min: Number(row.temperature_min),
      max: Number(row.temperature_max),
      hasRisk: Boolean(row.temperature_risk)
    },
    humidity: Number(row.humidity),
    humidityRisk: Boolean(row.humidity_risk),
    grainLevel: {
      percentage: Number(row.grain_level_percentage),
      tons: Number(row.grain_level_tons),
      distance: Number(row.grain_level_distance),
      capacity: null
    },
    gases: { co2: Number(row.co2), hasRisk: Boolean(row.co2_risk) },
    imagePath: row.image_path || null
  };
}

/**
 * Guarda datos de sensores (PostgreSQL o memoria)
 */
export async function saveSensorData(data) {
  const pool = getPool();

  const timestamp = new Date(data.timestamp);
  const temp = data.temperature || {};
  const grain = data.grainLevel || {};
  const gases = data.gases || {};

  if (pool) {
    await pool.query(
      `INSERT INTO sensor_data (
        silo_id, timestamp,
        temperature_avg, temperature_min, temperature_max, temperature_risk,
        humidity, humidity_risk,
        grain_level_percentage, grain_level_tons, grain_level_distance,
        co2, co2_risk,
        image_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        data.siloId,
        timestamp,
        temp.average ?? null,
        temp.min ?? null,
        temp.max ?? null,
        Boolean(temp.hasRisk),
        data.humidity ?? null,
        Boolean(data.humidityRisk),
        grain.percentage ?? null,
        grain.tons ?? null,
        grain.distance ?? null,
        gases.co2 ?? null,
        Boolean(gases.hasRisk),
        data.imagePath ?? null
      ]
    );
    console.log(`💾 Datos guardados en BD para ${data.siloId}`);
    return { siloId: data.siloId, timestamp: timestamp.toISOString(), imagePath: data.imagePath ?? null };
  }

  // Fallback memoria
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
    imagePath: data.imagePath ?? null,
    createdAt: new Date().toISOString()
  };
  sensorDataStore.set(key, sensorData);
  latestDataBySilo.set(data.siloId, sensorData);
  const siloData = Array.from(sensorDataStore.values())
    .filter(d => d.siloId === data.siloId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 1000);
  const keysToKeep = new Set(siloData.map(d => d.id));
  for (const [k, v] of sensorDataStore.entries()) {
    if (v.siloId === data.siloId && !keysToKeep.has(k)) sensorDataStore.delete(k);
  }
  return sensorData;
}

/**
 * Último dato de un silo (BD o memoria)
 */
export async function getLatestData(siloId) {
  const pool = getPool();
  if (pool) {
    const result = await pool.query(
      `SELECT silo_id, timestamp, temperature_avg, temperature_min, temperature_max, temperature_risk,
              humidity, humidity_risk, grain_level_percentage, grain_level_tons, grain_level_distance,
              co2, co2_risk, image_path, created_at
       FROM sensor_data WHERE silo_id = $1 ORDER BY timestamp DESC LIMIT 1`,
      [siloId]
    );
    const row = result.rows[0];
    return row ? dbRowToLatestData(row) : null;
  }
  return latestDataBySilo.get(siloId) || null;
}

/**
 * Historial de un silo (BD o memoria)
 */
export async function getSiloHistory(siloId, options = {}) {
  const { limit = 100, hours = 24 } = options;
  const pool = getPool();

  if (pool) {
    const result = await pool.query(
      `SELECT timestamp, temperature_avg, temperature_min, temperature_max, temperature_risk,
              humidity, humidity_risk, grain_level_percentage, grain_level_tons, grain_level_distance,
              co2, co2_risk, image_path
       FROM sensor_data
       WHERE silo_id = $1 AND timestamp >= NOW() - ($2 * interval '1 hour')
       ORDER BY timestamp DESC LIMIT $3`,
      [siloId, hours, limit]
    );
    return result.rows.map(dbRowToHistoryRow);
  }

  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  const history = Array.from(sensorDataStore.values())
    .filter(d => d.siloId === siloId && new Date(d.timestamp) >= cutoffTime)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .map(d => ({
      timestamp: d.timestamp,
      temperature: d.temperature,
      humidity: d.humidity,
      humidityRisk: d.humidityRisk,
      grainLevel: d.grainLevel,
      gases: d.gases,
      imagePath: d.imagePath ?? null
    }));
  return history;
}

export async function getAllData() {
  const pool = getPool();
  if (pool) {
    const result = await pool.query('SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 500');
    return result.rows.map(r => dbRowToLatestData(r));
  }
  return Array.from(sensorDataStore.values());
}
