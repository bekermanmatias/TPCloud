/**
 * Tipos de alerta del sistema Salgest.
 * Cada clave es el valor almacenado en la columna alert_type de la tabla alerts.
 */
export const ALERT_TYPES = {
  // ── Nivel y stock (HC-SR04) ────────────────────────────────────────────────
  STOCK_CRITICAL:      'STOCK_CRITICAL',      // nivel ≤ 10 %
  CAPACITY_MAX:        'CAPACITY_MAX',        // nivel ≥ 95 %
  SUDDEN_DROP:         'SUDDEN_DROP',         // caída brusca entre lecturas

  // ── Ambientales simples (BME280) ───────────────────────────────────────────
  TEMP_HIGH:           'TEMP_HIGH',           // temperatura > umbral
  HUMIDITY_CRITICAL:   'HUMIDITY_CRITICAL',   // humedad > umbral
  CONDENSATION_RISK:   'CONDENSATION_RISK',   // cerca del punto de rocío

  // ── Calidad del aire (MQ-135) ──────────────────────────────────────────────
  GAS_MILD:            'GAS_MILD',            // gases levemente elevados
  GAS_CRITICAL:        'GAS_CRITICAL',        // gases en nivel peligroso

  // ── Alertas combinadas ─────────────────────────────────────────────────────
  FERMENTATION_RISK:   'FERMENTATION_RISK',   // Temp + Hum + Gas simultáneos
  HEAT_FOCUS:          'HEAT_FOCUS',          // aumento rápido Temp + Gas
  INSECT_RISK:         'INSECT_RISK',         // condiciones aptas para gorgojos

  // ── Salud del dispositivo ──────────────────────────────────────────────────
  DEVICE_OFFLINE:      'DEVICE_OFFLINE',      // sin datos > X minutos
  DEVICE_UNSTABLE:     'DEVICE_UNSTABLE',     // reinicios frecuentes

  // ── Hardware / Sensor ──────────────────────────────────────────────────────
  SENSOR_ERROR:        'SENSOR_ERROR',        // valor físicamente imposible
};

/**
 * Umbrales predeterminados.
 * Los usuarios pueden sobreescribirlos por silo en alert_configs.
 */
export const DEFAULT_THRESHOLDS = {
  // Nivel
  STOCK_CRITICAL_PCT:    10,     // %
  CAPACITY_MAX_PCT:      95,     // %
  SUDDEN_DROP_PCT:        5,     // % máxima caída permitida entre lecturas

  // Temperatura
  TEMP_ATTENTION:        28,     // °C
  TEMP_HEAT_RISE:         3,     // °C de subida en las últimas 2 horas

  // Humedad
  HUMIDITY_CRITICAL:     70,     // %
  CONDENSATION_MARGIN:    2,     // °C por debajo del punto de rocío

  // Gas (valor raw MQ-135)
  GAS_MILD:             100,     // umbral atención leve
  GAS_CRITICAL:         150,     // umbral peligro

  // Combinadas
  FERMENTATION_TEMP:     30,     // °C
  FERMENTATION_HUM:      65,     // %
  INSECT_TEMP_MIN:       25,     // °C
  INSECT_TEMP_MAX:       32,     // °C
  INSECT_HUM_MIN:        50,     // %
  INSECT_HUM_MAX:        65,     // %
  GAS_RISE_FACTOR:     1.20,     // 20 % sobre la media de las últimas lecturas

  // Dispositivo
  OFFLINE_MINUTES:       30,     // minutos sin datos → dispositivo offline
};

/** Metadata de presentación para el frontend */
export const ALERT_META = {
  [ALERT_TYPES.STOCK_CRITICAL]:    { label: 'Stock crítico',                   icon: '📏', color: 'red' },
  [ALERT_TYPES.CAPACITY_MAX]:      { label: 'Capacidad máxima alcanzada',       icon: '📏', color: 'yellow' },
  [ALERT_TYPES.SUDDEN_DROP]:       { label: 'Caída brusca de nivel',            icon: '📏', color: 'red' },
  [ALERT_TYPES.TEMP_HIGH]:         { label: 'Temperatura elevada',              icon: '🌡️', color: 'yellow' },
  [ALERT_TYPES.HUMIDITY_CRITICAL]: { label: 'Humedad crítica',                  icon: '💧', color: 'red' },
  [ALERT_TYPES.CONDENSATION_RISK]: { label: 'Riesgo de condensación',           icon: '💧', color: 'yellow' },
  [ALERT_TYPES.GAS_MILD]:          { label: 'Gases levemente elevados',         icon: '🌫️', color: 'yellow' },
  [ALERT_TYPES.GAS_CRITICAL]:      { label: 'Gases en nivel peligroso',         icon: '🌫️', color: 'red' },
  [ALERT_TYPES.FERMENTATION_RISK]: { label: 'Riesgo de fermentación activa',    icon: '🧠', color: 'red' },
  [ALERT_TYPES.HEAT_FOCUS]:        { label: 'Foco de calor interno',            icon: '🧠', color: 'red' },
  [ALERT_TYPES.INSECT_RISK]:       { label: 'Condiciones para insectos',        icon: '🧠', color: 'yellow' },
  [ALERT_TYPES.DEVICE_OFFLINE]:    { label: 'Dispositivo sin conexión',         icon: '📡', color: 'red' },
  [ALERT_TYPES.DEVICE_UNSTABLE]:   { label: 'Inestabilidad de hardware',        icon: '📡', color: 'yellow' },
  [ALERT_TYPES.SENSOR_ERROR]:      { label: 'Error de sensor / Lectura inválida', icon: '⚠️', color: 'red' },
};
