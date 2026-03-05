import { getPool } from '../database/init.js';
import { ALERT_TYPES, DEFAULT_THRESHOLDS } from '../constants/alertThresholds.js';

// ── Helpers matemáticos ───────────────────────────────────────────────────────

/** Punto de rocío mediante fórmula de Magnus */
function dewPoint(tempC, humPct) {
  if (!Number.isFinite(tempC) || !Number.isFinite(humPct) || humPct <= 0) return null;
  const a = 17.27, b = 237.3;
  const alpha = (a * tempC) / (b + tempC) + Math.log(humPct / 100);
  return (b * alpha) / (a - alpha);
}

/** Media aritmética de un arreglo de números */
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ── Acceso a BD ───────────────────────────────────────────────────────────────

/** Últimas N lecturas de sensor_data para un silo (más recientes primero) */
async function getRecentReadings(siloId, n = 6) {
  const pool = getPool();
  if (!pool) return [];
  const res = await pool.query(
    `SELECT timestamp, temperature_avg, humidity, grain_level_percentage, co2
     FROM sensor_data
     WHERE silo_id = $1
     ORDER BY timestamp DESC
     LIMIT $2`,
    [siloId, n]
  );
  return res.rows;
}

/** Thresholds efectivos para el silo (defaults + overrides del usuario) */
async function getThresholds(siloId) {
  const pool = getPool();
  const base = { ...DEFAULT_THRESHOLDS };
  if (!pool || !siloId) return base;
  const res = await pool.query(
    'SELECT alert_type, threshold_value FROM alert_configs WHERE silo_id = $1',
    [siloId]
  );
  for (const row of res.rows) {
    if (base[row.alert_type] !== undefined) {
      base[row.alert_type] = Number(row.threshold_value);
    }
  }
  return base;
}

// ── Gestión de alertas activas ────────────────────────────────────────────────

/**
 * Activa o actualiza una alerta activa (unresolved) de cierto tipo para el silo.
 */
async function triggerAlert(siloId, type, severity, message, data = {}) {
  const pool = getPool();
  if (!pool) return;
  try {
    const existing = await pool.query(
      `SELECT id FROM alerts WHERE silo_id = $1 AND alert_type = $2 AND resolved_at IS NULL`,
      [siloId, type]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE alerts SET message = $3, data = $4, triggered_at = NOW()
         WHERE id = $1 AND silo_id = $2 AND resolved_at IS NULL`,
        [existing.rows[0].id, siloId, message, JSON.stringify(data)]
      );
    } else {
      await pool.query(
        `INSERT INTO alerts (silo_id, alert_type, severity, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [siloId, type, severity, message, JSON.stringify(data)]
      );
    }
  } catch (err) {
    console.warn(`⚠️  Error al activar alerta ${type}:`, err.message);
  }
}

/**
 * Resuelve (auto-cierra) una alerta cuando la condición ya no se cumple.
 */
async function resolveAlert(siloId, type) {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `UPDATE alerts SET resolved_at = NOW()
       WHERE silo_id = $1 AND alert_type = $2 AND resolved_at IS NULL`,
      [siloId, type]
    );
  } catch (err) {
    console.warn(`⚠️  Error al resolver alerta ${type}:`, err.message);
  }
}

// ── Evaluadores individuales ──────────────────────────────────────────────────

async function evalStock(siloId, pct, thr) {
  if (pct <= thr.STOCK_CRITICAL_PCT) {
    await triggerAlert(siloId, ALERT_TYPES.STOCK_CRITICAL, 'critical',
      `Nivel de grano crítico (${pct.toFixed(1)}%). Planificar recarga o limpieza.`,
      { percentage: pct, threshold: thr.STOCK_CRITICAL_PCT });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.STOCK_CRITICAL);
  }

  if (pct >= thr.CAPACITY_MAX_PCT) {
    await triggerAlert(siloId, ALERT_TYPES.CAPACITY_MAX, 'warning',
      `Silo al tope de capacidad (${pct.toFixed(1)}%). Detener carga para evitar desbordes.`,
      { percentage: pct, threshold: thr.CAPACITY_MAX_PCT });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.CAPACITY_MAX);
  }
}

