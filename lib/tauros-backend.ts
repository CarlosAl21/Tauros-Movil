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
    descansoSegundos?: number;
    finalizada?: boolean;
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
  participantes?: Array<{ userId: string }>;
};

export type BackendSchedule = {
  horarioId: string;
  diasSemanales: string;
  apertura: string;
  cierre: string;
};

export type BackendSuggestion = {
  sugerenciaId?: string;
  tipo: 'EVENTO' | 'RUTINA' | 'EJERCICIO';
  actividad: string;
  contenido: string;
  solucionada?: boolean;
};

export type BackendSuggestionPayload = {
  tipoEntidad: 'EVENTO' | 'RUTINA' | 'EJERCICIO';
  entidadId: string;
  contenido: string;
};

export type BackendProfile = {
  userId: string;
  username?: string;
  correo?: string;
  nombre?: string;
  apellido?: string;
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
  createSuggestion: (payload: BackendSuggestionPayload) => Promise<void>;
  toggleRoutineExerciseCompletion: (rutinaEjercicioId: string) => Promise<void>;
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

  const createSuggestion = useCallback(async (payload: BackendSuggestionPayload) => {
    if (!token) {
      throw new Error('Debes iniciar sesion antes de crear una sugerencia');
    }

    await taurosRequest('/sugerencia', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });

    await refresh();
  }, [refresh, token]);

  const toggleRoutineExerciseCompletion = useCallback(async (rutinaEjercicioId: string) => {
    if (!token) {
      throw new Error('Debes iniciar sesion para actualizar el estado del ejercicio');
    }

    await taurosRequest(`/rutina-ejercicio/${rutinaEjercicioId}/completada`, {
      method: 'PATCH',
      token,
    });

    await refresh();
  }, [refresh, token]);

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
    createSuggestion,
    toggleRoutineExerciseCompletion,
    loginUser: user,
  }), [createSuggestion, error, exercises, loading, plans, events, schedules, suggestions, profile, refresh, registerForEvent, toggleRoutineExerciseCompletion, user]);
}
