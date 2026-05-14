import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session from localStorage token
  useEffect(() => {
    const token = localStorage.getItem('fp_token');
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('fp_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await authAPI.login({ email, password });
    localStorage.setItem('fp_token', token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { token, user } = await authAPI.register({ username, email, password });
    localStorage.setItem('fp_token', token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fp_token');
    setUser(null);
  }, []);

  const updatePoints = useCallback((newTotal) => {
    setUser((u) => u ? { ...u, total_points: newTotal } : u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updatePoints }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
