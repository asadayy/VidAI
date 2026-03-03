import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let navigation = null;

export const setNavigation = (nav) => {
  navigation = nav;
};

// On web (browser), bypass ngrok entirely — hit the backend directly on localhost.
// ngrok's free tier blocks CORS preflight from browser origins; native apps are unaffected.
const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:5000/api/v1'
    : (Constants.expoConfig?.extra?.apiUrl ||
       process.env.EXPO_PUBLIC_API_URL ||
       'http://localhost:5000/api/v1');

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 300000,
});

client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('vidai_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('vidai_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        await AsyncStorage.setItem('vidai_access_token', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return client(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.multiRemove([
          'vidai_access_token',
          'vidai_refresh_token',
          'vidai_user',
        ]);
        if (navigation?.replace) {
          navigation.replace('/login');
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
