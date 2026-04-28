import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { taurosRequest } from './tauros-api';

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
};

const TOKEN_KEY = 'tauros_mobile_token';
const USER_KEY = 'tauros_mobile_user';
const WEIGHT_KEY = 'tauros_mobile_weight';

const TaurosSessionContext = createContext<TaurosSessionContextValue | null>(null);

export function TaurosSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TaurosAuthUser | null>(null);
  const [persistentWeight, setPersistentWeightState] = useState(0);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const [storedToken, storedUser, storedWeight] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(WEIGHT_KEY),
        ]);

        if (storedToken) {
          setToken(storedToken);
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser) as TaurosAuthUser);
        }

        if (storedWeight) {
          const parsedWeight = Number(storedWeight);
          if (Number.isFinite(parsedWeight)) {
            setPersistentWeightState(parsedWeight);
          }
        }
      } finally {
        setLoadingSession(false);
      }
    };

    loadSession();
  }, []);

  const persistAuth = async (nextToken: string, nextUser: TaurosAuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, nextToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
    ]);
  };

  const login = async (payload: TaurosLoginPayload) => {
    const response = await taurosRequest<{ access_token: string; user: TaurosAuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await persistAuth(response.access_token, response.user);
  };

  const register = async (payload: TaurosRegisterPayload) => {
    const response = await taurosRequest<{ access_token: string; user: TaurosAuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await persistAuth(response.access_token, response.user);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  };

  const setPersistentWeight = async (value: number) => {
    setPersistentWeightState(value);
    await AsyncStorage.setItem(WEIGHT_KEY, String(value));
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
  }), [loadingSession, persistentWeight, token, user]);

  return <TaurosSessionContext.Provider value={value}>{children}</TaurosSessionContext.Provider>;
}

export function useTaurosSession() {
  const context = useContext(TaurosSessionContext);

  if (!context) {
    throw new Error('useTaurosSession must be used within TaurosSessionProvider');
  }

  return context;
}
