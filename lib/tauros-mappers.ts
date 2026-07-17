import type {
    BackendEvent,
    BackendExercise,
    BackendPlan,
    BackendSchedule,
    BackendSuggestion,
    BackendWarmup,
} from "./tauros-backend";
import type {
    TaurosEvent,
    TaurosExercise,
    TaurosPlan,
    TaurosSchedule,
    TaurosSuggestion,
} from "./tauros-data";
import { normalizeVideoUrl } from "./cloudinary";

const BACKUP_EXERCISES: TaurosExercise[] = [
  {
    id: "sentadilla-hack",
    nombre: "Sentadilla En Hack",
    categoria: "Pierna",
    tipo: "Fuerza",
    linkVideo:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    maquina: { numero: "11", nombre: "Hack Squat" },
    series: "3 x 8 a 10",
    repeticiones: "8 a 10",
    descanso: "00:45",
    cargaSugerida: "0.0 kg",
    notas: "Mantener la espalda pegada al respaldo y bajar con control.",
    musculos: ["Gluteos", "Cuadriceps", "Gemelos"],
    activacion: ["Cuadriceps", "Gluteos"],
    thumbnail:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "press-pecho-maquina",
    nombre: "Press De Pecho En Maquina",
    categoria: "Pecho",
    tipo: "Empuje",
    linkVideo:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    maquina: { numero: "4", nombre: "Chest Press" },
    series: "4 x 10 a 12",
    repeticiones: "10 a 12",
    descanso: "01:00",
    cargaSugerida: "12.5 kg",
    notas: "Juntar escapulas y evitar extender del todo los codos.",
    musculos: ["Pectoral", "Triceps", "Deltoides"],
    activacion: ["Pectoral", "Triceps"],
    thumbnail:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "jalon-pecho",
    nombre: "Jalon Al Pecho",
    categoria: "Espalda",
    tipo: "Tiron",
    linkVideo:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    maquina: { numero: "8", nombre: "Lat Pulldown" },
    series: "4 x 10",
    repeticiones: "10",
    descanso: "00:50",
    cargaSugerida: "18.0 kg",
    notas: "Traer la barra al pecho sin balancear el tronco.",
    musculos: ["Dorsal", "Biceps", "Deltoides Posterior"],
    activacion: ["Dorsal", "Biceps"],
    thumbnail:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "peso-muerto-rumano",
    nombre: "Peso Muerto Rumano",
    categoria: "Posterior",
    tipo: "Bisagra",
    linkVideo:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    maquina: null,
    series: "3 x 12",
    repeticiones: "12",
    descanso: "01:15",
    cargaSugerida: "20.0 kg",
    notas: "Cadera atrás, columna neutra y recorrido completo.",
    musculos: ["Femorales", "Gluteos", "Core"],
    activacion: ["Femorales", "Gluteos"],
    thumbnail:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80",
  },
];

const exerciseMetaByName = new Map(
  BACKUP_EXERCISES.map((item) => [normalize(item.nombre), item]),
);
const exerciseMetaById = new Map(
  BACKUP_EXERCISES.map((item) => [item.id, item]),
);

