/**
 * Densidades estimadas por tipo de grano (t/m³) en condiciones estándar de almacenamiento.
 * Fuente: tablas de industria granaria argentina (Bolsa de Cereales / SENASA).
 */
export const GRAIN_DENSITIES = {
  'Trigo':               0.80,
  'Soja':                0.775,
  'Maíz':                0.75,
  'Sorgo':               0.73,
  'Cebada':              0.65,
  'Arroz (con cáscara)': 0.58,
  'Avena':               0.50,
  'Girasol':             0.42,
};

export const DEFAULT_DENSITY = 0.70;

/**
 * Humedad relativa de referencia (%) para condiciones estándar de almacenamiento.
 * Por encima de estos valores el grano absorbe humedad y aumenta su peso.
 */
export const GRAIN_HUM_REF = {
  'Trigo':               65,
  'Soja':                60,
  'Maíz':                65,
  'Sorgo':               65,
  'Cebada':              65,
  'Arroz (con cáscara)': 70,
  'Avena':               65,
  'Girasol':             55,
};

export const DEFAULT_HUM_REF = 65;

const HUM_CORRECTION = 0.004;

/** Lista ordenada de tipos de grano para selectores */
export const GRAIN_TYPES = Object.keys(GRAIN_DENSITIES).concat(['Otro']);

/**
 * Devuelve la densidad base (t/m³) para un tipo de grano.
 */
export function getDensity(grainType) {
  if (!grainType) return DEFAULT_DENSITY;
  if (GRAIN_DENSITIES[grainType] != null) return GRAIN_DENSITIES[grainType];
  const normalized = grainType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, val] of Object.entries(GRAIN_DENSITIES)) {
    const kNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (kNorm === normalized) return val;
  }
  return DEFAULT_DENSITY;
}

/**
 * Devuelve la densidad ajustada (t/m³) considerando la humedad relativa medida.
 * Cada 1% de HR sobre la referencia sube la densidad ~0.4% (clampado ±15%).
 * @param {string}      grainType
 * @param {number|null} humidity - humedad relativa del sensor (%)
 */
export function getDensityAdjusted(grainType, humidity) {
  const base = getDensity(grainType);
  if (humidity == null || !Number.isFinite(Number(humidity))) return base;

  const humRef = GRAIN_HUM_REF[grainType] ?? DEFAULT_HUM_REF;
  const delta  = Number(humidity) - humRef;
  const factor = Math.max(0.85, Math.min(1.15, 1 + delta * HUM_CORRECTION));
  return parseFloat((base * factor).toFixed(4));
}

/**
 * Ángulos de reposo típicos por tipo de grano (grados).
 * Se usan para simular la forma del cono de grano en el mapa de calor.
 */
export const GRAIN_ANGLES = {
  'Trigo':               27,
  'Soja':                30,
  'Maíz':                32,
  'Sorgo':               28,
  'Cebada':              25,
  'Arroz (con cáscara)': 35,
  'Avena':               26,
  'Girasol':             28,
};
export const DEFAULT_ANGLE = 30;

/**
 * Calcula la capacidad máxima teórica del silo en toneladas
 * usando volumen cilíndrico × densidad (ajustada por humedad si se provee).
 * @param {number}      diameter  - diámetro del silo en metros
 * @param {number}      height    - altura del silo en metros
 * @param {string}      grainType
 * @param {number|null} humidity  - humedad del sensor (opcional)
 */
export function calcCapacidad(diameter, height, grainType, humidity = null) {
  const r   = (diameter || 0) / 2;
  const h   = height || 0;
  const d   = getDensityAdjusted(grainType, humidity);
  const vol = Math.PI * r * r * h;
  return parseFloat((vol * d).toFixed(2));
}
