import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { getAccessToken, getRefreshToken, saveAccessToken, saveRefreshToken, deleteTokens } from './authStorage';

const API_BASE = process.env.EXPO_PUBLIC_TAUROS_API_URL || process.env.API_BASE_URL || 'http://10.0.2.2:3000';

const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

let isRefreshing = false;
let refreshCall: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (isRefreshing && refreshCall) return refreshCall;
  isRefreshing = true;
  refreshCall = (async () => {
    try {
      const refresh = await getRefreshToken();
      if (!refresh) return false;
      const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: refresh });
      if (res?.data?.access_token) {
        await saveAccessToken(res.data.access_token);
      }
      if (res?.data?.refresh_token) {
        await saveRefreshToken(res.data.refresh_token);
      }
      return true;
    } catch (e) {
      await deleteTokens();
      return false;
    } finally {
      isRefreshing = false;
      refreshCall = null;
    }
  })();
  return refreshCall;
}

// Attach access token
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: try refresh once on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const ok = await refreshToken();
      if (ok) {
        const newToken = await getAccessToken();
        if (newToken) {
          original.headers['Authorization'] = `Bearer ${newToken}`;
          return api(original);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export function isTokenValid(token: string | null) {
  if (!token) return false;
  try {
    const decoded: any = jwtDecode(token);
    const now = Date.now() / 1000;
    return decoded.exp > now;
  } catch (e) {
    return false;
  }
}
