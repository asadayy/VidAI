import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

const TOKEN_KEYS = {
  access: 'vidai_access_token',
  refresh: 'vidai_refresh_token',
  user: 'vidai_user',
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getStoredToken = () => localStorage.getItem(TOKEN_KEYS.access) || null;

const clearStorage = () => {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.user);
};

const persistAuth = (accessToken, refreshToken, user) => {
  localStorage.setItem(TOKEN_KEYS.access, accessToken);
  if (refreshToken) localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
  localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  // On mount — verify stored token is still valid
  useEffect(() => {
    const verify = async () => {
      const stored = getStoredToken();
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await authAPI.getMe();
        const verifiedUser = data.data.user || data.data;
        setUser(verifiedUser);
        localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(verifiedUser));
      } catch {
        // Token invalid — clear everything
        clearStorage();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { accessToken, refreshToken, user: loggedInUser } = data.data;
    persistAuth(accessToken, refreshToken, loggedInUser);
    setToken(accessToken);
    setUser(loggedInUser);
    toast.success(`Welcome back, ${loggedInUser.name || loggedInUser.email}!`);
    return loggedInUser;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    const { accessToken, refreshToken, user: newUser } = data.data;
    persistAuth(accessToken, refreshToken, newUser);
    setToken(accessToken);
    setUser(newUser);
    toast.success('Account created successfully!');
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Logout API may fail if token expired — that's fine
    } finally {
      clearStorage();
      setUser(null);
      setToken(null);
      toast.success('Logged out');
    }
  }, []);

  const updateUser = useCallback((newUser) => {
    localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const isAuthenticated = Boolean(user && token);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      if (Array.isArray(role)) return role.includes(user.role);
      return user.role === role;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      hasRole,
      updateUser,
    }),
    [user, token, loading, isAuthenticated, login, register, logout, hasRole, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook are valid exports
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
