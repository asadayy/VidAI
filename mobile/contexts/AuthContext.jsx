import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/auth.js';
import Toast from 'react-native-toast-message';

const AuthContext = createContext(null);

const TOKEN_KEYS = {
  access: 'vidai_access_token',
  refresh: 'vidai_refresh_token',
  user: 'vidai_user',
};

const getStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEYS.access);
  } catch {
    return null;
  }
};

const clearStorage = async () => {
  try {
    await AsyncStorage.multiRemove([
      TOKEN_KEYS.access,
      TOKEN_KEYS.refresh,
      TOKEN_KEYS.user,
    ]);
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

const persistAuth = async (accessToken, refreshToken, user) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEYS.access, accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
    }
    await AsyncStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
  } catch (error) {
    console.error('Error persisting auth:', error);
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — verify stored token is still valid
  useEffect(() => {
    const verify = async () => {
      try {
        const stored = await getStoredToken();
        if (!stored) {
          setLoading(false);
          return;
        }

        const { data } = await authAPI.getMe();
        const verifiedUser = data.data.user || data.data;
        setUser(verifiedUser);
        setToken(stored);
        await AsyncStorage.setItem(TOKEN_KEYS.user, JSON.stringify(verifiedUser));
      } catch {
        // Token invalid — clear everything
        await clearStorage();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authAPI.login({ email, password });
      const { accessToken, refreshToken, user: loggedInUser } = data.data;
      await persistAuth(accessToken, refreshToken, loggedInUser);
      setToken(accessToken);
      setUser(loggedInUser);
      Toast.show({
        type: 'success',
        text1: `Welcome back, ${loggedInUser.name || loggedInUser.email}!`,
      });
      return loggedInUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const { data } = await authAPI.register(userData);
      const { accessToken, refreshToken, user: newUser } = data.data;
      await persistAuth(accessToken, refreshToken, newUser);
      setToken(accessToken);
      setUser(newUser);
      Toast.show({
        type: 'success',
        text1: 'Account created successfully!',
      });
      return newUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const completeOnboarding = useCallback(async (onboardingData) => {
    try {
      const { data } = await authAPI.completeOnboarding(onboardingData);
      const updatedUser = data.data.user;
      await AsyncStorage.setItem(TOKEN_KEYS.user, JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (updatedUser) => {
    setUser(updatedUser);
    await AsyncStorage.setItem(TOKEN_KEYS.user, JSON.stringify(updatedUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Logout API may fail if token expired — that's fine
    } finally {
      await clearStorage();
      setUser(null);
      setToken(null);
      Toast.show({
        type: 'success',
        text1: 'Logged out',
      });
    }
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
      updateUser,
      hasRole,
      completeOnboarding,
    }),
    [user, token, loading, isAuthenticated, login, register, logout, updateUser, hasRole, completeOnboarding]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
