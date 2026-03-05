import { getPool } from '../database/init.js';
import { getLatestData } from './sensorDataService.js';

function rowToSilo(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    location: row.location || '',
    locationId: row.location ? row.location.toLowerCase().replace(/\s+/g, '-') : '',
    capacity: row.capacity != null ? Number(row.capacity) : 100,
    height: row.height != null ? Number(row.height) : 10,
    diameter: row.diameter != null ? Number(row.diameter) : 6,
    grainType: row.grain_type || 'Soja',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

/**
 * Lista todos los silos del usuario
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function getAllSilos(userId) {
  const pool = getPool();
  if (!pool) return [];

  const result = await pool.query(
    'SELECT id, name, location, capacity, height, diameter, grain_type, created_at FROM silos WHERE user_id = $1 ORDER BY name',
    [userId]
  );

  const silos = result.rows.map(rowToSilo);
  const silosWithData = await Promise.all(
    silos.map(async (silo) => {
      const latestData = await getLatestData(silo.id);
      return { ...silo, latestData: latestData || null };
    })
  );
  return silosWithData;
}

/**
 * Obtiene un silo por ID solo si pertenece al usuario
 */
export async function getSiloById(id, userId) {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    'SELECT id, name, location, capacity, height, diameter, grain_type, created_at FROM silos WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  const row = result.rows[0];
  if (!row) return null;

  const silo = rowToSilo(row);
  const latestData = await getLatestData(id);
  return { ...silo, latestData: latestData || null };
}

/**
 * Obtiene historial de datos de un silo (delegado a sensorDataService)
 */
export async function getSiloHistory(id, options = {}) {
  const { getSiloHistory } = await import('./sensorDataService.js');
  return getSiloHistory(id, options);
}

/**
 * Crea un nuevo silo para el usuario
 * @param {number} userId
 * @param {{ name: string, location?: string, capacity?: number, height?: number, diameter?: number, grainType?: string }} data
 */
export async function createSilo(userId, data) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const id = data.id || `silo-${Date.now()}`;
  const name = (data.name || 'Nuevo Silo').trim();
  const location = (data.location || '').trim() || null;
  const capacity = data.capacity != null ? Number(data.capacity) : 100;
  const height = data.height != null ? Number(data.height) : 10;
  const diameter = data.diameter != null ? Number(data.diameter) : 6;
  const grainType = (data.grainType || 'Soja').trim();

  await pool.query(
    `INSERT INTO silos (id, user_id, name, location, capacity, height, diameter, grain_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, userId, name, location, capacity, height, diameter, grainType]
  );

  return getSiloById(id, userId);
}

/**
 * Actualiza un silo (solo si pertenece al usuario)
 */
export async function updateSilo(id, userId, data) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const existing = await getSiloById(id, userId);
  if (!existing) return null;

  const name = (data.name !== undefined ? data.name : existing.name).trim();
  const location = (data.location !== undefined ? data.location : existing.location).trim() || null;
  const capacity = data.capacity != null ? Number(data.capacity) : existing.capacity;
  const height = data.height != null ? Number(data.height) : existing.height;
  const diameter = data.diameter != null ? Number(data.diameter) : existing.diameter;
  const grainType = (data.grainType !== undefined ? data.grainType : existing.grainType).trim();

  await pool.query(
    `UPDATE silos SET name = $1, location = $2, capacity = $3, height = $4, diameter = $5, grain_type = $6 WHERE id = $7 AND user_id = $8`,
    [name, location, capacity, height, diameter, grainType, id, userId]
  );

  return getSiloById(id, userId);
}

/**
 * Elimina un silo (solo si pertenece al usuario). CASCADE borra sensor_data.
 */
export async function deleteSilo(id, userId) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const result = await pool.query('DELETE FROM silos WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  return result.rowCount > 0;
}
