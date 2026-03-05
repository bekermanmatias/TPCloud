// Inicialización de base de datos PostgreSQL

import pg from 'pg';
import bcrypt from 'bcrypt';
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
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSilosTable = `
    CREATE TABLE IF NOT EXISTS silos (
      id VARCHAR(50) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      capacity DECIMAL(10, 2),
      height DECIMAL(5, 2),
      diameter DECIMAL(5, 2),
      grain_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSensorDataTable = `
    CREATE TABLE IF NOT EXISTS sensor_data (
      id SERIAL PRIMARY KEY,
      silo_id VARCHAR(50) REFERENCES silos(id) ON DELETE CASCADE,
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
    CREATE INDEX IF NOT EXISTS idx_silos_user_id ON silos(user_id);
    CREATE INDEX IF NOT EXISTS idx_sensor_data_silo_id ON sensor_data(silo_id);
    CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp);
  `;

  try {
    await pool.query(createUsersTable);
    await pool.query(createSilosTable);
    await pool.query(createSensorDataTable);
    await pool.query(createIndexes);
    await migrateSilosAddUserId();
    console.log('✅ Tablas de base de datos creadas/verificadas');
  } catch (error) {
    console.error('❌ Error al crear tablas:', error.message);
    throw error;
  }
}

/**
 * Migración: si silos existe sin user_id (BD antigua), añadir columna y usuario por defecto
 */
async function migrateSilosAddUserId() {
  const hasColumn = await pool.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'silos' AND column_name = 'user_id'
  `);
  if (hasColumn.rows.length > 0) return;

  await pool.query('ALTER TABLE silos ADD COLUMN user_id INTEGER');
  let userId = (await pool.query('SELECT id FROM users LIMIT 1')).rows[0]?.id;
  if (!userId) {
    const hash = await bcrypt.hash('admin', 10);
    const ins = await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, 'Admin') RETURNING id`,
      ['admin@salgest.local', hash]
    );
    userId = ins.rows[0]?.id;
  }
  if (userId) {
    await pool.query('UPDATE silos SET user_id = $1 WHERE user_id IS NULL', [userId]);
    await pool.query('ALTER TABLE silos ALTER COLUMN user_id SET NOT NULL');
    await pool.query('ALTER TABLE silos ADD CONSTRAINT fk_silos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
  }
}

/**
 * Obtiene el pool de conexiones
 */
export function getPool() {
  return pool;
}

