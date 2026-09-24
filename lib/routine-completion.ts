import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BackendPlan } from "./tauros-backend";

// Offline caches written by app/(tabs)/planes.tsx and hooks/useOfflineRoutine.ts.
export const OFFLINE_PLANS_KEY = "offline_plans_list";
export const OFFLINE_ROUTINES_KEY = "offline_routines";

/** Current completion of a routine exercise, or undefined when not found. */
export function findExerciseCompletion(
  plans: BackendPlan[],
  rutinaEjercicioId: string,
): boolean | undefined {
  for (const plan of plans) {
    for (const day of plan.rutinasDia ?? []) {
      const exercise = day.rutinasEjercicio?.find(
        (item) => item.rutinaEjercicioId === rutinaEjercicioId,
      );
      if (exercise) {
        return Boolean(exercise.completada);
      }
    }
  }
  return undefined;
}

/**
 * Returns `plans` with the exercise marked as `completed` and its day's
 * `finalizada` recomputed (a day is finished when every exercise is done).
 * Untouched plans/days keep their identity.
 */
export function applyExerciseCompletion(
  plans: BackendPlan[],
  rutinaEjercicioId: string,
  completed: boolean,
): BackendPlan[] {
  let changed = false;

  const next = plans.map((plan) => {
    let planChanged = false;
    const rutinasDia = plan.rutinasDia?.map((day) => {
      const exercises = day.rutinasEjercicio ?? [];
      if (!exercises.some((item) => item.rutinaEjercicioId === rutinaEjercicioId)) {
        return day;
      }

      planChanged = true;
      const rutinasEjercicio = exercises.map((item) =>
        item.rutinaEjercicioId === rutinaEjercicioId
          ? { ...item, completada: completed }
          : item,
      );
      return {
        ...day,
        rutinasEjercicio,
        finalizada:
          rutinasEjercicio.length > 0 &&
          rutinasEjercicio.every((item) => Boolean(item.completada)),
      };
    });

    if (!planChanged) {
      return plan;
    }
    changed = true;
    return { ...plan, rutinasDia };
  });

  return changed ? next : plans;
}

/** Completion as stored in the offline caches (cold start without network). */
export async function readCachedExerciseCompletion(
  rutinaEjercicioId: string,
): Promise<boolean | undefined> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_PLANS_KEY);
    if (raw) {
      const found = findExerciseCompletion(
        JSON.parse(raw) as BackendPlan[],
        rutinaEjercicioId,
      );
      if (found !== undefined) {
        return found;
      }
    }

    const rawRoutines = await AsyncStorage.getItem(OFFLINE_ROUTINES_KEY);
    if (!rawRoutines) {
      return undefined;
    }
    const routines = JSON.parse(rawRoutines) as Record<
      string,
      { data?: BackendPlan }
    >;
    const cachedPlans = Object.values(routines)
      .map((entry) => entry?.data)
      .filter((plan): plan is BackendPlan => Boolean(plan));
    return findExerciseCompletion(cachedPlans, rutinaEjercicioId);
  } catch {
    return undefined;
  }
}

/**
 * Mirrors a completion change into the offline caches so screens that render
 * from them (offline, or before the network answers) show it immediately.
 */
export async function persistCachedExerciseCompletion(
  rutinaEjercicioId: string,
  completed: boolean,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_PLANS_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as BackendPlan[];
      const updated = applyExerciseCompletion(cached, rutinaEjercicioId, completed);
      if (updated !== cached) {
        await AsyncStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(updated));
      }
    }

    const rawRoutines = await AsyncStorage.getItem(OFFLINE_ROUTINES_KEY);
    if (!rawRoutines) {
      return;
    }
    const routines = JSON.parse(rawRoutines) as Record<
      string,
      { data?: BackendPlan; cachedAt?: number }
    >;
    let routinesChanged = false;
    for (const [id, entry] of Object.entries(routines)) {
      if (!entry?.data) {
        continue;
      }
      const [updated] = applyExerciseCompletion(
        [entry.data],
        rutinaEjercicioId,
        completed,
      );
      if (updated !== entry.data) {
        routines[id] = { ...entry, data: updated };
        routinesChanged = true;
      }
    }
    if (routinesChanged) {
      await AsyncStorage.setItem(OFFLINE_ROUTINES_KEY, JSON.stringify(routines));
    }
  } catch (error) {
    console.warn("[routine-completion] cache update failed", error);
  }
}
