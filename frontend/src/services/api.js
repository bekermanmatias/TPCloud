import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// URL base del backend (sin /api) para imágenes que devuelven blob
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || (typeof window !== 'undefined' ? new URL(API_BASE_URL).origin : 'http://localhost:3000');

const TOKEN_KEY = 'salgest_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Asegurar que cada petición lleve el token (evita 401 por efecto no ejecutado aún)
api.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('salgest_user');
      delete api.defaults.headers.common.Authorization;
      // Notifica al AuthContext para que actualice el estado de React
      // sin hacer window.location.reload() (que borraba el token antes de recargar)
      window.dispatchEvent(new Event('auth:session-expired'));
    }
    return Promise.reject(err);
  }
);

export const getSilos = async () => {
  const response = await api.get('/silos');
  return response.data;
};

export const getSiloById = async (id) => {
  const response = await api.get(`/silos/${id}`);
  return response.data;
};

export const getSiloHistory = async (id, options = {}) => {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit);
  if (options.hours) params.append('hours', options.hours);
  
  const response = await api.get(`/silos/${id}/history?${params.toString()}`);
  return response.data;
};

/** Carga TODO el historial disponible (hasta 10 000 registros, 1 año).
 *  Solo llamar cuando el usuario lo solicita explícitamente. */
export const getSiloFullHistory = async (id) => {
  const response = await api.get(`/silos/${id}/history?all=true`);
  return response.data;
};

/**
 * URL de la última imagen de cámara del silo (desde ESP32-CAM).
 * Añade query _t para evitar caché del navegador.
 */
export const getSiloCameraUrl = (siloId) => {
  const t = Date.now();
  return `${API_ORIGIN}/api/camera/${encodeURIComponent(siloId)}?_t=${t}`;
};

/**
 * URL de una imagen histórica guardada en el servidor (imagePath de sensor_data).
 * Si no hay imagePath devuelve null.
 * @param {string|null} imagePath  Ej: "/uploads/silo-photos/SILO-A1B2_1234567890.jpg"
 */
export const getSiloHistoryImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // Si la ruta ya es una URL absoluta (S3), devolverla tal cual
  if (typeof imagePath === 'string' && /^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }
  return `${API_ORIGIN}${imagePath}`;
};

export const createSilo = async (data) => {
  const response = await api.post('/silos', data);
  return response.data;
};

export const updateSilo = async (id, data) => {
  const response = await api.put(`/silos/${id}`, data);
  return response.data;
};

export const deleteSilo = async (id) => {
  await api.delete(`/silos/${id}`);
};

/** Vincula un dispositivo al silo mediante su código de kit */
export const vincularSilo = async (siloId, kitCode) => {
  const response = await api.put(`/silos/${siloId}/vincular`, { kit_code: kitCode || null });
  return response.data;
};

// ── Alertas ───────────────────────────────────────────────────────────────────

/** Devuelve todas las alertas activas del usuario (incluye check de dispositivos offline) */
export const getActiveAlerts = async () => {
  const response = await api.get('/alerts');
  return response.data;
};

/** Devuelve alertas activas de un silo específico */
export const getAlertsBySilo = async (siloId) => {
  const response = await api.get(`/alerts/${siloId}`);
  return response.data;
};

/** Marca una alerta como reconocida */
export const acknowledgeAlert = async (alertId) => {
  const response = await api.patch(`/alerts/${alertId}/acknowledge`);
  return response.data;
};

/** Devuelve el historial de alertas (activas + resueltas) de un silo */
export const getAlertHistory = async (siloId, { days = 30, limit = 100 } = {}) => {
  const response = await api.get(`/alerts/${siloId}/history`, { params: { days, limit } });
  return response.data;
};

/** Devuelve los umbrales configurados para un silo */
export const getSiloAlertConfig = async (siloId) => {
  const response = await api.get(`/alerts/${siloId}/config`);
  return response.data;
};

/** Actualiza un umbral específico para un silo */
export const updateSiloAlertThreshold = async (siloId, key, value) => {
  const response = await api.put(`/alerts/${siloId}/config/${key}`, { value });
  return response.data;
};

/** Devuelve el perfil del usuario autenticado */
export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

/**
 * Actualiza el perfil del usuario.
 * @param {{ name?, email?, password?, currentPassword? }} data
 */
export const updateProfile = async (data) => {
  const response = await api.put('/auth/profile', data);
  return response.data; // { user: { id, email, name } }
};

// ── Galería ───────────────────────────────────────────────────────────────────

/** Devuelve todas las capturas guardadas del usuario */
export const getGallery = async () => {
  const response = await api.get('/gallery');
  return response.data;
};

/**
 * Guarda una captura en la galería.
 * @param {{ silo_id, silo_name, image_path, captured_at, temperature, humidity, co2,
 *           grain_level_percentage, grain_level_tons, presion, source }} data
 */
export const saveCapture = async (data) => {
  const response = await api.post('/gallery', data);
  return response.data;
};

/** Elimina una captura de la galería por su id */
export const deleteCapture = async (id) => {
  await api.delete(`/gallery/${id}`);
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerUser = async (email, password, name) => {
  const response = await api.post('/auth/register', { email, password, name });
  return response.data;
};

export default api;