function normalize(value: string | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function lookupExerciseMeta(exerciseId?: string, name?: string) {
  return (
    (exerciseId && exerciseMetaById.get(exerciseId)) ||
    (name && exerciseMetaByName.get(normalize(name))) ||
    BACKUP_EXERCISES[0]
  );
}

function buildMachine(exercise: BackendExercise) {
  if (!exercise.maquina) {
    return null;
  }

  const machineName = String(exercise.maquina.nombre ?? "").trim();
  const machineNumber = String(exercise.maquina.numeroMaquina ?? "").trim();

  if (!machineName && !machineNumber) {
    return null;
  }

  return {
    numero: machineNumber,
    nombre: machineName || "Maquina",
  };
}

function mapWarmup(warmup: BackendWarmup, index: number) {
  const rawWarmup = warmup as BackendWarmup & Record<string, unknown>;
  const series = String(warmup.series ?? "").trim();
  const reps = String(warmup.repeticiones ?? "").trim();
  const warmupTimeSeconds = parseWarmupTimeSeconds(rawWarmup);

  return {
    id: String(
      warmup.calentamientoEjercicioId ??
        warmup.calentamientoId ??
        `warmup-${index + 1}`,
    ),
    orden: Number(warmup.orden ?? index + 1),
    series: series || "1",
    repeticiones: warmupTimeSeconds ? "-" : reps || "-",
    tiempoSegundos: warmupTimeSeconds,
    intensidad: normalizeWarmupIntensity(rawWarmup.intensidad),
    carga: String(warmup.carga ?? "").trim() || "-",
    notas: String(warmup.notas ?? "").trim(),
  };
}

function parseWarmupTimeSeconds(
  warmup: BackendWarmup & Record<string, unknown>,
) {
  const rawTimeCandidates = [
    warmup.tiempoSegundos,
    warmup.tiempo,
    warmup.duracionSegundos,
    warmup.duracion,
    warmup.valorTiempo,
  ];
  const rawTime = rawTimeCandidates.find((value) =>
    Number.isFinite(Number(value)),
  );
  const parsedTime = Number(rawTime);

  if (!Number.isFinite(parsedTime) || parsedTime <= 0) {
    return null;
  }

  const unit = String(
    warmup.unidadTiempo ?? warmup.unidad ?? warmup.tiempoUnidad ?? "",
  )
    .trim()
    .toLowerCase();

  if (unit.includes("min") && parsedTime <= 60) {
    return parsedTime * 60;
  }

  return parsedTime;
}

function normalizeWarmupIntensity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("alta")) {
    return "Alta";
  }

  if (normalized.includes("media")) {
    return "Media";
  }

  if (normalized.includes("baja")) {
    return "Baja";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function mapWarmups(warmups?: BackendWarmup[] | null) {
  return (warmups || []).map((item, index) => mapWarmup(item, index));
}

export function mapBackendExercise(
  exercise: BackendExercise,
  fallback?: Partial<TaurosExercise>,
): TaurosExercise {
  const meta = lookupExerciseMeta(exercise.ejercicioId, exercise.nombre);

  return {
    id: exercise.ejercicioId,
    nombre: exercise.nombre,
    categoria:
      exercise.categoria?.nombre ?? fallback?.categoria ?? meta.categoria,
    tipo: exercise.tipo?.nombre ?? fallback?.tipo ?? meta.tipo,
    linkVideo: normalizeVideoUrl(exercise.linkVideo),
    linkAM: normalizeVideoUrl(exercise.linkAM),
    tiempoSegundos: Number.isFinite(Number(exercise.tiempoSegundos))
      ? Number(exercise.tiempoSegundos)
      : null,
    calentamientos: mapWarmups(exercise.calentamientos),
    maquina: buildMachine(exercise) ?? fallback?.maquina ?? null,
    series: fallback?.series ?? meta.series,
    repeticiones: exercise.tiempoSegundos
      ? "-"
      : (fallback?.repeticiones ?? meta.repeticiones),
    descanso: fallback?.descanso ?? meta.descanso,
    cargaSugerida: fallback?.cargaSugerida ?? meta.cargaSugerida,
    notas: fallback?.notas ?? meta.notas,
    musculos: fallback?.musculos ?? meta.musculos,
    activacion: fallback?.activacion ?? meta.activacion,
    thumbnail: fallback?.thumbnail ?? meta.thumbnail,
  };
}

export function mapBackendExercises(exercises: BackendExercise[]) {
  return exercises.map((exercise) => mapBackendExercise(exercise));
}

export function mapBackendPlans(
  plans: BackendPlan[],
  currentUserId?: string,
): TaurosPlan[] {
  return [...plans]
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt || 0).getTime();
      const rightTime = new Date(right.createdAt || 0).getTime();
      return rightTime - leftTime;
    })
    .map((plan) => {
      const dias = (plan.rutinasDia || []).map((day) => ({
        id: day.rutinaDiaId,
        numeroDia: day.numeroDia,
        nombre: day.nombre,
        descripcion: day.descripcion,
        descansoSegundos: Number(day.descansoSegundos ?? 60),
        finalizada: Boolean(day.finalizada),
        ejercicios: (day.rutinasEjercicio || []).map((rutinaEjercicio) => ({
          rutinaEjercicioId: rutinaEjercicio.rutinaEjercicioId,
          exerciseId:
            rutinaEjercicio.ejercicioId ??
            rutinaEjercicio.ejercicio?.ejercicioId ??
            rutinaEjercicio.rutinaEjercicioId,
          orden: rutinaEjercicio.orden,
          series: String(rutinaEjercicio.series ?? ''),
          repeticiones: String(rutinaEjercicio.repeticiones ?? ''),
          tiempoSegundos: Number.isFinite(
            Number(
              rutinaEjercicio.tiempoSegundos ??
                rutinaEjercicio.ejercicio?.tiempoSegundos,
            ),
          )
            ? Number(
                rutinaEjercicio.tiempoSegundos ??
                  rutinaEjercicio.ejercicio?.tiempoSegundos,
              )
            : null,
          descansoSegundos: Number(
            rutinaEjercicio.descansoSegundos ?? day.descansoSegundos ?? 60,
          ),
          carga: rutinaEjercicio.carga,
          notas: rutinaEjercicio.notasEspecificas,
          completado: Boolean(rutinaEjercicio.completada),
          calentamientos: mapWarmups(
            rutinaEjercicio.calentamientos ||
              rutinaEjercicio.ejercicio?.calentamientos,
          ),
        })),
      }));
      const completado = dias.length > 0 && dias.every((day) => day.finalizada);

      return {
        id: plan.planEntrenamientoId,
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        objetivo: plan.objetivo,
        duracionDias: Number(plan.duracionDias || dias.length || 0),
        esPlantilla: plan.esPlantilla !== false,
        activo:
          plan.esPlantilla === false && Boolean(currentUserId)
            ? plan.usuario?.userId === currentUserId
            : plan.esPlantilla === false,
        createdAt: plan.createdAt,
        completado,
        dias,
      };
    });
}

