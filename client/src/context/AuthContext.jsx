import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('vp_access_token'));
  const [loading, setLoading] = useState(true);

  // Set token both in state and localStorage
  const persistToken = useCallback((token) => {
    setAccessToken(token);
    if (token) {
      localStorage.setItem('vp_access_token', token);
    } else {
      localStorage.removeItem('vp_access_token');
    }
  }, []);

  // Fetch current user on mount (if token exists)
  useEffect(() => {
    const init = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        // Token may be expired — try to refresh
        try {
          const refreshRes = await api.post('/auth/refresh');
          persistToken(refreshRes.data.accessToken);
          setUser(refreshRes.data.user);
        } catch {
          persistToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // eslint-disable-line

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    persistToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    persistToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    persistToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout, isAdmin, isClient }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
