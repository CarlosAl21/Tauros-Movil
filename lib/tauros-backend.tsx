import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { LoadRecord } from "./load-progress";
import { queueOfflineAction } from "./offline-queue";
import { DEFAULT_WEIGHT_UNIT, isWeightUnit, type WeightUnit } from "./weight-units";
import { taurosRequest } from "./tauros-api";
import type { TaurosAuthUser } from "./tauros-session";
import { useTaurosSession } from "./tauros-session";

export type BackendExercise = {
  ejercicioId: string;
  nombre: string;
  linkVideo: string;
  linkAM: string;
  tiempoSegundos?: number | null;
  calentamientos?: BackendWarmup[];
  categoria?: { nombre?: string } | null;
  tipo?: { nombre?: string } | null;
  maquina?: { nombre?: string; numeroMaquina?: string | number } | null;
};

export type BackendWarmup = {
  calentamientoEjercicioId?: string;
  calentamientoId?: string;
  orden?: number;
  modo?: string | null;
  series?: string | number | null;
  repeticiones?: string | number | null;
  tiempoSegundos?: number | null;
  tiempo?: number | string | null;
  unidad?: string | null;
  unidadTiempo?: string | null;
  intensidad?: string | null;
  carga?: string | null;
  notas?: string | null;
};

export type BackendPlan = {
  planEntrenamientoId: string;
  nombre: string;
  descripcion: string;
  duracionDias: number;
  objetivo: string;
  createdAt?: string;
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
      series: string | number;
      repeticiones: string | number | null;
      tiempoSegundos?: number | null;
      descansoSegundos?: number;
      carga: string;
      notasEspecificas: string;
      completada?: boolean;
      ejercicioId?: string;
      ejercicioNombre?: string;
      calentamientos?: BackendWarmup[];
      ejercicio?: BackendExercise | null;
    }>;
  }>;
};

type BackendAssignedExercise = {
  rutinaEjercicioId: string;
  orden: number;
  series: string | number;
  repeticiones: string | number | null;
  tiempoSegundos?: number | null;
  carga?: string | null;
  descansoSegundos?: number | null;
  notasEspecificas?: string | null;
  completada?: boolean;
  ejercicioId?: string;
  ejercicioNombre?: string;
  calentamientos?: BackendWarmup[];
};

type BackendAssignedRoutineDay = {
  planEntrenamientoId: string;
  planNombre?: string;
  planCreatedAt?: string;
  rutinaDiaId: string;
  numeroDia: number;
  nombre: string;
  descripcion: string;
  descansoSegundos?: number | null;
  finalizada?: boolean;
  ejercicios?: BackendAssignedExercise[];
};

type BackendAssignedPlanResponse = {
  rutinasAsignadas?: BackendAssignedRoutineDay[];
};

export type BackendNutritionPlan = {
  planNutricionalId: string;
  linkPdf: string;
  previewUrl?: string;
  downloadUrl?: string;
  createdAt?: string;
  usuario?: { userId?: string } | null;
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
  tipo: "EVENTO" | "RUTINA" | "EJERCICIO";
  actividad: string;
  contenido: string;
  solucionada?: boolean;
};

export type BackendSuggestionPayload = {
  tipoEntidad: "EVENTO" | "RUTINA" | "EJERCICIO";
  entidadId: string;
  contenido: string;
};

export type BackendProfile = {
  userId: string;
  username?: string;
  correo?: string;
  nombre?: string;
  apellido?: string;
  rol: "admin" | "coach" | "user";
};

type BackendState = {
  exercises: BackendExercise[];
  plans: BackendPlan[];
  events: BackendEvent[];
  schedules: BackendSchedule[];
  suggestions: BackendSuggestion[];
  nutritionPlans: BackendNutritionPlan[];
  profile: BackendProfile | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  registerForEvent: (eventId: string) => Promise<void>;
  createSuggestion: (payload: BackendSuggestionPayload) => Promise<void>;
  toggleRoutineExerciseCompletion: (
    rutinaEjercicioId: string,
  ) => Promise<{ queued: boolean }>;
  /** Latest recorded load (kg) per base ejercicioId, from the server. */
  latestLoads: Record<string, number>;
  recordExerciseLoad: (
    payload: RecordLoadPayload,
  ) => Promise<{ queued: boolean; record: LoadRecord }>;
  fetchLoadHistory: (ejercicioId: string) => Promise<LoadRecord[]>;
  loginUser: TaurosAuthUser | null;
};