export function pickLatestAssignedPlan(plans: TaurosPlan[]) {
  if (!plans.length) {
    return null;
  }

  return plans.reduce<TaurosPlan>((latest, current) => {
    const latestTime = new Date(latest.createdAt || 0).getTime();
    const currentTime = new Date(current.createdAt || 0).getTime();

    if (currentTime > latestTime) {
      return current;
    }

    if (currentTime < latestTime) {
      return latest;
    }

    return latest;
  }, plans[0]);
}

export function mapBackendEvents(
  events: BackendEvent[],
  currentUserId?: string,
): TaurosEvent[] {
  return events.map((event, index) => ({
    id: event.eventoId,
    nombre: event.nombre,
    fechaHora: event.fechaHora,
    lugar: event.lugar,
    descripcion: event.descripcion,
    asistentes: Number(event.numParticipantes || 0),
    cupo: Math.max(Number(event.numParticipantes || 0) + 10, 20 + index * 2),
    activo: event.activo,
    inscrito: Boolean(
      currentUserId &&
      (event.participantes || []).some(
        (participant) => participant.userId === currentUserId,
      ),
    ),
  }));
}

export function mapBackendSchedules(
  schedules: BackendSchedule[],
): TaurosSchedule[] {
  return schedules.map((schedule) => ({
    dia: schedule.diasSemanales,
    apertura: schedule.apertura,
    cierre: schedule.cierre,
    detalle:
      schedule.apertura === "Cerrado" || schedule.cierre === "Cerrado"
        ? "El gimnasio no abre este día."
        : `Horario operativo de ${schedule.apertura} a ${schedule.cierre}`,
    destacado:
      schedule.diasSemanales === "Viernes" ||
      schedule.diasSemanales === "Lunes",
  }));
}

export function mapBackendSuggestions(suggestions: BackendSuggestion[]) {
  return suggestions.map((suggestion, index) => ({
    id: suggestion.sugerenciaId || `${suggestion.tipo}-${index}`,
    tipoEntidad: suggestion.tipo,
    entidadId: suggestion.actividad,
    contenido: suggestion.contenido,
    actividad: suggestion.actividad,
    solucionada: Boolean(suggestion.solucionada),
  })) as TaurosSuggestion[];
}

export function findDisplayExerciseById(
  exercises: BackendExercise[],
  exerciseId: string | undefined,
) {
  if (!exerciseId) {
    return null;
  }

  const exercise = exercises.find((item) => item.ejercicioId === exerciseId);
  return exercise ? mapBackendExercise(exercise) : null;
}

export function findPlanExercise(
  plan: TaurosPlan | undefined,
  exerciseId: string | undefined,
) {
  if (!plan || !exerciseId) {
    return null;
  }

  for (const day of plan.dias) {
    const found = day.ejercicios.find(
      (exercise) => exercise.exerciseId === exerciseId,
    );
    if (found) {
      return { day, exercise: found };
    }
  }

  return null;
}
