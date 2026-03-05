/**
 * Densidades estimadas por tipo de grano (t/m³) en condiciones estándar de almacenamiento.
 * Fuente: tablas de industria granaria argentina (Bolsa de Cereales / SENASA).
 */
export const GRAIN_DENSITIES = {
  'Trigo':               0.80,
  'Soja':                0.775, // promedio 0.75–0.80
  'Maíz':                0.75,
  'Sorgo':               0.73,
  'Cebada':              0.65,
  'Arroz (con cáscara)': 0.58,
  'Avena':               0.50,
  'Girasol':             0.42,
};

export const DEFAULT_DENSITY = 0.70; // t/m³ para tipos no listados

/**
 * Humedad relativa de referencia (%) para condiciones estándar de almacenamiento.
 * Por encima de estos valores el grano absorbe humedad y aumenta su peso.
 * Valores empíricos según normativa argentina.
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

/**
 * Factor empírico de corrección de densidad por humedad.
 * Cada 1 % de HR por encima de la referencia incrementa la densidad ~0.4 %.
 * Rango de ajuste limitado a ±15 % para evitar valores absurdos.
 */
const HUM_CORRECTION = 0.004;

/**
 * Devuelve la densidad base en t/m³ para un tipo de grano dado.
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
 * Devuelve la densidad ajustada (t/m³) teniendo en cuenta la humedad relativa medida.
 * @param {string}      grainType - tipo de grano
 * @param {number|null} humidity  - humedad relativa del sensor (%)
 */
export function getDensityAdjusted(grainType, humidity) {
  const base   = getDensity(grainType);
  if (humidity == null || !Number.isFinite(humidity)) return base;

  const humRef = GRAIN_HUM_REF[grainType] ?? DEFAULT_HUM_REF;
  const delta  = humidity - humRef; // positivo → más húmedo de lo normal

  // Ajuste lineal clampado: ±15 % máximo
  const factor = Math.max(0.85, Math.min(1.15, 1 + delta * HUM_CORRECTION));
  return parseFloat((base * factor).toFixed(4));
}
