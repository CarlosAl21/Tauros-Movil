import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    Vibration,
    View,
} from "react-native";

import { ExerciseMedia } from "@/components/exercise-media";
import { TaurosAuthCard } from "@/components/tauros-auth-card";
import {
    TaurosButton,
    TaurosCard,
    TaurosHeader,
    TaurosPill,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { useSafeBack } from "@/hooks/use-safe-back";
import {
    ensureNotificationsReady,
    ensureRestAlarmReady,
    notifyNow,
    playRestFinishedFallbackAlert,
} from "@/lib/rest-notifications";
import {
    RECORD_LOAD_ACTION_KIND,
    useTaurosBackend,
} from "@/lib/tauros-backend";
import type { BackendExercise, BackendPlan } from "@/lib/tauros-backend";
import {
    findDisplayExerciseById,
    findPlanExercise,
    mapBackendExercises,
    mapBackendPlans,
} from "@/lib/tauros-mappers";
import type { TaurosWarmup } from "@/lib/tauros-data";
import { summarizeLoadProgress, type LoadRecord } from "@/lib/load-progress";
import { hasQueuedAction } from "@/lib/offline-queue";
import { useTaurosSession } from "@/lib/tauros-session";
import {
    formatCarga,
    formatWeight,
    parseCargaKg,
    parseWeightInput,
    toKg,
    toWeightInput,
} from "@/lib/weight-units";
import { TaurosSuggestionForm } from "../../components/tauros-suggestion-form";

const DEFAULT_REST_SECONDS = 60;

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    day?: string;
    planId?: string;
    routineId?: string;
  }>();

  const exerciseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const dayId = Array.isArray(params.day) ? params.day[0] : params.day;
  const planId = Array.isArray(params.planId)
    ? params.planId[0]
    : params.planId;
  const routineId = Array.isArray(params.routineId)
    ? params.routineId[0]
    : params.routineId;

  // Logical parent when there is no history (deep link / cold start): the
  // routine day the exercise belongs to, or the exercise catalog otherwise.
  const goBack = useSafeBack(
    planId
      ? {
          pathname: "/plan/[id]",
          params: dayId ? { id: planId, day: dayId } : { id: planId },
        }
      : "/ejercicios",
  );

  const { token, user, weightUnit, getExerciseWeight, setExerciseWeight } =
    useTaurosSession();
  const {
    exercises,
    plans,
    toggleRoutineExerciseCompletion,
    latestLoads,
    recordExerciseLoad,
    fetchLoadHistory,
  } = useTaurosBackend();
  const [loadHistory, setLoadHistory] = useState<LoadRecord[]>([]);

  const [cachedExercises, setCachedExercises] = useState<BackendExercise[]>([]);
  const [cachedPlans, setCachedPlans] = useState<BackendPlan[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("offline_exercises_catalog")
      .then((raw) => { if (raw) setCachedExercises(JSON.parse(raw)); })
      .catch(() => {});
    AsyncStorage.getItem("offline_plans_list")
      .then((raw) => { if (raw) setCachedPlans(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const [carga, setCarga] = useState("");
  const [nota, setNota] = useState("");
  const [completed, setCompleted] = useState(false);
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const [completedWarmups, setCompletedWarmups] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [screenNotice, setScreenNotice] = useState<{
    title: string;
    body: string;
    tone: "accent" | "success";
  } | null>(null);

  const displayExercises = mapBackendExercises(exercises.length ? exercises : cachedExercises);
  const displayPlans = mapBackendPlans(plans.length ? plans : cachedPlans, user?.userId);
  const displayExercise =
    findDisplayExerciseById(exercises, exerciseId) ||
    displayExercises.find((item) => item.id === exerciseId) ||
    null;
  // Routine data (series, rest, load, completion) only applies when the screen
  // was opened from a routine. Opened from the catalog (only `id`), the screen
  // shows pure catalog data and never borrows another plan's values.
  const activePlan = planId
    ? displayPlans.find((plan) => plan.id === planId)
    : routineId
      ? displayPlans.find((plan) =>
          plan.dias.some((day) =>
            day.ejercicios.some((item) => item.rutinaEjercicioId === routineId),
          ),
        )
      : undefined;
  const routineExercise = findPlanExercise(activePlan, exerciseId);
  const isRoutineContext = Boolean(routineExercise);
  const targetDay =
    dayId && activePlan
      ? activePlan.dias.find((day) => day.id === dayId)
      : routineExercise?.day || null;
  const activeRoutineId =
    routineId || routineExercise?.exercise.rutinaEjercicioId;
  const routineTimedSeconds = routineExercise?.exercise.tiempoSegundos;
  const displayTimedSeconds = Number.isFinite(
    Number(routineTimedSeconds ?? displayExercise?.tiempoSegundos),
  )
    ? Number(routineTimedSeconds ?? displayExercise?.tiempoSegundos)
    : null;
  const exerciseWarmups =
    routineExercise?.exercise.calentamientos ||
    displayExercise?.calentamientos ||
    [];
  const sortedWarmups = exerciseWarmups
    .slice()
    .sort((left, right) => left.orden - right.orden);
  const currentWarmup =
    completedWarmups < sortedWarmups.length
      ? sortedWarmups[completedWarmups]
      : null;
  const seriesSource = routineExercise?.exercise.series || "3";
  const intervalsTarget = parseIntervalsFromSeries(seriesSource);
  const restDuration = Number(
    routineExercise?.exercise.descansoSegundos ??
      targetDay?.descansoSegundos ??
      DEFAULT_REST_SECONDS,
  );
  const restEndTitle = `Descanso terminado · ${displayExercise?.nombre || ""}`;
  const warmupRestEndTitle = `Calentamiento terminado · ${
    displayExercise?.nombre || ""
  }`;
  const restEndBody = displayTimedSeconds
    ? "Ya puedes continuar con el siguiente intervalo."
    : "Ya puedes continuar con la siguiente repetición.";
  const warmupRestEndBody = "Continua con el siguiente calentamiento.";

  // Rest finished with the app open. The system notification is already
  // ringing (presented in the foreground too), so the in-app sound is only a
  // fallback for when it could not be scheduled.
  const onRestFinished = useCallback(
    ({ systemAlarm }: { systemAlarm: boolean }) => {
      if (!systemAlarm) {
        playRestFinishedFallbackAlert();
      }
      setScreenNotice({ title: restEndTitle, body: restEndBody, tone: "accent" });
    },
    [restEndBody, restEndTitle],
  );
  const onWarmupRestFinished = useCallback(
    ({ systemAlarm }: { systemAlarm: boolean }) => {
      if (!systemAlarm) {
        playRestFinishedFallbackAlert();
      }
      setScreenNotice({
        title: warmupRestEndTitle,
        body: warmupRestEndBody,
        tone: "success",
      });
    },
    [warmupRestEndTitle],
  );
  const restTimer = useRestTimer("interval", onRestFinished);
  const warmupRestTimer = useRestTimer("warmup", onWarmupRestFinished);
  const restSecondsLeft = restTimer.secondsLeft;
  const warmupRestSecondsLeft = warmupRestTimer.secondsLeft;
  const stopRest = restTimer.stop;
  const stopWarmupRest = warmupRestTimer.stop;

  useEffect(() => {
    setCompleted(Boolean(routineExercise?.exercise.completado));
  }, [routineExercise?.exercise.completado]);

  useEffect(() => {
    const loadSavedCharge = async () => {
      if (!displayExercise?.id) {
        return;
      }

      // The input holds the load in the user's unit; storage is always kg.
      // Server history wins, unless a record is still queued offline: then
      // the local cache holds the newer value.
      const serverChargeKg = latestLoads[displayExercise.id];
      const pendingOffline = await hasQueuedAction(
        RECORD_LOAD_ACTION_KIND,
        user?.userId,
      );
      const savedChargeKg =
        serverChargeKg > 0 && !pendingOffline
          ? serverChargeKg
          : await getExerciseWeight(displayExercise.id);
      if (savedChargeKg > 0) {
        setCarga(toWeightInput(savedChargeKg, weightUnit));
        return;
      }

      // Coach load is free text: only prefill when it is a plain kg number
      // (e.g. "20" / "20 kg"), never from ranges like "20-25".
      const coachChargeKg = parseCargaKg(
        routineExercise?.exercise.carga || displayExercise.cargaSugerida,
      );
      setCarga(
        coachChargeKg !== null ? toWeightInput(coachChargeKg, weightUnit) : "",
      );
    };

    void loadSavedCharge();
  }, [
    displayExercise?.id,
    displayExercise?.cargaSugerida,
    getExerciseWeight,
    latestLoads,
    routineExercise?.exercise.carga,
    user?.userId,
    weightUnit,
  ]);

  // Load history is per base exercise, so it also shows in catalog context.
  const baseExerciseId = displayExercise?.id;
  useEffect(() => {
    if (!baseExerciseId) {
      return;
    }

    let cancelled = false;
    fetchLoadHistory(baseExerciseId)
      .then((records) => {
        if (!cancelled) {
          setLoadHistory(records);
        }
      })
      .catch(() => {
        // Offline / unavailable: keep whatever is already shown.
      });

    return () => {
      cancelled = true;
    };
  }, [baseExerciseId, fetchLoadHistory]);

  useEffect(() => {
    setCompletedWarmups(0);
    setCompletedIntervals(0);
    stopWarmupRest();
    stopRest();
  }, [activeRoutineId, exerciseId, stopRest, stopWarmupRest]);

  useEffect(() => {
    // Ask for notification permission (and create the Android channels) as
    // soon as the user reaches an exercise, not when the first rest ends. In
    // a routine, also ask for exact-alarm access before the first rest starts
    // so the background rest alarm rings on time.
    void (isRoutineContext ? ensureRestAlarmReady() : ensureNotificationsReady());
  }, [isRoutineContext]);

  useEffect(() => {
    if (!screenNotice) {
      return;
    }

    const timer = setTimeout(() => {
      setScreenNotice(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [screenNotice]);

  const seriesText = routineExercise
    ? formatExerciseVolume(
        routineExercise.exercise.series,
        routineExercise.exercise.repeticiones,
        displayTimedSeconds,
      )
    : "";
  const typedCharge = parseWeightInput(carga);
  const chargeText =
    typedCharge !== null
      ? formatWeight(toKg(typedCharge, weightUnit), weightUnit)
      : formatCarga(routineExercise?.exercise.carga, weightUnit) || "-";
  const notesText = nota || routineExercise?.exercise.notas || "";
  const activationSource =
    displayExercise?.linkAM || displayExercise?.thumbnail;
  const loadProgress = summarizeLoadProgress(loadHistory, weightUnit);
  const exerciseMeta = [displayExercise?.categoria, displayExercise?.tipo]
    .filter(Boolean)
    .join(" · ");

  const onCompleteInterval = () => {
    if (completedIntervals >= intervalsTarget) {
      return;
    }

    setCompletedIntervals((current) => current + 1);
    restTimer.start({
      durationSeconds: restDuration,
      title: restEndTitle,
      body: restEndBody,
    });
  };

  const onSkipRest = stopRest;
  const onSkipWarmupRest = stopWarmupRest;

  const onCompleteWarmup = () => {
    if (completedWarmups >= sortedWarmups.length) {
      return;
    }

    setCompletedWarmups((current) => current + 1);
    warmupRestTimer.start({
      durationSeconds: restDuration,
      title: warmupRestEndTitle,
      body: warmupRestEndBody,
    });
  };

  // Local cache (prefill fallback) + server history (queued when offline).
  const saveLoadRecord = async (cargaKg: number) => {
    if (!displayExercise) {
      return;
    }

    await setExerciseWeight(displayExercise.id, cargaKg);
    try {
      const { record } = await recordExerciseLoad({
        ejercicioId: displayExercise.id,
        cargaKg,
        unidad: weightUnit,
        rutinaEjercicioId: activeRoutineId,
      });
      setLoadHistory((current) => [record, ...current]);
    } catch (error) {
      console.warn("[ejercicio] load record failed", error);
    }
  };

  const onCompleteExercise = async () => {
    if (!activeRoutineId) {
      setCompleted((current) => !current);
      return;
    }

    try {
      setCompleting(true);
      const wasCompleted = completed;
      const { queued } = await toggleRoutineExerciseCompletion(activeRoutineId);
      const nowCompleted = !wasCompleted;
      setCompleted(nowCompleted);

      const parsedCharge = parseWeightInput(carga);
      if (nowCompleted && parsedCharge !== null && displayExercise) {
        await saveLoadRecord(toKg(parsedCharge, weightUnit));
      }

      if (nowCompleted) {
        // Exercise is done: no rest alert should ring afterwards.
        onSkipRest();
        onSkipWarmupRest();
        void notifyExerciseCompleted(
          "Ejercicio completado",
          queued
            ? "Sin conexión: se guardó en el dispositivo y se sincronizará solo cuando vuelvas a tener señal."
            : "La carga quedó guardada para tu próximo ingreso.",
        );
      }

      if (!nowCompleted || !targetDay) {
        return;
      }

      const currentIndex = targetDay.ejercicios.findIndex(
        (item) => item.rutinaEjercicioId === activeRoutineId,
      );
      const nextExercise =
        currentIndex >= 0 ? targetDay.ejercicios[currentIndex + 1] : undefined;

      if (nextExercise) {
        // Replace (not push) so back from the next exercise returns to the
        // list the user came from instead of walking back through every
        // exercise that was just completed.
        router.replace({
          pathname: "/ejercicio/[id]",
          params: {
            id: nextExercise.exerciseId,
            planId: activePlan?.id || "",
            day: targetDay.id,
            routineId: nextExercise.rutinaEjercicioId || "",
          },
        });
        return;
      }

      if (planId) {
        // Came from a routine: return to it (with the day now completed).
        goBack();
        return;
      }

      if (activePlan?.id) {
        router.replace({
          pathname: "/plan/[id]",
          params: { id: activePlan.id },
        });
      }
    } finally {
      setCompleting(false);
    }
  };

  const notifyExerciseCompleted = async (title: string, body: string) => {
    Vibration.vibrate([0, 250, 150, 250]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const delivered = await notifyNow(title, body);
    if (!delivered) {
      Alert.alert(title, body);
    }
  };

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Ejercicio" onBack={goBack} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  if (!displayExercise) {
    return (
      <TaurosScreen>
        <TaurosHeader
          title="Ejercicio no encontrado"
          onBack={goBack}
        />
        <TaurosCard>
          <Text style={styles.emptyText}>
            No se encontró el ejercicio solicitado.
          </Text>
        </TaurosCard>
      </TaurosScreen>
    );
  }

  return (
    <TaurosScreen>
      <TaurosHeader
        title={displayExercise.nombre}
        subtitle={exerciseMeta || undefined}
        onBack={goBack}
        right={
          isRoutineContext ? (
            <TaurosPill
              label={completed ? "Hecho" : "Pendiente"}
              tone={completed ? "success" : "accent"}
            />
          ) : undefined
        }
      />

      {screenNotice ? (
        <TaurosCard
          style={[
            styles.noticeCard,
            screenNotice.tone === "success"
              ? styles.noticeCardSuccess
              : styles.noticeCardAccent,
          ]}
        >
          <View style={styles.noticeHeader}>
            <Text style={styles.noticeTitle}>{screenNotice.title}</Text>
            <TaurosButton
              compact
              label="Cerrar"
              onPress={() => setScreenNotice(null)}
            />
          </View>
          <Text style={styles.noticeBody}>{screenNotice.body}</Text>
        </TaurosCard>
      ) : null}

      <TaurosCard style={styles.heroCard}>
        <View style={styles.heroVisualStack}>
          <ExerciseMedia
            source={displayExercise.linkVideo}
            fallback={displayExercise.thumbnail}
            autoPlay
          />
          <View style={styles.heroInfo}>
            <Text style={styles.exerciseTitle}>{displayExercise.nombre}</Text>
            {exerciseMeta ? (
              <Text style={styles.exerciseMeta}>{exerciseMeta}</Text>
            ) : null}
            {displayExercise.maquina ? (
              <View style={styles.machineBadge}>
                <Text style={styles.machineBadgeLabel}>
                  {`Maquina #${displayExercise.maquina.numero}`}
                </Text>
                <Text style={styles.machineBadgeValue}>
                  {displayExercise.maquina.nombre}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TaurosCard>

      {!isRoutineContext && (displayTimedSeconds || sortedWarmups.length) ? (
        <TaurosSection
          title="Detalles del ejercicio"
          subtitle="Información del catálogo."
        >
          <TaurosCard style={styles.compactCard}>
            {displayTimedSeconds ? (
              <View style={styles.exerciseGrid}>
                <InfoPill
                  label="Tiempo"
                  value={formatDuration(displayTimedSeconds)}
                />
              </View>
            ) : null}
            {sortedWarmups.length ? (
              <View style={styles.warmupsCard}>
                <Text style={styles.warmupsTitle}>Calentamientos</Text>
                {sortedWarmups.map((warmup) => (
                  <WarmupRow key={warmup.id} warmup={warmup} />
                ))}
              </View>
            ) : null}
          </TaurosCard>
        </TaurosSection>
      ) : null}

      {isRoutineContext ? (
        <TaurosSection
          title="Serie y carga"
          subtitle="Lo esencial para entrenar sin ruido visual."
        >
          <TaurosCard style={styles.compactCard}>
            <View style={styles.exerciseGrid}>
              <InfoPill
                label={displayTimedSeconds ? "Series y tiempo" : "Series y reps"}
                value={seriesText}
              />
              <InfoPill label="Carga" value={chargeText} />
              <InfoPill label="Descanso" value={formatSeconds(restDuration)} />
            </View>

            {exerciseWarmups.length ? (
              <View style={styles.warmupsCard}>
                <Text style={styles.warmupsTitle}>Calentamientos</Text>
                {sortedWarmups.map((warmup) => (
                  <WarmupRow key={warmup.id} warmup={warmup} />
                ))}

                <View style={styles.restRow}>
                  <Text style={styles.restLabel}>Descanso calentamiento</Text>
                  <Text style={styles.restValue}>
                    {formatSeconds(warmupRestSecondsLeft)}
                  </Text>
                </View>

                {warmupRestSecondsLeft > 0 ? (
                  <TaurosButton
                    compact
                    variant="ghost"
                    label="Saltar descanso"
                    onPress={onSkipWarmupRest}
                  />
                ) : null}

                <TaurosButton
                  compact
                  label={
                    completedWarmups >= sortedWarmups.length
                      ? "Calentamientos completados"
                      : currentWarmup
                        ? `Completar calentamiento ${currentWarmup.orden}`
                        : "Completar calentamiento"
                  }
                  onPress={onCompleteWarmup}
                  disabled={completedWarmups >= sortedWarmups.length}
                />
              </View>
            ) : null}

            <View style={styles.fieldRow}>
              <Text style={styles.inputLabel}>
                {`Carga usada en este ejercicio (${weightUnit})`}
              </Text>
              <TextInput
                value={carga}
                onChangeText={setCarga}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="Ejemplo: 20"
                placeholderTextColor="#666"
              />
            </View>

            <Text style={styles.inputLabel}>Notas</Text>
            <TextInput
              value={nota}
              onChangeText={setNota}
              multiline
              style={[styles.input, styles.textArea]}
              placeholder={notesText || "Escribe una nota corta"}
              placeholderTextColor="#666"
            />

            <View style={styles.intervalsCard}>
              <View style={styles.intervalHeader}>
                <Text style={styles.intervalTitle}>
                  {displayTimedSeconds
                    ? "Intervalos de tiempo"
                    : "Intervalos de repeticiones"}
                </Text>
                <Text style={styles.intervalCounter}>
                  {completedIntervals}/{intervalsTarget}
                </Text>
              </View>

              <View style={styles.intervalDots}>
                {Array.from({ length: intervalsTarget }).map((_, index) => (
                  <View
                    key={`interval-${index}`}
                    style={[
                      styles.intervalDot,
                      index < completedIntervals
                        ? styles.intervalDotDone
                        : undefined,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.restRow}>
                <Text style={styles.restLabel}>Descanso</Text>
                <Text style={styles.restValue}>
                  {formatSeconds(restSecondsLeft)}
                </Text>
              </View>

              {restSecondsLeft > 0 ? (
                <TaurosButton
                  compact
                  variant="ghost"
                  label="Saltar descanso"
                  onPress={onSkipRest}
                />
              ) : null}

              <TaurosButton
                compact
                label={
                  completedIntervals >= intervalsTarget
                    ? "Intervalos completados"
                    : displayTimedSeconds
                      ? "Siguiente intervalo"
                      : "Siguiente repetición"
                }
                onPress={onCompleteInterval}
                disabled={completedIntervals >= intervalsTarget}
              />
            </View>

            <TaurosButton
              label={completed ? "Completado" : "Marcar como completado"}
              onPress={onCompleteExercise}
              disabled={completing}
            />
          </TaurosCard>
        </TaurosSection>
      ) : null}

      {loadProgress ? (
        <TaurosSection
          title="Progreso de carga"
          subtitle="Tus cargas registradas en este ejercicio."
        >
          <TaurosCard style={styles.compactCard}>
            <View style={styles.restRow}>
              <Text style={styles.restLabel}>
                {loadProgress.latestDate
                  ? `Última carga · ${loadProgress.latestDate}`
                  : "Última carga"}
              </Text>
              <Text style={styles.restValue}>{loadProgress.latestText}</Text>
            </View>
            {loadProgress.previousDeltaText ? (
              <Text style={styles.progressDelta}>
                {loadProgress.previousDeltaText}
              </Text>
            ) : null}
            {loadProgress.firstDeltaText ? (
              <Text style={styles.progressDelta}>
                {loadProgress.firstDeltaText}
              </Text>
            ) : null}
            <View style={styles.warmupsCard}>
              {loadProgress.recent.map((item) => (
                <View key={item.key} style={styles.restRow}>
                  <Text style={styles.warmupSubtext}>{item.date}</Text>
                  <Text style={styles.warmupText}>{item.loadText}</Text>
                </View>
              ))}
            </View>
          </TaurosCard>
        </TaurosSection>
      ) : null}

      {activationSource ? (
        <TaurosSection
          title="Activación muscular"
          subtitle="Imagen de referencia del ejercicio."
        >
          <TaurosCard style={styles.activationCard}>
            <View style={styles.activationImageWrap}>
              <Image
                source={{ uri: activationSource }}
                style={styles.activationImage}
                contentFit="contain"
              />
            </View>
          </TaurosCard>
        </TaurosSection>
      ) : null}

      <TaurosSection
        title="Enviar sugerencia"
        subtitle="Solo el formulario, sin historial visible."
      >
        <TaurosSuggestionForm
          type="EJERCICIO"
          entityId={displayExercise.id}
          title="Comentar ejercicio"
          subtitle="Escribe una mejora o una observación sobre este ejercicio."
        />
      </TaurosSection>
    </TaurosScreen>
  );
}

function WarmupRow({ warmup }: { warmup: TaurosWarmup }) {
  return (
    <View style={styles.warmupRow}>
      <Text style={styles.warmupIndex}>C{warmup.orden}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.warmupText}>
          {formatExerciseVolume(
            warmup.series,
            warmup.repeticiones,
            warmup.tiempoSegundos,
          )}
        </Text>
        <Text style={styles.warmupSubtext}>
          Intensidad: {warmup.intensidad || "-"}
        </Text>
      </View>
    </View>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

function parseIntervalsFromSeries(series?: string | number | null) {
  if (series === undefined || series === null) {
    return 3;
  }

  const seriesStr = typeof series === "number" ? String(series) : series;
  const numbers =
    seriesStr
      ?.match(/\d+/g)
      ?.map(Number)
      ?.filter((value) => Number.isFinite(value)) ?? [];

  if (!numbers.length) {
    return 3;
  }

  return Math.max(1, numbers[0]);
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatExerciseVolume(
  series: string | number | null | undefined,
  reps: string | number | null | undefined,
  tiempoSegundos?: number | null,
) {
  const parsedSeries = Number(series);
  const safeSeries =
    Number.isFinite(parsedSeries) && parsedSeries > 0
      ? parsedSeries
      : String(series || "1");

  if (Number.isFinite(Number(tiempoSegundos)) && Number(tiempoSegundos) > 0) {
    return `${safeSeries} series · ${formatDuration(Number(tiempoSegundos))}`;
  }

  return `${safeSeries} series · ${String(reps || "-")} reps`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0 seg";
  }

  if (seconds < 60) {
    return `${seconds} seg`;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs ? `${mins} min ${secs} seg` : `${mins} min`;
}

const styles = StyleSheet.create({
  emptyText: { color: "#fff", fontWeight: "700" },
  heroCard: { gap: 14 },
  heroVisualStack: { gap: 14 },
  heroInfo: { gap: 12 },
  exerciseTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  exerciseMeta: { color: "#a8a8a8", fontSize: 13, lineHeight: 18 },
  machineBadge: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    gap: 4,
  },
  machineBadgeLabel: { color: "#f4ae1a", fontSize: 12, fontWeight: "800" },
  machineBadgeValue: { color: "#fff", fontSize: 13, fontWeight: "700" },
  compactCard: { gap: 14 },
  fieldRow: { gap: 8 },
  exerciseGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  infoPill: {
    flexBasis: "31%",
    minWidth: 96,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#272727",
    gap: 6,
  },
  infoPillLabel: { color: "#a0a0a0", fontSize: 12 },
  infoPillValue: { color: "#fff", fontWeight: "800", fontSize: 13 },
  warmupsCard: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2b2b2b",
  },
  warmupsTitle: { color: "#fff", fontWeight: "800", fontSize: 13 },
  warmupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  warmupIndex: {
    color: "#f4ae1a",
    fontWeight: "900",
    width: 30,
    textAlign: "center",
  },
  warmupText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  warmupSubtext: { color: "#a8a8a8", marginTop: 2, fontSize: 12 },
  noticeCard: { gap: 8, borderWidth: 1 },
  noticeCardAccent: {
    borderColor: "rgba(244, 174, 26, 0.35)",
    backgroundColor: "#16110a",
  },
  noticeCardSuccess: {
    borderColor: "rgba(69, 196, 111, 0.35)",
    backgroundColor: "#0f1710",
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  noticeTitle: { color: "#fff", fontSize: 15, fontWeight: "900", flex: 1 },
  noticeBody: { color: "#d7d7d7", fontSize: 13, lineHeight: 18 },
  inputLabel: { color: "#fff", fontWeight: "800", fontSize: 13 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#353535",
    backgroundColor: "#0f0f0f",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  intervalsCard: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2b2b2b",
  },
  intervalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intervalTitle: { color: "#fff", fontWeight: "800", fontSize: 13 },
  intervalCounter: { color: "#f4ae1a", fontWeight: "900" },
  intervalDots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  intervalDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#3a3a3a",
  },
  intervalDotDone: { backgroundColor: "#f4ae1a" },
  restRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restLabel: { color: "#d0d0d0", fontWeight: "700" },
  restValue: { color: "#fff", fontWeight: "900", fontSize: 16 },
  progressDelta: { color: "#f4ae1a", fontWeight: "800", fontSize: 13 },
  activationCard: {
    padding: 12,
    gap: 0,
    alignItems: "stretch",
  },
  activationImageWrap: {
    width: "100%",
    height: 320,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  activationImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
});
