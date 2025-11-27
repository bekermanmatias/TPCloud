import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

export default api;