async function evalSuddenDrop(siloId, pct, readings, thr) {
  if (readings.length < 2) return;

  const prev = readings[1];
  const prevPct = Number(prev?.grain_level_percentage ?? pct);
  const drop = prevPct - pct;

  // Solo es "caída brusca" si la lectura anterior es reciente (< 2 horas).
  // Una caída de 5 % tras 24 h puede ser consumo normal.
  const minsSincePrev = prev?.timestamp
    ? (Date.now() - new Date(prev.timestamp).getTime()) / 60000
    : Infinity;
  const recentEnough = minsSincePrev <= 120;

  if (recentEnough && drop >= thr.SUDDEN_DROP_PCT) {
    await triggerAlert(siloId, ALERT_TYPES.SUDDEN_DROP, 'critical',
      `Caída anómala del nivel detectada (${drop.toFixed(1)}% en ${Math.round(minsSincePrev)} min). Verificar integridad del silo o posible hurto.`,
      { previous: prevPct, current: pct, drop: parseFloat(drop.toFixed(1)), minutesSincePrev: Math.round(minsSincePrev) });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.SUDDEN_DROP);
  }
}

async function evalTemperature(siloId, temp, thr) {
  if (temp > thr.TEMP_ATTENTION) {
    await triggerAlert(siloId, ALERT_TYPES.TEMP_HIGH, 'warning',
      `Temperatura interna elevada (${temp.toFixed(1)}°C). Monitorear evolución.`,
      { temperature: temp, threshold: thr.TEMP_ATTENTION });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.TEMP_HIGH);
  }
}

async function evalHumidity(siloId, hum, thr) {
  if (hum > thr.HUMIDITY_CRITICAL) {
    await triggerAlert(siloId, ALERT_TYPES.HUMIDITY_CRITICAL, 'critical',
      `Humedad ambiente crítica (${hum.toFixed(0)}%). Alto riesgo de desarrollo de hongos.`,
      { humidity: hum, threshold: thr.HUMIDITY_CRITICAL });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.HUMIDITY_CRITICAL);
  }
}

async function evalCondensation(siloId, temp, hum, thr) {
  const dp = dewPoint(temp, hum);
  if (dp !== null && (temp - dp) < thr.CONDENSATION_MARGIN) {
    await triggerAlert(siloId, ALERT_TYPES.CONDENSATION_RISK, 'warning',
      `Condiciones propensas a condensación (T: ${temp.toFixed(1)}°C | Rocío: ${dp.toFixed(1)}°C). El agua podría gotear sobre el grano.`,
      { temperature: temp, dewPoint: parseFloat(dp.toFixed(1)), diff: parseFloat((temp - dp).toFixed(1)) });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.CONDENSATION_RISK);
  }
}

async function evalGas(siloId, gas, readings, thr) {
  // Alerta crítica absoluta
  if (gas > thr.GAS_CRITICAL) {
    await triggerAlert(siloId, ALERT_TYPES.GAS_CRITICAL, 'critical',
      `Nivel de gases tóxicos/explosivos crítico (${gas}). NO INGRESAR al silo. Ventilar inmediatamente.`,
      { gas, threshold: thr.GAS_CRITICAL });
    await resolveAlert(siloId, ALERT_TYPES.GAS_MILD);
    return;
  }
  await resolveAlert(siloId, ALERT_TYPES.GAS_CRITICAL);

  // Alerta leve: supera umbral directo O 20% sobre promedio histórico
  const historicGas = readings.slice(1).map(r => Number(r.co2 ?? 0)).filter(v => v > 0);
  const gasAvg = historicGas.length ? avg(historicGas) : 0;
  const risingAboveAvg = gasAvg > 0 && gas > gasAvg * thr.GAS_RISE_FACTOR;

  if (gas > thr.GAS_MILD || risingAboveAvg) {
    await triggerAlert(siloId, ALERT_TYPES.GAS_MILD, 'warning',
      `Aumento en la concentración de gases (${gas}${risingAboveAvg ? `, +${(((gas / gasAvg) - 1) * 100).toFixed(0)}% sobre la media` : ''}). Posible inicio de actividad biológica.`,
      { gas, avg: parseFloat(gasAvg.toFixed(0)), threshold: thr.GAS_MILD });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.GAS_MILD);
  }
}

