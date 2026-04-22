import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login as apiLogin, getMe } from '../api/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // { userId, username, name, role, email, ... }
  const [token, setToken]     = useState(() => localStorage.getItem('bl_token'));
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, fetch /auth/me to validate & hydrate user
  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('bl_token');
      if (!stored) { setLoading(false); return; }
      try {
        const decoded = jwtDecode(stored);
        // Check expiry
        if (decoded.exp * 1000 < Date.now()) {
          clearAuth();
          setLoading(false);
          return;
        }
        // Fetch fresh user info
        const res = await getMe();
        const userData = res.data?.data || res.data;
        setUser(userData);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const clearAuth = () => {
    localStorage.removeItem('bl_token');
    localStorage.removeItem('bl_user');
    setToken(null);
    setUser(null);
  };

  const login = useCallback(async (username, password) => {
    const res = await apiLogin(username, password);
    const payload = res.data?.data || res.data;
    const jwt = payload?.token || payload?.accessToken || payload;
    if (!jwt) throw new Error('No token received');

    localStorage.setItem('bl_token', jwt);
    setToken(jwt);

    // Fetch user profile, fall back to token claims if /auth/me fails
    try {
      const meRes = await getMe();
      const userData = meRes.data?.data || meRes.data;
      setUser(userData);
      localStorage.setItem('bl_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      const decoded = jwtDecode(jwt);
      const fallbackUser = {
        userId: decoded.userId || decoded.sub || decoded.id,
        username: decoded.username || decoded.sub,
        name: decoded.name || decoded.fullName,
        role: decoded.role || decoded.authorities?.[0],
        email: decoded.email,
      };
      setUser(fallbackUser);
      localStorage.setItem('bl_user', JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    toast.success('Logged out successfully');
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};


