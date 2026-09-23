import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { flushOfflineQueue, hasQueuedAction, OFFLINE_ACTIONS_QUEUE_KEY, queueOfflineAction } from './offline-queue';
import { DEFAULT_WEIGHT_UNIT, isWeightUnit, type WeightUnit } from './weight-units';
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
  cedula?: string;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string;
  correo: string;
  password: string;
  telefono?: string;
};

type TaurosSessionContextValue = {
  token: string | null;
  user: TaurosAuthUser | null;
  loadingSession: boolean;
  authReady: boolean;
  login: (payload: TaurosLoginPayload) => Promise<void>;
  register: (payload: TaurosRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Saves the body weight; `queued` is true when it was stored offline for later sync. */
  setPersistentWeight: (value: number) => Promise<{ queued: boolean }>;
  /** Pulls the latest body weight from the server (keeps the local value on failure). */
  syncWeightFromServer: () => Promise<void>;
  /** Body weight in kg (canonical unit). */
  persistentWeight: number;
  /** Display/input unit chosen by the user. Stored values stay in kg. */
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  /** Last load used per exercise, in kg (local only, never sent). */
  getExerciseWeight: (exerciseId: string) => Promise<number>;
  setExerciseWeight: (exerciseId: string, valueKg: number) => Promise<void>;
  updateUser: (nextUser: Partial<TaurosAuthUser>) => Promise<void>;
  updateProfile: (payload: Partial<Pick<TaurosAuthUser, 'nombre' | 'apellido' | 'correo'>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const TOKEN_KEY = 'tauros_mobile_token';
const USER_KEY = 'tauros_mobile_user';
const WEIGHT_KEY_PREFIX = 'tauros_mobile_weight';
const EXERCISE_WEIGHTS_KEY_PREFIX = 'tauros_mobile_exercise_weights';
const WEIGHT_UNIT_KEY_PREFIX = 'tauros_mobile_weight_unit';
// Personal offline caches (mirrors the raw keys used in app/(tabs)/planes.tsx
// and hooks/useOfflineRoutine.ts) — cleared on account deletion, unlike the
// generic exercise catalog and media cache which hold no personal data.
const OFFLINE_PLANS_KEY = 'offline_plans_list';
const OFFLINE_ROUTINE_KEY = 'offline_routines';
const WEIGHT_ACTION_KIND = 'set-body-weight';

type LatestWeightResponse = {
  peso: number | string | null;
  fechaRegistro: string | null;
};

const TaurosSessionContext = createContext<TaurosSessionContextValue | null>(null);

export function TaurosSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TaurosAuthUser | null>(null);
  const [persistentWeight, setPersistentWeightState] = useState(0);
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>(DEFAULT_WEIGHT_UNIT);
  const [loadingSession, setLoadingSession] = useState(true);
  // Use a ref to hold logout so the registered callback is always current
  const logoutRef = useRef<(() => Promise<void>) | null>(null);
  // Guards async weight syncs against a logout/account switch mid-request.
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserIdRef.current = user?.userId ?? null;
  }, [user?.userId]);

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
          const [userWeight, userUnit] = await Promise.all([
            AsyncStorage.getItem(getWeightKey(parsedUser.userId)),
            AsyncStorage.getItem(getWeightUnitKey(parsedUser.userId)),
          ]);
          setPersistentWeightState(parseStoredWeight(userWeight));
          setWeightUnitState(isWeightUnit(userUnit) ? userUnit : DEFAULT_WEIGHT_UNIT);
        } else {
          setPersistentWeightState(parseStoredWeight(storedWeight));
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

  // Replay anything queued while offline (see lib/offline-queue.ts) as soon
  // as there is a session, and again every time the app comes back to the
  // foreground — that's the moment connectivity most likely returned.
  // This effect runs after a session restore and after login/register, so it
  // is also where the latest weight is pulled from the server: only after the
  // flush, so a weight saved offline reaches the server before it is read back.
  const sessionUserId = user?.userId;
  useEffect(() => {
    if (!token) {
      return;
    }

    void flushOfflineQueue(token, sessionUserId).then(() =>
      sessionUserId ? syncWeightFor(token, sessionUserId) : undefined,
    );

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          void flushOfflineQueue(token, sessionUserId);
        }
      },
    );

    return () => subscription.remove();
    // syncWeightFor only uses setters/refs; token and userId are the triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sessionUserId]);

  const applyWeight = async (userId: string, value: number) => {
    setPersistentWeightState(value);
    await AsyncStorage.setItem(getWeightKey(userId), String(value));
  };

  const syncWeightFor = async (authToken: string, userId: string) => {
    try {
      const latest = await taurosRequest<LatestWeightResponse>('/composicion-corporal/me/latest', {
        token: authToken,
      });
      const peso = latest?.peso === null || latest?.peso === undefined ? NaN : Number(latest.peso);
      if (!Number.isFinite(peso) || peso <= 0) {
        return;
      }

      // A weight saved offline that has not been replayed yet is newer than
      // anything the server can return: keep the pending local value.
      if (await hasQueuedAction(WEIGHT_ACTION_KIND, userId)) {
        return;
      }

      if (currentUserIdRef.current !== userId) {
        return;
      }

      await applyWeight(userId, peso);
    } catch {
      // Offline or server unavailable: the locally stored weight stays as is.
    }
  };

  const syncWeightFromServer = async () => {
    if (!token || !user) {
      return;
    }

    await syncWeightFor(token, user.userId);
  };

  const persistAuth = async (nextToken: string, nextUser: TaurosAuthUser, refreshToken?: string) => {
    // Local value first (instant, works offline). It is read before the token
    // is set so it can never land after the server sync that the session
    // effect above starts as soon as the token changes.
    const [storedWeight, storedUnit] = await Promise.all([
      AsyncStorage.getItem(getWeightKey(nextUser.userId)),
      AsyncStorage.getItem(getWeightUnitKey(nextUser.userId)),
    ]);
    setPersistentWeightState(parseStoredWeight(storedWeight));
    setWeightUnitState(isWeightUnit(storedUnit) ? storedUnit : DEFAULT_WEIGHT_UNIT);
    setToken(nextToken);
    setUser(nextUser);
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
      deletedUserId ? AsyncStorage.removeItem(getWeightUnitKey(deletedUserId)) : Promise.resolve(),
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
    // cedula/fechaNacimiento/telefono son opcionales (guideline 5.1.1(v) de
    // Apple). El formulario los inicializa como "", asi que se normalizan a
    // undefined aca para que el backend los reciba como realmente ausentes.
    const normalizedPayload: TaurosRegisterPayload = {
      ...payload,
      cedula: payload.cedula?.trim() || undefined,
      fechaNacimiento: payload.fechaNacimiento?.trim() || undefined,
      telefono: payload.telefono?.trim() || undefined,
    };

    const response = await taurosRequest<{ access_token: string; refresh_token: string; user: TaurosAuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(normalizedPayload),
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
    setWeightUnitState(DEFAULT_WEIGHT_UNIT);
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

    const path = '/composicion-corporal';
    const body = JSON.stringify({
      peso: value,
      usuarioId: user.userId,
    });

    let queued = false;
    try {
      await taurosRequest(path, { method: 'POST', token, body });
    } catch (error) {
      if (!(error instanceof TypeError)) {
        // The server answered with a real error: surface it.
        throw error;
      }

      // Network unreachable: keep it locally and replay it later.
      await queueOfflineAction({
        id: `${WEIGHT_ACTION_KIND}-${Date.now()}`,
        kind: WEIGHT_ACTION_KIND,
        userId: user.userId,
        path,
        method: 'POST',
        body,
      });
      queued = true;
    }

    await applyWeight(user.userId, value);
    return { queued };
  };

  const setWeightUnit = async (unit: WeightUnit) => {
    setWeightUnitState(unit);
    if (user) {
      await AsyncStorage.setItem(getWeightUnitKey(user.userId), unit);
    }
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
    syncWeightFromServer,
    persistentWeight,
    weightUnit,
    setWeightUnit,
    updateUser,
    updateProfile,
    changePassword,
    deleteAccount,
    getExerciseWeight,
    setExerciseWeight,
  }), [loadingSession, persistentWeight, token, user, weightUnit]);

  return <TaurosSessionContext.Provider value={value}>{children}</TaurosSessionContext.Provider>;
}

function parseStoredWeight(raw: string | null) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getWeightKey(userId: string) {
  return `${WEIGHT_KEY_PREFIX}:${userId}`;
}

function getWeightUnitKey(userId: string) {
  return `${WEIGHT_UNIT_KEY_PREFIX}:${userId}`;
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
