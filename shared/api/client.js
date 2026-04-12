import axios from 'axios';

// Detect environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isWeb = typeof window !== 'undefined' && !isReactNative;

// Storage adapter for cross-platform compatibility
let storage = null;
let navigation = null;

if (isReactNative) {
  // React Native - will be set by mobile app
  // Use dynamic require to avoid errors in web builds
  storage = {
    getItem: async (key) => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.warn('AsyncStorage not available:', e);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.warn('AsyncStorage not available:', e);
      }
    },
    removeItem: async (key) => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.removeItem(key);
      } catch (e) {
        console.warn('AsyncStorage not available:', e);
      }
    },
  };
} else {
  // Web - use localStorage synchronously (it's synchronous in browsers)
  storage = {
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage setItem failed:', e);
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage removeItem failed:', e);
      }
    },
  };
}

// Function to set navigation for React Native (called from mobile app)
export const setNavigation = (nav) => {
  navigation = nav;
};

// Get API base URL
const getApiBaseUrl = () => {
  if (isReactNative) {
    // React Native - use Constants from expo-constants
    try {
      const Constants = require('expo-constants').default;
      return Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000/api/v1';
    } catch {
      return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    }
  } else {
    // Web - use Vite env, fallback to localhost
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    return 'http://localhost:5000/api/v1';
  }
};

const API_BASE_URL = getApiBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
  timeout: 300000, // 5 minutes to allow for AI generation
});

// Request interceptor — attach JWT token
client.interceptors.request.use(
  async (config) => {
    // Use admin token for admin routes, user token for everything else
    const isAdminRoute = config.url && config.url.startsWith('/admin');
    const tokenKey = isAdminRoute ? 'vidai_admin_token' : 'vidai_access_token';
    const token = isReactNative ? await storage.getItem(tokenKey) : storage.getItem(tokenKey);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 + token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, attempt token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = isReactNative 
          ? await storage.getItem('vidai_refresh_token')
          : storage.getItem('vidai_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        if (isReactNative) {
          await storage.setItem('vidai_access_token', newAccessToken);
        } else {
          storage.setItem('vidai_access_token', newAccessToken);
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear tokens and redirect to login
        if (isReactNative) {
          await storage.removeItem('vidai_access_token');
          await storage.removeItem('vidai_refresh_token');
          await storage.removeItem('vidai_user');
        } else {
          storage.removeItem('vidai_access_token');
          storage.removeItem('vidai_refresh_token');
          storage.removeItem('vidai_user');
        }
        
        // Handle navigation based on platform
        if (isWeb) {
          window.location.href = '/';
        } else if (navigation) {
          navigation.replace('/login');
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