async function evalCombined(siloId, temp, hum, gas, readings, thr) {
  // Fermentación activa
  if (temp > thr.FERMENTATION_TEMP && hum > thr.FERMENTATION_HUM && gas > thr.GAS_MILD) {
    await triggerAlert(siloId, ALERT_TYPES.FERMENTATION_RISK, 'critical',
      `¡ALERTA CRÍTICA! Alta probabilidad de fermentación y pudrición activa. T: ${temp.toFixed(1)}°C, H: ${hum.toFixed(0)}%, Gas: ${gas}.`,
      { temperature: temp, humidity: hum, gas });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.FERMENTATION_RISK);
  }

  // Foco de calor: temperatura sube rápido Y gases suben rápido en ~2 horas
  {
    const twoHoursAgo = readings.find(r => {
      const diff = (Date.now() - new Date(r.timestamp).getTime()) / 60000;
      return diff >= 90;
    });

    if (twoHoursAgo) {
      const tempRise = temp - Number(twoHoursAgo.temperature_avg ?? temp);
      const gasOld   = Number(twoHoursAgo.co2 ?? gas);
      const gasRise  = gasOld > 0 ? (gas - gasOld) / gasOld : 0;
      if (tempRise >= thr.TEMP_HEAT_RISE && gasRise >= 0.15) {
        await triggerAlert(siloId, ALERT_TYPES.HEAT_FOCUS, 'critical',
          `Aumento anómalo de temperatura (+${tempRise.toFixed(1)}°C) y gases (+${(gasRise * 100).toFixed(0)}%) simultáneo. Posible foco de calor interno.`,
          { tempRise: parseFloat(tempRise.toFixed(1)), gasRisePct: parseFloat((gasRise * 100).toFixed(1)) });
      } else {
        // Condición no cumplida: resolver si estaba activa
        await resolveAlert(siloId, ALERT_TYPES.HEAT_FOCUS);
      }
    } else {
      // Sin lectura de referencia de ~2 horas atrás: no hay datos suficientes
      // para confirmar el foco → auto-resolver para no dejar alertas huérfanas
      await resolveAlert(siloId, ALERT_TYPES.HEAT_FOCUS);
    }
  }

  // Ambiente ideal para insectos
  if (temp >= thr.INSECT_TEMP_MIN && temp <= thr.INSECT_TEMP_MAX &&
      hum >= thr.INSECT_HUM_MIN && hum <= thr.INSECT_HUM_MAX) {
    await triggerAlert(siloId, ALERT_TYPES.INSECT_RISK, 'warning',
      `Las condiciones actuales son óptimas para gorgojos/insectos (T: ${temp.toFixed(1)}°C, H: ${hum.toFixed(0)}%). Se recomienda aireación.`,
      { temperature: temp, humidity: hum });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.INSECT_RISK);
  }
}

/**
 * @param {number} alturaTotalCm  Altura total del silo en cm (para detectar distancias imposibles)
 */
