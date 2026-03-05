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
      if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
        window.location.reload();
      }
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

/**
 * URL de la última imagen de cámara del silo (desde ESP32-CAM).
 * Añade query _t para evitar caché del navegador.
 */
export const getSiloCameraUrl = (siloId) => {
  const t = Date.now();
  return `${API_ORIGIN}/api/camera/${encodeURIComponent(siloId)}?_t=${t}`;
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

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerUser = async (email, password, name) => {
  const response = await api.post('/auth/register', { email, password, name });
  return response.data;
};

export default api;

