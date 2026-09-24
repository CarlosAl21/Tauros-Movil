const store: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
}));

import {
  applyExerciseCompletion,
  findExerciseCompletion,
  OFFLINE_PLANS_KEY,
  OFFLINE_ROUTINES_KEY,
  persistCachedExerciseCompletion,
  readCachedExerciseCompletion,
} from "./routine-completion";
import type { BackendPlan } from "./tauros-backend";

const exercise = (id: string, completada: boolean) => ({
  rutinaEjercicioId: id,
  orden: 1,
  series: 3,
  repeticiones: 10,
  carga: "",
  notasEspecificas: "",
  completada,
});

const makePlans = (): BackendPlan[] => [
  {
    planEntrenamientoId: "plan-1",
    nombre: "Plan",
    descripcion: "",
    duracionDias: 2,
    objetivo: "",
    rutinasDia: [
      {
        rutinaDiaId: "day-1",
        numeroDia: 1,
        nombre: "Día 1",
        descripcion: "",
        finalizada: false,
        rutinasEjercicio: [exercise("re-1", true), exercise("re-2", false)],
      },
      {
        rutinaDiaId: "day-2",
        numeroDia: 2,
        nombre: "Día 2",
        descripcion: "",
        finalizada: false,
        rutinasEjercicio: [exercise("re-3", false)],
      },
    ],
  },
];

describe("routine completion", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  });

  it("finds the current completion of a routine exercise", () => {
    expect(findExerciseCompletion(makePlans(), "re-1")).toBe(true);
    expect(findExerciseCompletion(makePlans(), "re-2")).toBe(false);
    expect(findExerciseCompletion(makePlans(), "missing")).toBeUndefined();
  });

  it("marks the exercise and finishes the day when all are done", () => {
    const plans = makePlans();
    const next = applyExerciseCompletion(plans, "re-2", true);

    const day1 = next[0].rutinasDia?.[0];
    expect(day1?.rutinasEjercicio?.[1].completada).toBe(true);
    expect(day1?.finalizada).toBe(true);
    // Other days keep their identity; the input is not mutated.
    expect(next[0].rutinasDia?.[1]).toBe(plans[0].rutinasDia?.[1]);
    expect(plans[0].rutinasDia?.[0].rutinasEjercicio?.[1].completada).toBe(false);
  });

  it("reopens the day when an exercise is unmarked", () => {
    const done = applyExerciseCompletion(makePlans(), "re-2", true);
    const reopened = applyExerciseCompletion(done, "re-1", false);
    expect(reopened[0].rutinasDia?.[0].finalizada).toBe(false);
  });

  it("returns the same array when the exercise is unknown", () => {
    const plans = makePlans();
    expect(applyExerciseCompletion(plans, "missing", true)).toBe(plans);
  });

  it("mirrors the change into both offline caches", async () => {
    store[OFFLINE_PLANS_KEY] = JSON.stringify(makePlans());
    store[OFFLINE_ROUTINES_KEY] = JSON.stringify({
      "plan-1": { data: makePlans()[0], cachedAt: 1 },
    });

    await persistCachedExerciseCompletion("re-3", true);

    const list = JSON.parse(store[OFFLINE_PLANS_KEY]) as BackendPlan[];
    const routines = JSON.parse(store[OFFLINE_ROUTINES_KEY]);
    expect(findExerciseCompletion(list, "re-3")).toBe(true);
    expect(findExerciseCompletion([routines["plan-1"].data], "re-3")).toBe(true);
    expect(routines["plan-1"].cachedAt).toBe(1);
    expect(await readCachedExerciseCompletion("re-3")).toBe(true);
  });

  it("reads completion from the routines cache when the list is missing", async () => {
    store[OFFLINE_ROUTINES_KEY] = JSON.stringify({
      "plan-1": { data: makePlans()[0] },
    });
    expect(await readCachedExerciseCompletion("re-1")).toBe(true);
    expect(await readCachedExerciseCompletion("missing")).toBeUndefined();
  });
});