export type RecordLoadPayload = {
  /** Base exercise id (never the rutinaEjercicioId). */
  ejercicioId: string;
  cargaKg: number;
  /** Unit the user typed the load in. */
  unidad: WeightUnit;
  rutinaEjercicioId?: string;
};

/** Offline-queue kind for load records (see lib/offline-queue.ts). */
export const RECORD_LOAD_ACTION_KIND = "record-load";

type RawLoadRecord = Partial<Omit<LoadRecord, "cargaKg" | "unidad">> & {
  cargaKg?: number | string | null;
  unidad?: string | null;
};

function normalizeLoadRecord(raw: RawLoadRecord): LoadRecord | null {
  const cargaKg = Number(raw?.cargaKg);
  if (!raw?.ejercicioId || !Number.isFinite(cargaKg)) {
    return null;
  }

  return {
    registroCargaId: String(
      raw.registroCargaId ?? `${raw.ejercicioId}-${raw.fechaRegistro ?? ""}`,
    ),
    ejercicioId: raw.ejercicioId,
    rutinaEjercicioId: raw.rutinaEjercicioId ?? null,
    cargaKg,
    unidad: isWeightUnit(raw.unidad) ? raw.unidad : DEFAULT_WEIGHT_UNIT,
    fechaRegistro: String(raw.fechaRegistro ?? new Date().toISOString()),
  };
}

