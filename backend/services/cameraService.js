// Servicio para almacenar y servir la última imagen de cámara por silo
// El ESP32-CAM envía fotos vía POST; guardamos la más reciente en memoria

/** @type {Map<string, { buffer: Buffer, contentType: string, timestamp: string }>} */
const cameraStore = new Map();

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg'];

/**
 * Guarda la última imagen recibida para un silo
 * @param {string} siloId - ID del silo
 * @param {Buffer} buffer - Imagen en binario
 * @param {string} contentType - Ej: image/jpeg
 * @returns {{ success: boolean, timestamp: string }}
 */
export function saveCameraFrame(siloId, buffer, contentType = 'image/jpeg') {
  if (!buffer || buffer.length === 0) {
    throw new Error('Imagen vacía');
  }
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Imagen demasiado grande (máx ${MAX_IMAGE_SIZE / 1024} KB)`);
  }
  const normalizedType = contentType.toLowerCase().trim();
  if (!ALLOWED_TYPES.includes(normalizedType)) {
    throw new Error(`Tipo no permitido. Use: ${ALLOWED_TYPES.join(', ')}`);
  }

  const timestamp = new Date().toISOString();
  cameraStore.set(siloId, {
    buffer,
    contentType: normalizedType,
    timestamp
  });
  console.log(`📷 Imagen guardada para ${siloId} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return { success: true, timestamp };
}

/**
 * Obtiene la última imagen guardada para un silo
 * @param {string} siloId - ID del silo
 * @returns {{ buffer: Buffer, contentType: string, timestamp: string } | null}
 */
export function getLatestFrame(siloId) {
  return cameraStore.get(siloId) || null;
}
