import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const TAUROS_API_BASE_URL =
  process.env.EXPO_PUBLIC_TAUROS_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'tauros_mobile_token';
export const REFRESH_TOKEN_SECURE_KEY = 'tauros_mobile_refresh_token';

// ---------------------------------------------------------------------------
// Session-expiry callback
// TaurosSessionProvider registers a callback here so this module can trigger
// an in-memory logout when a refresh fails without creating a circular import.
// ---------------------------------------------------------------------------
type LogoutCallback = () => void;
let _onSessionExpired: LogoutCallback | null = null;

export function registerSessionExpiredCallback(cb: LogoutCallback) {
  _onSessionExpired = cb;
}

export function unregisterSessionExpiredCallback() {
  _onSessionExpired = null;
}

// Token refresh state — module-level singleton so concurrent 401s share one
// in-flight refresh instead of hammering the endpoint.
let _refreshing: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_SECURE_KEY);
      if (!refreshToken) return null;

      const res = await fetch(`${TAUROS_API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_SECURE_KEY);
        return null;
      }

      const data = await res.json();
      const newAccessToken: string | null = data?.access_token ?? null;
      const newRefreshToken: string | null = data?.refresh_token ?? null;

      if (newAccessToken) {
        await AsyncStorage.setItem(TOKEN_KEY, newAccessToken);
      }
      if (newRefreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_SECURE_KEY, newRefreshToken);
      }
      return newAccessToken;
    } catch {
      return null;
    } finally {
      _refreshing = null;
    }
  })();

  return _refreshing;
}

type RequestOptions = RequestInit & {
  token?: string | null;
  /** Internal flag — set to true to skip the 401-retry loop */
  _isRetry?: boolean;
};

async function executeRequest(path: string, options: RequestOptions): Promise<Response> {
  const { token, headers, body, _isRetry: _, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (body && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  return fetch(`${TAUROS_API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body,
  });
}

export async function taurosRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await executeRequest(path, options);

  // On 401, attempt a single token refresh then retry the original request.
  if (response.status === 401 && !options._isRetry) {
    const newToken = await attemptTokenRefresh();

    if (newToken) {
      // Retry with the fresh token
      response = await executeRequest(path, {
        ...options,
        token: newToken,
        _isRetry: true,
      });
    } else {
      // Refresh failed — notify the session layer to clear in-memory state
      _onSessionExpired?.();
      const err = new Error('Session expired') as Error & { status: number };
      err.status = 401;
      throw err;
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? (payload as { message?: string }).message
      : typeof payload === 'string'
        ? payload
        : 'Error de conexion con el backend';

    throw new Error(message || 'Error de conexion con el backend');
  }

  return payload as T;
}
