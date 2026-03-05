import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const TOKEN_KEY = 'salgest_token';
const USER_KEY = 'salgest_user';

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Decodifica el payload de un JWT (sin verificar firma) para leer la expiración.
 * Devuelve null si el token está expirado o mal formado.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // sin expiración = válido
  return Date.now() < payload.exp * 1000;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    // Si el token ya expiró, no lo cargamos para evitar requests con 401
    if (!isTokenValid(stored)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return stored;
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      api.defaults.headers.common.Authorization = '';
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }, [token]);

  // Escucha el evento que lanza el interceptor de Axios cuando recibe un 401.
  // De esta forma el logout actualiza el estado de React sin recargar la página.
  const handleSessionExpired = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [handleSessionExpired]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    api.defaults.headers.common.Authorization = '';
  };

  /** Actualiza los datos del usuario en memoria y en localStorage después de editar el perfil */
  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
  };

  const value = { user, token, login, register, logout, updateUser, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
