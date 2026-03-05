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

  // Usar el silo demo creado anteriormente
  const siloId = 'silo-demo-aws-1';
  const siloRes = await pool.query(
    'SELECT id FROM silos WHERE id = $1 LIMIT 1',
    [siloId]
  );

  if (siloRes.rows.length === 0) {
    console.error(`❌ No se encontró el silo ${siloId}. Ejecutá primero seedExtraSilo.js.`);
    process.exit(1);
  }

  // Borrar alertas anteriores de este silo para no duplicar
  await pool.query('DELETE FROM alerts WHERE silo_id = $1', [siloId]);

  const now = new Date();

  const alerts = [
    {
      alert_type: 'temperature_high_demo',
      severity: 'warning',
      message: 'Temperatura elevada en el silo demo.',
      data: { threshold: 28, value: 29.5, unit: '°C' },
      triggered_at: new Date(now.getTime() - 10 * 60 * 1000), // hace 10 min
    },
    {
      alert_type: 'humidity_high_demo',
      severity: 'critical',
      message: 'Humedad muy alta en el silo demo. Revisar ventilación.',
      data: { threshold: 75, value: 82, unit: '%' },
      triggered_at: new Date(now.getTime() - 5 * 60 * 1000), // hace 5 min
    },
  ];

  for (const a of alerts) {
    await pool.query(
      `INSERT INTO alerts (silo_id, alert_type, severity, message, data, triggered_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [siloId, a.alert_type, a.severity, a.message, a.data, a.triggered_at]
    );
  }

  console.log('✅ Alertas demo creadas para', email, 'en el silo', siloId);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en seedDemoAlerts:', err);
  process.exit(1);
});

