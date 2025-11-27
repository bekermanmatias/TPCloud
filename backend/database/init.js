// Inicialización de base de datos PostgreSQL
// Por ahora es un placeholder, se implementará cuando se configure PostgreSQL

import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Inicializa la conexión a la base de datos
 */
export async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL no configurada, usando almacenamiento en memoria');
    return;
  }

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    // Probar conexión
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL establecida');

    // Crear tablas si no existen
    await createTables();
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error.message);
    throw error;
  }
}

/**
 * Crea las tablas necesarias en la base de datos
 */
async function createTables() {
  const createSilosTable = `
    CREATE TABLE IF NOT EXISTS silos (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      capacity DECIMAL(10, 2),
      height DECIMAL(5, 2),
      grain_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSensorDataTable = `
    CREATE TABLE IF NOT EXISTS sensor_data (
      id SERIAL PRIMARY KEY,
      silo_id VARCHAR(50) REFERENCES silos(id),
      timestamp TIMESTAMP NOT NULL,
      temperature_avg DECIMAL(5, 2),
      temperature_min DECIMAL(5, 2),
      temperature_max DECIMAL(5, 2),
      temperature_risk BOOLEAN DEFAULT FALSE,
      humidity DECIMAL(5, 2),
      humidity_risk BOOLEAN DEFAULT FALSE,
      grain_level_percentage DECIMAL(5, 2),
      grain_level_tons DECIMAL(10, 2),
      grain_level_distance DECIMAL(5, 2),
      co2 DECIMAL(6, 0),
      co2_risk BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_sensor_data_silo_id ON sensor_data(silo_id);
    CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp);
  `;

  try {
    await pool.query(createSilosTable);
    await pool.query(createSensorDataTable);
    await pool.query(createIndexes);
    console.log('✅ Tablas de base de datos creadas/verificadas');
  } catch (error) {
    console.error('❌ Error al crear tablas:', error.message);
    throw error;
  }
}

/**
 * Obtiene el pool de conexiones
 */
export function getPool() {
  return pool;
}

