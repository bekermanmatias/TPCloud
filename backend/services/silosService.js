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
    kitCode: row.kit_code || null,
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
    'SELECT id, name, location, capacity, height, diameter, grain_type, kit_code, created_at FROM silos WHERE user_id = $1 ORDER BY name',
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
    'SELECT id, name, location, capacity, height, diameter, grain_type, kit_code, created_at FROM silos WHERE id = $1 AND user_id = $2',
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
 * @param {{ name: string, location?: string, capacity?: number, height?: number, diameter?: number, grainType?: string, kitCode?: string }} data
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
  const kitCode = (data.kitCode || '').trim() || null;

  if (kitCode) {
    const other = await pool.query('SELECT id FROM silos WHERE kit_code = $1', [kitCode]);
    if (other.rows.length > 0) throw new Error('Ese código de kit ya está vinculado a otro silo');
  }

  await pool.query(
    `INSERT INTO silos (id, user_id, name, location, capacity, height, diameter, grain_type, kit_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, userId, name, location, capacity, height, diameter, grainType, kitCode]
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

  // kit_code: si viene en el payload lo procesamos, si no se tocó dejamos el actual
  let kitCode = existing.kitCode;
  if ('kitCode' in data) {
    kitCode = (data.kitCode || '').trim() || null;
    if (kitCode) {
      const other = await pool.query('SELECT id FROM silos WHERE kit_code = $1 AND id != $2', [kitCode, id]);
      if (other.rows.length > 0) throw new Error('Ese código de kit ya está vinculado a otro silo');
    }
  }

  await pool.query(
    `UPDATE silos SET name = $1, location = $2, capacity = $3, height = $4, diameter = $5, grain_type = $6, kit_code = $7 WHERE id = $8 AND user_id = $9`,
    [name, location, capacity, height, diameter, grainType, kitCode, id, userId]
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

/**
 * Obtiene el id y capacidad del silo asociado a un kit_code (para recibir datos del dispositivo sin auth)
 */
export async function getSiloIdByKitCode(kitCode) {
  const pool = getPool();
  if (!pool) return null;
  const trimmed = (kitCode || '').trim();
  if (!trimmed) return null;
  const result = await pool.query('SELECT id FROM silos WHERE kit_code = $1', [trimmed]);
  return result.rows[0]?.id ?? null;
}

/**
 * Obtiene id, capacidad, height, diameter y grain_type de un silo por kit_code,
 * sin requerir autenticación (usado por el handler IoT).
 */
export async function getSiloInfoByKitCode(kitCode) {
  const pool = getPool();
  if (!pool) return null;
  const trimmed = (kitCode || '').trim();
  if (!trimmed) return null;
  const result = await pool.query(
    'SELECT id, capacity, height, diameter, grain_type FROM silos WHERE kit_code = $1',
    [trimmed]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    id:        row.id,
    capacity:  Number(row.capacity),
    height:    Number(row.height),
    diameter:  Number(row.diameter),
    grainType: row.grain_type || 'Soja',
  };
}

/**
 * Vincula un kit_code a un silo (solo si el silo es del usuario). kit_code único en la tabla.
 */
export async function updateSiloKitCode(id, userId, kitCode) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const existing = await getSiloById(id, userId);
  if (!existing) return null;

  const value = (kitCode || '').trim() || null;
  if (value) {
    const other = await pool.query('SELECT id FROM silos WHERE kit_code = $1 AND id != $2', [value, id]);
    if (other.rows.length > 0) throw new Error('Ese código de kit ya está vinculado a otro silo');
  }

  await pool.query('UPDATE silos SET kit_code = $1 WHERE id = $2 AND user_id = $3', [value, id, userId]);
  return getSiloById(id, userId);
}
