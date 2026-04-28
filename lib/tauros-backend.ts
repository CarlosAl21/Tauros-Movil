import { useCallback, useEffect, useMemo, useState } from 'react';

import { taurosRequest } from './tauros-api';
import type { TaurosAuthUser } from './tauros-session';
import { useTaurosSession } from './tauros-session';

export type BackendExercise = {
  ejercicioId: string;
  nombre: string;
  linkVideo: string;
  linkAM: string;
  categoria?: { nombre?: string } | null;
  tipo?: { nombre?: string } | null;
  maquina?: { nombre?: string; numeroMaquina?: string | number } | null;
};

export type BackendPlan = {
  planEntrenamientoId: string;
  nombre: string;
  descripcion: string;
  duracionDias: number;
  objetivo: string;
  esPlantilla?: boolean;
  usuario?: { userId?: string } | null;
  rutinasDia?: Array<{
    rutinaDiaId: string;
    numeroDia: number;
    nombre: string;
    descripcion: string;
    rutinasEjercicio?: Array<{
      rutinaEjercicioId: string;
      orden: number;
      series: string;
      repeticiones: string;
      carga: string;
      notasEspecificas: string;
      completada?: boolean;
      ejercicio?: BackendExercise | null;
    }>;
  }>;
};

export type BackendEvent = {
  eventoId: string;
  nombre: string;
  fechaHora: string;
  lugar: string;
  descripcion: string;
  numParticipantes: number;
  activo: boolean;
};

export type BackendSchedule = {
  horarioId: string;
  diasSemanales: string;
  apertura: string;
  cierre: string;
};

export type BackendSuggestion = {
  tipo: 'EVENTO' | 'RUTINA' | 'EJERCICIO';
  actividad: string;
  contenido: string;
};

export type BackendProfile = {
  userId: string;
  username: string;
  rol: 'admin' | 'coach' | 'user';
};

type BackendState = {
  exercises: BackendExercise[];
  plans: BackendPlan[];
  events: BackendEvent[];
  schedules: BackendSchedule[];
  suggestions: BackendSuggestion[];
  profile: BackendProfile | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  registerForEvent: (eventId: string) => Promise<void>;
  loginUser: TaurosAuthUser | null;
};

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function useTaurosBackend(): BackendState {
  const { token, user, loadingSession, setPersistentWeight, persistentWeight } = useTaurosSession();
  const [exercises, setExercises] = useState<BackendExercise[]>([]);
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [schedules, setSchedules] = useState<BackendSchedule[]>([]);
  const [suggestions, setSuggestions] = useState<BackendSuggestion[]>([]);
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!token) {
      setExercises([]);
      setPlans([]);
      setEvents([]);
      setSchedules([]);
      setSuggestions([]);
      setProfile(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [exercisesResponse, plansResponse, eventsResponse, schedulesResponse, suggestionsResponse, profileResponse] = await Promise.all([
        taurosRequest<unknown[]>('/ejercicio', { token }),
        taurosRequest<unknown[]>('/plan-entrenamiento', { token }),
        taurosRequest<unknown[]>('/evento/activos', { token }),
        taurosRequest<unknown[]>('/horario', { token }),
        taurosRequest<unknown[]>('/sugerencia', { token }),
        taurosRequest<BackendProfile>('/auth/profile', { token }),
      ]);

      setExercises(safeArray<BackendExercise>(exercisesResponse));
      setPlans(safeArray<BackendPlan>(plansResponse));
      setEvents(safeArray<BackendEvent>(eventsResponse));
      setSchedules(safeArray<BackendSchedule>(schedulesResponse));
      setSuggestions(safeArray<BackendSuggestion>(suggestionsResponse));
      setProfile(profileResponse || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la informacion del backend');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loadingSession) {
      refresh();
    }
  }, [loadingSession, refresh]);

  const registerForEvent = useCallback(async (eventId: string) => {
    if (!token || !user) {
      throw new Error('Debes iniciar sesion antes de registrarte en un evento');
    }

    await taurosRequest(`/evento/${eventId}/participantes/${user.userId}`, {
      method: 'POST',
      token,
    });

    await refresh();
  }, [refresh, token, user]);

  return useMemo(() => ({
    exercises,
    plans,
    events,
    schedules,
    suggestions,
    profile,
    loading,
    error,
    refresh,
    registerForEvent,
    loginUser: user,
  }), [error, exercises, loading, plans, events, schedules, suggestions, profile, refresh, registerForEvent, user]);
}
