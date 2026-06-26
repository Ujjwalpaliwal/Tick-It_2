import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // 1. Prioritize environment variable (e.g. for expo tunnels or production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Web fallback
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // 3. Expo hostUri fallback (dynamically resolves local machine IP)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }

  // 4. Default emulator/device fallback
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:5000/api`;
};

export const API_BASE_URL = getBaseUrl();

let activeToken: string | null = null;

export const setApiToken = (token: string | null) => {
  activeToken = token;
  if (token) {
    AsyncStorage.setItem('tickit_jwt_token', token).catch(console.error);
  } else {
    AsyncStorage.removeItem('tickit_jwt_token').catch(console.error);
  }
};

const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('tickit_jwt_token');
  } catch (e) {
    console.error('Error fetching token from AsyncStorage', e);
  }
  return null;
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export const fetchApi = async (endpoint: string, options: FetchOptions = {}) => {
  const token = activeToken || (await getStoredToken());
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let url = `${API_BASE_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers
  };

  try {
    console.log(`[API Request] ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! Status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`[API Error] Request to ${url} failed:`, error);
    throw error;
  }
};