async function evalSensorError(siloId, distancia_vacia, temp, hum, alturaTotalCm) {
  // HC-SR04: mínimo ~2 cm → exactamente 0 = error; negativo = imposible
  const distInvalid = distancia_vacia <= 0
    // distancia mayor que la altura del silo (sensor sin eco / objeto fuera de rango)
    || (alturaTotalCm > 0 && distancia_vacia > alturaTotalCm * 1.1);

  const tempInvalid = !Number.isFinite(temp) || temp < -10 || temp > 80;
  const humInvalid  = !Number.isFinite(hum)  || hum < 0   || hum > 100;

  if (distInvalid || tempInvalid || humInvalid) {
    const reasons = [
      distInvalid && `distancia_vacia: ${distancia_vacia} cm (silo: ${alturaTotalCm} cm)`,
      tempInvalid && `temperatura: ${temp}°C`,
      humInvalid  && `humedad: ${hum}%`,
    ].filter(Boolean).join(', ');
    await triggerAlert(siloId, ALERT_TYPES.SENSOR_ERROR, 'critical',
      `El sensor reportó un valor físicamente imposible: ${reasons}. Verificar el hardware.`,
      { distancia_vacia, temperatura: temp, humedad: hum, alturaTotalCm });
  } else {
    await resolveAlert(siloId, ALERT_TYPES.SENSOR_ERROR);
  }
}

// ── API pública del servicio ──────────────────────────────────────────────────

/**
 * Evaluación completa de alertas al recibir un dato del IoT.
 * @param {string} siloId
 * @param {object} payload        Mismo objeto que se pasa a saveSensorData
 * @param {number} distancia_vacia Valor raw del sensor (cm)
 * @param {number} alturaTotalCm  Altura total del silo en cm (para validar rango del sensor)
 */
export async function evaluateAlerts(siloId, payload, distancia_vacia, alturaTotalCm = 0) {
  try {
    const temp = payload.temperature?.average ?? 0;
    const hum  = payload.humidity ?? 0;
    const gas  = payload.gases?.co2 ?? 0;
    const pct  = payload.grainLevel?.percentage ?? 0;

    const [thr, readings] = await Promise.all([
      getThresholds(siloId),
      getRecentReadings(siloId, 8),
    ]);

    await Promise.all([
      evalSensorError(siloId, distancia_vacia, temp, hum, alturaTotalCm),
      evalStock(siloId, pct, thr),
      evalSuddenDrop(siloId, pct, readings, thr),
      evalTemperature(siloId, temp, thr),
      evalHumidity(siloId, hum, thr),
      evalCondensation(siloId, temp, hum, thr),
      evalGas(siloId, gas, readings, thr),
      evalCombined(siloId, temp, hum, gas, readings, thr),
    ]);
  } catch (err) {
    console.warn('⚠️  Error en evaluateAlerts:', err.message);
  }
}

/**
 * Verifica si hay dispositivos offline entre los silos del usuario.
 * Se llama desde el router de alertas al hacer GET.
 */
export async function checkDeviceOffline(userId) {
  const pool = getPool();
  if (!pool) return;
  try {
    // Obtener todos los silos con kit_code del usuario
    const silosRes = await pool.query(
      `SELECT id, name, kit_code FROM silos WHERE user_id = $1 AND kit_code IS NOT NULL`,
      [userId]
    );
    const thr = DEFAULT_THRESHOLDS;

    for (const silo of silosRes.rows) {
      const lastData = await pool.query(
        `SELECT timestamp FROM sensor_data WHERE silo_id = $1 ORDER BY timestamp DESC LIMIT 1`,
        [silo.id]
      );
      const lastTs = lastData.rows[0]?.timestamp;
      if (!lastTs) continue;
      const minsSince = (Date.now() - new Date(lastTs).getTime()) / 60000;

      if (minsSince > thr.OFFLINE_MINUTES) {
        await triggerAlert(silo.id, ALERT_TYPES.DEVICE_OFFLINE, 'critical',
          `Dispositivo "${silo.kit_code}" fuera de línea hace ${Math.round(minsSince)} min. Revisar alimentación y cobertura WiFi.`,
          { lastSeen: lastTs, minutesSince: Math.round(minsSince) });
      } else {
        await resolveAlert(silo.id, ALERT_TYPES.DEVICE_OFFLINE);
      }
    }
  } catch (err) {
    console.warn('⚠️  Error en checkDeviceOffline:', err.message);
  }
}

