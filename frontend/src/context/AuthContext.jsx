import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { signInWithGoogle, firebaseSignOut } from '../services/firebase';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

// Firebase token → our backend → get our JWT + user
async function exchangeFirebaseToken(idToken) {
  const res = await fetch(`${API_BASE}/api/auth/firebase`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Firebase auth failed');
  return data; // { token, user }
}

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

  // ─── Email / password ───────────────────────────────────────────────────────
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

  // ─── Google Sign-In (Firebase) ──────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    const { idToken } = await signInWithGoogle();         // Google popup
    const { token, user } = await exchangeFirebaseToken(idToken); // → our backend
    localStorage.setItem('fp_token', token);
    setUser(user);
    return user;
  }, []);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    localStorage.removeItem('fp_token');
    setUser(null);
    try { await firebaseSignOut(); } catch {} // also sign out of Firebase
  }, []);

  const updatePoints = useCallback((newTotal) => {
    setUser((u) => u ? { ...u, total_points: newTotal } : u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updatePoints }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