function normalizeLoadRecords(value: unknown): LoadRecord[] {
  return safeArray<RawLoadRecord>(value)
    .map(normalizeLoadRecord)
    .filter((record): record is LoadRecord => record !== null);
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizePlansResponse(value: unknown): BackendPlan[] {
  if (Array.isArray(value)) {
    return value as BackendPlan[];
  }

  const response = value as BackendAssignedPlanResponse;
  const assigned = safeArray<BackendAssignedRoutineDay>(
    response?.rutinasAsignadas,
  );
  if (!assigned.length) {
    return [];
  }

  const byPlanId = new Map<string, BackendPlan>();

  for (const item of assigned) {
    const planId = String(item.planEntrenamientoId || "").trim();
    if (!planId) {
      continue;
    }

    if (!byPlanId.has(planId)) {
      byPlanId.set(planId, {
        planEntrenamientoId: planId,
        nombre: String(item.planNombre || "Plan"),
        descripcion: "",
        duracionDias: 0,
        objetivo: "",
        createdAt: item.planCreatedAt,
        esPlantilla: false,
        rutinasDia: [],
      });
    }

    const plan = byPlanId.get(planId);
    if (!plan) {
      continue;
    }

    const dayId = String(item.rutinaDiaId || "").trim();
    if (!dayId) {
      continue;
    }

    plan.rutinasDia = plan.rutinasDia || [];
    const exists = plan.rutinasDia.some((day) => day.rutinaDiaId === dayId);
    if (exists) {
      continue;
    }

    plan.rutinasDia.push({
      rutinaDiaId: dayId,
      numeroDia: Number(item.numeroDia || 0),
      nombre: String(item.nombre || ""),
      descripcion: String(item.descripcion || ""),
      descansoSegundos:
        item.descansoSegundos === null
          ? undefined
          : Number(item.descansoSegundos ?? 60),
      finalizada: Boolean(item.finalizada),
      rutinasEjercicio: safeArray<BackendAssignedExercise>(item.ejercicios).map(
        (exercise) => ({
          rutinaEjercicioId: exercise.rutinaEjercicioId,
          orden: Number(exercise.orden || 0),
          series: exercise.series,
          repeticiones: exercise.repeticiones,
          tiempoSegundos: Number.isFinite(Number(exercise.tiempoSegundos))
            ? Number(exercise.tiempoSegundos)
            : null,
          carga: String(exercise.carga ?? ""),
          descansoSegundos:
            exercise.descansoSegundos === null
              ? undefined
              : Number(exercise.descansoSegundos ?? 60),
          notasEspecificas: String(exercise.notasEspecificas ?? ""),
          completada: Boolean(exercise.completada),
          ejercicioId: exercise.ejercicioId,
          ejercicioNombre: exercise.ejercicioNombre,
          calentamientos: safeArray(exercise.calentamientos),
          ejercicio: exercise.ejercicioId
            ? {
                ejercicioId: exercise.ejercicioId,
                nombre: String(exercise.ejercicioNombre || ""),
                linkVideo: "",
                linkAM: "",
              }
            : null,
        }),
      ),
    });

    plan.duracionDias = Math.max(plan.duracionDias, plan.rutinasDia.length);
  }

  return Array.from(byPlanId.values());
}

// One shared instance lives in TaurosBackendProvider (mounted once in
// app/_layout.tsx). Every screen that calls useTaurosBackend() reads that
// same instance instead of fetching and holding its own separate copy —
// otherwise a mutation made on one screen (e.g. marking an exercise done)
// only updated that screen's local state, and screens already mounted
// underneath it in the navigation stack kept showing stale data until the
// whole app was restarted.
function useTaurosBackendState(): BackendState {
  const { token, user, loadingSession, syncWeightFromServer } =
    useTaurosSession();
  // Held in a ref so refresh() keeps a stable identity: the session recreates
  // this function whenever the weight changes, which must not re-trigger a
  // full backend refresh.
  const syncWeightRef = useRef(syncWeightFromServer);
  useEffect(() => {
    syncWeightRef.current = syncWeightFromServer;
  }, [syncWeightFromServer]);
  const [exercises, setExercises] = useState<BackendExercise[]>([]);
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [schedules, setSchedules] = useState<BackendSchedule[]>([]);
  const [suggestions, setSuggestions] = useState<BackendSuggestion[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<BackendNutritionPlan[]>(
    [],
  );
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [latestLoads, setLatestLoads] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) {
      setExercises([]);
      setPlans([]);
      setEvents([]);
      setSchedules([]);
      setSuggestions([]);
      setNutritionPlans([]);
      setProfile(null);
      setLatestLoads({});
      return;
    }

    setLoading(true);
    setError("");

    // Independent of the catalog requests: it never throws and keeps the
    // local weight when offline.
    void syncWeightRef.current();

    // Independent too: offline or not deployed yet keeps the previous values.
    void taurosRequest<unknown>("/registro-carga/me/latest", { token })
      .then((response) => {
        const byExercise: Record<string, number> = {};
        for (const record of normalizeLoadRecords(response)) {
          byExercise[record.ejercicioId] = record.cargaKg;
        }
        setLatestLoads(byExercise);
      })
      .catch(() => undefined);

    try {
      const nutritionPlansPromise = user?.userId
        ? taurosRequest<unknown[]>(`/plan-nutricional/usuario/${user.userId}`, {
            token,
          }).catch(() => [])
        : Promise.resolve([] as unknown[]);

      const [
        exercisesResponse,
        plansResponse,
        eventsResponse,
        schedulesResponse,
        suggestionsResponse,
        profileResponse,
        nutritionPlansResponse,
      ] = await Promise.all([
        taurosRequest<unknown[]>("/ejercicio", { token }),
        taurosRequest<unknown>("/plan-entrenamiento", { token }),
        taurosRequest<unknown[]>("/evento/activos", { token }),
        taurosRequest<unknown[]>("/horario", { token }),
        taurosRequest<unknown[]>("/sugerencia", { token }),
        taurosRequest<BackendProfile>("/auth/profile", { token }),
        nutritionPlansPromise,
      ]);

      setExercises(safeArray<BackendExercise>(exercisesResponse));
      setPlans(normalizePlansResponse(plansResponse));
      setEvents(safeArray<BackendEvent>(eventsResponse));
      setSchedules(safeArray<BackendSchedule>(schedulesResponse));
      setSuggestions(safeArray<BackendSuggestion>(suggestionsResponse));
      setNutritionPlans(
        safeArray<BackendNutritionPlan>(nutritionPlansResponse),
      );
      setProfile(profileResponse || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la informacion del backend",
      );
    } finally {
      setLoading(false);
    }
  }, [token, user?.userId]);

  useEffect(() => {
    if (!loadingSession) {
      refresh();
    }
  }, [loadingSession, refresh]);

  const registerForEvent = useCallback(
    async (eventId: string) => {
      if (!token || !user) {
        throw new Error(
          "Debes iniciar sesion antes de registrarte en un evento",
        );
      }

      await taurosRequest(`/evento/${eventId}/participantes/${user.userId}`, {
        method: "POST",
        token,
      });

      await refresh();
    },
    [refresh, token, user],
  );

  const createSuggestion = useCallback(
    async (payload: BackendSuggestionPayload) => {
      if (!token) {
        throw new Error("Debes iniciar sesion antes de crear una sugerencia");
      }

      await taurosRequest("/sugerencia", {
        method: "POST",
        body: JSON.stringify(payload),
        token,
      });

      await refresh();
    },
    [refresh, token],
  );

  const toggleRoutineExerciseCompletion = useCallback(
    async (rutinaEjercicioId: string): Promise<{ queued: boolean }> => {
      if (!token) {
        throw new Error(
          "Debes iniciar sesion para actualizar el estado del ejercicio",
        );
      }

      const path = `/rutina-ejercicio/${rutinaEjercicioId}/completada`;

      try {
        await taurosRequest(path, { method: "PATCH", token });
        await refresh();
        return { queued: false };
      } catch (error) {
        if (!(error instanceof TypeError)) {
          // The server actually answered (bad id, auth, etc.) — a real
          // error, not a connectivity issue. Surface it as before.
          throw error;
        }

        // Network unreachable: save it instead of losing the completion.
        // lib/tauros-session.tsx replays this once connectivity returns.
        await queueOfflineAction({
          id: `toggle-exercise-completion-${rutinaEjercicioId}-${Date.now()}`,
          kind: "toggle-exercise-completion",
          userId: user?.userId ?? "",
          path,
          method: "PATCH",
        });
        return { queued: true };
      }
    },
    [refresh, token, user?.userId],
  );

  const recordExerciseLoad = useCallback(
    async (
      payload: RecordLoadPayload,
    ): Promise<{ queued: boolean; record: LoadRecord }> => {
      if (!token) {
        throw new Error("Debes iniciar sesion para registrar la carga");
      }

      const path = "/registro-carga";
      const body = JSON.stringify({
        ejercicioId: payload.ejercicioId,
        cargaKg: payload.cargaKg,
        unidad: payload.unidad,
        ...(payload.rutinaEjercicioId
          ? { rutinaEjercicioId: payload.rutinaEjercicioId }
          : {}),
      });
      const localRecord: LoadRecord = {
        registroCargaId: `local-${Date.now()}`,
        ejercicioId: payload.ejercicioId,
        rutinaEjercicioId: payload.rutinaEjercicioId ?? null,
        cargaKg: payload.cargaKg,
        unidad: payload.unidad,
        fechaRegistro: new Date().toISOString(),
      };

      setLatestLoads((current) => ({
        ...current,
        [payload.ejercicioId]: payload.cargaKg,
      }));

      try {
        const response = await taurosRequest<RawLoadRecord>(path, {
          method: "POST",
          token,
          body,
        });
        return {
          queued: false,
          record: normalizeLoadRecord(response) ?? localRecord,
        };
      } catch (error) {
        if (!(error instanceof TypeError)) {
          throw error;
        }

        // Offline: replayed later by lib/tauros-session.tsx. The server
        // stamps fechaRegistro when the replay arrives.
        await queueOfflineAction({
          id: `${RECORD_LOAD_ACTION_KIND}-${payload.ejercicioId}-${Date.now()}`,
          kind: RECORD_LOAD_ACTION_KIND,
          userId: user?.userId ?? "",
          path,
          method: "POST",
          body,
        });
        return { queued: true, record: localRecord };
      }
    },
    [token, user?.userId],
  );

  const fetchLoadHistory = useCallback(
    async (ejercicioId: string) => {
      if (!token || !ejercicioId) {
        return [];
      }

      const response = await taurosRequest<unknown>(
        `/registro-carga/me?ejercicioId=${encodeURIComponent(ejercicioId)}`,
        { token },
      );
      return normalizeLoadRecords(response);
    },
    [token],
  );

  return useMemo(
    () => ({
      exercises,
      plans,
      events,
      schedules,
      suggestions,
      nutritionPlans,
      profile,
      loading,
      error,
      refresh,
      registerForEvent,
      createSuggestion,
      toggleRoutineExerciseCompletion,
      latestLoads,
      recordExerciseLoad,
      fetchLoadHistory,
      loginUser: user,
    }),
    [
      createSuggestion,
      error,
      exercises,
      loading,
      plans,
      events,
      schedules,
      suggestions,
      nutritionPlans,
      profile,
      refresh,
      registerForEvent,
      toggleRoutineExerciseCompletion,
      latestLoads,
      recordExerciseLoad,
      fetchLoadHistory,
      user,
    ],
  );
}

const TaurosBackendContext = createContext<BackendState | null>(null);

export function TaurosBackendProvider({ children }: { children: ReactNode }) {
  const value = useTaurosBackendState();
  return (
    <TaurosBackendContext.Provider value={value}>
      {children}
    </TaurosBackendContext.Provider>
  );
}

export function useTaurosBackend(): BackendState {
  const context = useContext(TaurosBackendContext);
  if (!context) {
    throw new Error(
      "useTaurosBackend must be used within a TaurosBackendProvider",
    );
  }
  return context;
}