/**
 * Devuelve todas las alertas activas (sin resolver) de los silos del usuario.
 */
export async function getActiveAlertsByUser(userId) {
  const pool = getPool();
  if (!pool) return [];
  const res = await pool.query(
    `SELECT a.id, a.silo_id, s.name AS silo_name, a.alert_type, a.severity,
            a.message, a.data, a.triggered_at, a.acknowledged_at
     FROM alerts a
     JOIN silos s ON s.id = a.silo_id
     WHERE s.user_id = $1 AND a.resolved_at IS NULL
     ORDER BY a.severity DESC, a.triggered_at DESC`,
    [userId]
  );
  return res.rows;
}

/**
 * Devuelve alertas activas para un silo específico.
 */
export async function getActiveAlertsBySilo(siloId) {
  const pool = getPool();
  if (!pool) return [];
  const res = await pool.query(
    `SELECT id, silo_id, alert_type, severity, message, data, triggered_at, acknowledged_at
     FROM alerts
     WHERE silo_id = $1 AND resolved_at IS NULL
     ORDER BY severity DESC, triggered_at DESC`,
    [siloId]
  );
  return res.rows;
}

/**
 * Reconoce (acknowledges) una alerta por su ID.
 */
export async function acknowledgeAlert(alertId, userId) {
  const pool = getPool();
  if (!pool) return null;
  const res = await pool.query(
    `UPDATE alerts SET acknowledged_at = NOW(), acknowledged_by = $2
     WHERE id = $1 AND resolved_at IS NULL
     RETURNING id, alert_type, acknowledged_at`,
    [alertId, userId]
  );
  return res.rows[0] || null;
}

/**
 * Devuelve el historial completo de alertas de un silo (activas + resueltas).
 * Incluye la duración calculada y el correo del usuario que reconoció.
 */
export async function getAlertHistory(siloId, { limit = 100, days = 30 } = {}) {
  const pool = getPool();
  if (!pool) return [];
  const res = await pool.query(
    `SELECT a.id, a.alert_type, a.severity, a.message, a.data,
            a.triggered_at, a.resolved_at, a.acknowledged_at,
            u.email AS acknowledged_by_email
     FROM alerts a
     LEFT JOIN users u ON u.id = a.acknowledged_by
     WHERE a.silo_id = $1
       AND a.triggered_at >= NOW() - ($2 * interval '1 day')
     ORDER BY a.triggered_at DESC
     LIMIT $3`,
    [siloId, days, limit]
  );
  return res.rows.map((row) => ({
    id:                  row.id,
    type:                row.alert_type,
    severity:            row.severity,
    message:             row.message,
    data:                row.data,
    triggeredAt:         row.triggered_at,
    resolvedAt:          row.resolved_at,
    acknowledgedAt:      row.acknowledged_at,
    acknowledgedByEmail: row.acknowledged_by_email ?? null,
    // Duración en minutos (null si sigue activa)
    durationMins: row.resolved_at
      ? Math.round((new Date(row.resolved_at) - new Date(row.triggered_at)) / 60_000)
      : null,
  }));
}

/**
 * Devuelve los umbrales configurados para un silo (defaults + overrides).
 */
export async function getSiloThresholds(siloId) {
  return getThresholds(siloId);
}

/**
 * Actualiza un umbral específico para un silo.
 */
export async function updateSiloThreshold(siloId, alertType, value) {
  const pool = getPool();
  if (!pool) throw new Error('BD no disponible');
  if (DEFAULT_THRESHOLDS[alertType] === undefined) {
    throw new Error(`Tipo de umbral desconocido: ${alertType}`);
  }
  await pool.query(
    `INSERT INTO alert_configs (silo_id, alert_type, threshold_value)
     VALUES ($1, $2, $3)
     ON CONFLICT (silo_id, alert_type)
     DO UPDATE SET threshold_value = EXCLUDED.threshold_value, updated_at = NOW()`,
    [siloId, alertType, value]
  );
  return getThresholds(siloId);
}
