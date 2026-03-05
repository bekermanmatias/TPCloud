import 'dotenv/config';
import { initDatabase, getPool } from '../database/init.js';

async function main() {
  await initDatabase();
  const pool = getPool();
  if (!pool) {
    console.error('❌ No hay conexión a la base de datos.');
    process.exit(1);
  }

  const email = 'matias@example.com';

  // Buscar usuario por email
  const userRes = await pool.query(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [email]
  );

  if (userRes.rows.length === 0) {
    console.error(`❌ No existe un usuario con email ${email}. Crealo primero desde la app.`);
    process.exit(1);
  }

  const userId = userRes.rows[0].id;

  // Crear un silo nuevo para este usuario si no existe
  const siloId = 'silo-demo-aws-1';

  await pool.query(
    `INSERT INTO silos (id, user_id, name, location, capacity, height, diameter, grain_type, kit_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [
      siloId,
      userId,
      'Silo Demo AWS',
      'Lote Sur',
      120.0,
      12.0,
      6.0,
      'Soja',
      'SILO-DEMO-AWS',
    ]
  );

  // Insertar algunas lecturas de ejemplo
  const now = new Date();
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const ts = new Date(now.getTime() - i * 15 * 60 * 1000); // cada 15 minutos
    const temp = 25 + i;       // 25..29
    const hum  = 60 + i * 2;   // 60..68
    const co2  = 80 + i * 10;  // 80..120
    const pct  = 70 - i * 3;   // 70..58
    const tons = 80 - i * 2;   // 80..72
    const dist = 120 - pct;    // ficticio

    rows.push([
      siloId,
      ts,
      temp,
      temp - 1,
      temp + 1,
      temp > 28,
      hum,
      hum > 70,
      1010.5,
      pct,
      tons,
      dist,
      co2,
      co2 > 100,
      null, // image_path
    ]);
  }

  for (const r of rows) {
    await pool.query(
      `INSERT INTO sensor_data (
         silo_id, timestamp,
         temperature_avg, temperature_min, temperature_max, temperature_risk,
         humidity, humidity_risk,
         presion,
         grain_level_percentage, grain_level_tons, grain_level_distance,
         co2, co2_risk,
         image_path
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      r
    );
  }

  console.log('✅ Silo demo y datos de ejemplo creados para', email);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en seedExtraSilo:', err);
  process.exit(1);
});

