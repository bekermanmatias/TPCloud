import { createContext, useContext, useState, useEffect } from 'react';
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

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

  const value = { user, token, login, register, logout, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
