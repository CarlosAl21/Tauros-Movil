import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { taurosRequest, registerSessionExpiredCallback, unregisterSessionExpiredCallback, REFRESH_TOKEN_SECURE_KEY } from './tauros-api';

export type TaurosAuthUser = {
  userId: string;
  correo: string;
  nombre: string;
  apellido: string;
  rol: 'admin' | 'coach' | 'user';
};

export type TaurosLoginPayload = {
  correo: string;
  password: string;
};

export type TaurosRegisterPayload = {
  cedula: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  correo: string;
  password: string;
  telefono: string;
};

type TaurosSessionContextValue = {
  token: string | null;
  user: TaurosAuthUser | null;
  loadingSession: boolean;
  authReady: boolean;
  login: (payload: TaurosLoginPayload) => Promise<void>;
  register: (payload: TaurosRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setPersistentWeight: (value: number) => Promise<void>;
  persistentWeight: number;
  getExerciseWeight: (exerciseId: string) => Promise<number>;
  setExerciseWeight: (exerciseId: string, value: number) => Promise<void>;
  updateUser: (nextUser: Partial<TaurosAuthUser>) => Promise<void>;
  updateProfile: (payload: Partial<Pick<TaurosAuthUser, 'nombre' | 'apellido' | 'correo'>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const TOKEN_KEY = 'tauros_mobile_token';
const USER_KEY = 'tauros_mobile_user';
const WEIGHT_KEY_PREFIX = 'tauros_mobile_weight';
const EXERCISE_WEIGHTS_KEY_PREFIX = 'tauros_mobile_exercise_weights';
// Personal offline caches (mirrors the raw keys used in app/(tabs)/planes.tsx
// and hooks/useOfflineRoutine.ts) — cleared on account deletion, unlike the
// generic exercise catalog and media cache which hold no personal data.
const OFFLINE_PLANS_KEY = 'offline_plans_list';
const OFFLINE_ROUTINE_KEY = 'offline_routines';
const OFFLINE_ACTIONS_QUEUE_KEY = 'offline_actions_queue';

const TaurosSessionContext = createContext<TaurosSessionContextValue | null>(null);

export function TaurosSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TaurosAuthUser | null>(null);
  const [persistentWeight, setPersistentWeightState] = useState(0);
  const [loadingSession, setLoadingSession] = useState(true);
  // Use a ref to hold logout so the registered callback is always current
  const logoutRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const [storedToken, storedUser, storedWeight] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(`${WEIGHT_KEY_PREFIX}:legacy`),
        ]);

        const parsedUser = storedUser ? (JSON.parse(storedUser) as TaurosAuthUser) : null;

        if (storedToken) {
          setToken(storedToken);
        }

        if (parsedUser) {
          setUser(parsedUser);
          const userWeight = await AsyncStorage.getItem(getWeightKey(parsedUser.userId));
          const parsedWeight = Number(userWeight);
          setPersistentWeightState(Number.isFinite(parsedWeight) ? parsedWeight : 0);
        } else if (storedWeight) {
          const parsedWeight = Number(storedWeight);
          setPersistentWeightState(Number.isFinite(parsedWeight) ? 0 : 0);
        } else {
          setPersistentWeightState(0);
        }
      } finally {
        setLoadingSession(false);
      }
    };

    loadSession();
  }, []);

  // Register a callback in tauros-api so that a failed token refresh triggers
  // an immediate in-memory logout without requiring callers to handle it.
  useEffect(() => {
    registerSessionExpiredCallback(() => {
      logoutRef.current?.().catch(() => {});
    });
    return () => unregisterSessionExpiredCallback();
  }, []);

  const persistAuth = async (nextToken: string, nextUser: TaurosAuthUser, refreshToken?: string) => {
    setToken(nextToken);
    setUser(nextUser);
    const storedWeight = await AsyncStorage.getItem(getWeightKey(nextUser.userId));
    const parsedWeight = Number(storedWeight);
    setPersistentWeightState(Number.isFinite(parsedWeight) ? parsedWeight : 0);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, nextToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
      refreshToken
        ? SecureStore.setItemAsync(REFRESH_TOKEN_SECURE_KEY, refreshToken)
        : Promise.resolve(),
    ]);
  };

  const updateUser = async (nextUser: Partial<TaurosAuthUser>) => {
    setUser((current) => {
      const merged = { ...(current ?? {}), ...nextUser } as TaurosAuthUser;
      AsyncStorage.setItem(USER_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  };

  const updateProfile = async (payload: Partial<Pick<TaurosAuthUser, 'nombre' | 'apellido' | 'correo'>>) => {
    if (!token) {
      throw new Error('Debes iniciar sesion');
    }

    const updated = await taurosRequest<TaurosAuthUser>('/auth/profile', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });

    await updateUser(updated);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) {
      throw new Error('Debes iniciar sesion');
    }

    await taurosRequest('/auth/change-password', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    await logout();
  };

  const deleteAccount = async () => {
    if (!token) {
      throw new Error('Debes iniciar sesion');
    }

    await taurosRequest('/auth/account', {
      method: 'DELETE',
      token,
    });

    const deletedUserId = user?.userId;

    // The backend already anonymized the user's data and revoked their
    // tokens. On the mobile side, treat this like a logout, plus wipe the
    // locally cached data that is personal to this account (assigned
    // routines, pending offline actions, weight history). The shared
    // exercise catalog and downloaded demo videos are generic reference
    // content, not personal data, so they're left alone.
    await logout();

    await Promise.all([
      AsyncStorage.removeItem(OFFLINE_PLANS_KEY),
      AsyncStorage.removeItem(OFFLINE_ROUTINE_KEY),
      AsyncStorage.removeItem(OFFLINE_ACTIONS_QUEUE_KEY),
      deletedUserId ? AsyncStorage.removeItem(getWeightKey(deletedUserId)) : Promise.resolve(),
      deletedUserId ? AsyncStorage.removeItem(getExerciseWeightsKey(deletedUserId)) : Promise.resolve(),
    ]);
  };

  const login = async (payload: TaurosLoginPayload) => {
    const response = await taurosRequest<{ access_token: string; refresh_token: string; user: TaurosAuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await persistAuth(response.access_token, response.user, response.refresh_token);
  };

  const register = async (payload: TaurosRegisterPayload) => {
    const response = await taurosRequest<{ access_token: string; refresh_token: string; user: TaurosAuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await persistAuth(response.access_token, response.user, response.refresh_token);
  };

  const logout = async () => {
    // Revoke the refresh token on the server (best-effort)
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_SECURE_KEY);
      if (refreshToken) {
        await taurosRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } catch {}

    setToken(null);
    setUser(null);
    setPersistentWeightState(0);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_SECURE_KEY).catch(() => {}),
    ]);
  };

  // Keep the ref current so the session-expired callback always calls the
  // latest closure (avoids stale-capture issues with useCallback deps).
  logoutRef.current = logout;

  const setPersistentWeight = async (value: number) => {
    if (!token || !user) {
      throw new Error('Debes iniciar sesion');
    }

    await taurosRequest('/composicion-corporal', {
      method: 'POST',
      token,
      body: JSON.stringify({
        peso: value,
        usuarioId: user.userId,
      }),
    });

    setPersistentWeightState(value);
    await AsyncStorage.setItem(getWeightKey(user.userId), String(value));
  };

  const readExerciseWeights = async () => {
    const raw = await AsyncStorage.getItem(getExerciseWeightsKey(user?.userId));
    if (!raw) {
      return {} as Record<string, Record<string, number>>;
    }

    try {
      return JSON.parse(raw) as Record<string, Record<string, number>>;
    } catch (_error) {
      return {} as Record<string, Record<string, number>>;
    }
  };

  const writeExerciseWeights = async (weights: Record<string, Record<string, number>>) => {
    if (!user) {
      return;
    }

    await AsyncStorage.setItem(getExerciseWeightsKey(user.userId), JSON.stringify(weights));
  };

  const getExerciseWeight = async (exerciseId: string) => {
    if (!token || !user || !exerciseId) {
      return 0;
    }

    const weights = await readExerciseWeights();
    return Number(weights[user.userId]?.[exerciseId] ?? 0) || 0;
  };

  const setExerciseWeight = async (exerciseId: string, value: number) => {
    if (!token || !user || !exerciseId) {
      throw new Error('Debes iniciar sesion');
    }

    const weights = await readExerciseWeights();
    const nextByUser = weights[user.userId] || {};
    nextByUser[exerciseId] = value;
    weights[user.userId] = nextByUser;
    await writeExerciseWeights(weights);
  };

  const value = useMemo<TaurosSessionContextValue>(() => ({
    token,
    user,
    loadingSession,
    authReady: !loadingSession,
    login,
    register,
    logout,
    setPersistentWeight,
    persistentWeight,
    updateUser,
    updateProfile,
    changePassword,
    deleteAccount,
    getExerciseWeight,
    setExerciseWeight,
  }), [loadingSession, persistentWeight, token, user]);

  return <TaurosSessionContext.Provider value={value}>{children}</TaurosSessionContext.Provider>;
}

function getWeightKey(userId: string) {
  return `${WEIGHT_KEY_PREFIX}:${userId}`;
}

function getExerciseWeightsKey(userId?: string | null) {
  return `${EXERCISE_WEIGHTS_KEY_PREFIX}:${userId || 'anonymous'}`;
}

export function useTaurosSession() {
  const context = useContext(TaurosSessionContext);

  if (!context) {
    throw new Error('useTaurosSession must be used within TaurosSessionProvider');
  }

  return context;
}
