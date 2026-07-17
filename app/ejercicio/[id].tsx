import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    AppState,
    type AppStateStatus,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    Vibration,
    View,
} from "react-native";

import { TaurosAuthCard } from "@/components/tauros-auth-card";
import {
    TaurosButton,
    TaurosCard,
    TaurosHeader,
    TaurosPill,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import { useTaurosBackend } from "@/lib/tauros-backend";
import type { BackendExercise, BackendPlan } from "@/lib/tauros-backend";
import {
    findDisplayExerciseById,
    findPlanExercise,
    mapBackendExercises,
    mapBackendPlans,
} from "@/lib/tauros-mappers";
import { useTaurosSession } from "@/lib/tauros-session";
import { TaurosSuggestionForm } from "../../components/tauros-suggestion-form";

const VideoViewComponent = VideoView as unknown as ComponentType<{
  player: ReturnType<typeof useVideoPlayer>;
  style: object;
  nativeControls?: boolean;
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}>;

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

  const { token, user, getExerciseWeight, setExerciseWeight } =
    useTaurosSession();
  const { exercises, plans, toggleRoutineExerciseCompletion } =
    useTaurosBackend();

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
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [warmupRestSecondsLeft, setWarmupRestSecondsLeft] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [warmupRestEndsAt, setWarmupRestEndsAt] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const previousRestSecondsRef = useRef(0);
  const previousWarmupRestSecondsRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const restWentBackgroundRef = useRef(false);
  const warmupWentBackgroundRef = useRef(false);
  const notificationsReadyRef = useRef(false);
  const restNotificationIdRef = useRef<string | null>(null);
  const warmupRestNotificationIdRef = useRef<string | null>(null);
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
  const assignedPlans = displayPlans.filter(
    (plan) => !plan.esPlantilla && plan.activo,
  );
  const activePlan =
    (planId ? displayPlans.find((plan) => plan.id === planId) : null) ||
    assignedPlans[assignedPlans.length - 1] ||
    displayPlans[0];
  const routineExercise = findPlanExercise(activePlan, exerciseId);
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
      parseRestToSeconds(displayExercise?.descanso || "01:00"),
  );
  const restEndTitle = `Descanso terminado · ${displayExercise?.nombre || ""}`;
  const warmupRestEndTitle = `Calentamiento terminado · ${
    displayExercise?.nombre || ""
  }`;
  const restEndBody = displayTimedSeconds
    ? "Ya puedes continuar con el siguiente intervalo."
    : "Ya puedes continuar con la siguiente repetición.";
  const warmupRestEndBody = "Continua con el siguiente calentamiento.";

  useEffect(() => {
    setCompleted(Boolean(routineExercise?.exercise.completado));
  }, [routineExercise?.exercise.completado]);

  useEffect(() => {
    const loadSavedCharge = async () => {
      if (!displayExercise?.id) {
        return;
      }

      const savedCharge = await getExerciseWeight(displayExercise.id);
      if (savedCharge > 0) {
        setCarga(String(savedCharge));
        return;
      }

      const fallbackCharge =
        routineExercise?.exercise.carga || displayExercise.cargaSugerida || "";
      const parsedCharge = Number(
        String(fallbackCharge)
          .replace(/[^0-9.,]/g, "")
          .replace(",", "."),
      );
      setCarga(
        Number.isFinite(parsedCharge) && parsedCharge > 0
          ? String(parsedCharge)
          : "",
      );
    };

    void loadSavedCharge();
  }, [
    displayExercise?.id,
    displayExercise?.cargaSugerida,
    getExerciseWeight,
    routineExercise?.exercise.carga,
  ]);

  useEffect(() => {
    if (restEndsAt === null) {
      return;
    }

    const updateRest = () => {
      setRestSecondsLeft(
        Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)),
      );
    };

    updateRest();
    const timer = setInterval(updateRest, 1000);

    return () => clearInterval(timer);
  }, [restEndsAt]);

  useEffect(() => {
    if (warmupRestEndsAt === null) {
      return;
    }

    const updateWarmupRest = () => {
      setWarmupRestSecondsLeft(
        Math.max(0, Math.ceil((warmupRestEndsAt - Date.now()) / 1000)),
      );
    };

    updateWarmupRest();
    const timer = setInterval(updateWarmupRest, 1000);

    return () => clearInterval(timer);
  }, [warmupRestEndsAt]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        const wasInactive = appStateRef.current !== "active";
        appStateRef.current = nextAppState;

        if (nextAppState !== "active") {
          if (restEndsAt !== null) {
            restWentBackgroundRef.current = true;
          }

          if (warmupRestEndsAt !== null) {
            warmupWentBackgroundRef.current = true;
          }

          return;
        }

        if (wasInactive && restEndsAt !== null) {
          setRestSecondsLeft(
            Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)),
          );
        }

        if (wasInactive && warmupRestEndsAt !== null) {
          setWarmupRestSecondsLeft(
            Math.max(0, Math.ceil((warmupRestEndsAt - Date.now()) / 1000)),
          );
        }
      },
    );

    return () => subscription.remove();
  }, [restEndsAt, warmupRestEndsAt]);

  useEffect(() => {
    if (previousRestSecondsRef.current > 0 && restSecondsLeft === 0) {
      void cancelScheduledNotification(restNotificationIdRef);
      if (!restWentBackgroundRef.current) {
        showScreenNotice(restEndTitle, restEndBody, "accent");
      }
      restWentBackgroundRef.current = false;
    }

    previousRestSecondsRef.current = restSecondsLeft;
  }, [displayTimedSeconds, restSecondsLeft]);

  useEffect(() => {
    if (
      previousWarmupRestSecondsRef.current > 0 &&
      warmupRestSecondsLeft === 0
    ) {
      void cancelScheduledNotification(warmupRestNotificationIdRef);
      if (!warmupWentBackgroundRef.current) {
        showScreenNotice(warmupRestEndTitle, warmupRestEndBody, "success");
      }
      warmupWentBackgroundRef.current = false;
    }

    previousWarmupRestSecondsRef.current = warmupRestSecondsLeft;
  }, [warmupRestSecondsLeft]);

  useEffect(() => {
    setCompletedWarmups(0);
    setWarmupRestSecondsLeft(0);
    setWarmupRestEndsAt(null);
    void cancelScheduledNotification(warmupRestNotificationIdRef);
    warmupWentBackgroundRef.current = false;
    previousWarmupRestSecondsRef.current = 0;
    setCompletedIntervals(0);
    setRestSecondsLeft(0);
    setRestEndsAt(null);
    void cancelScheduledNotification(restNotificationIdRef);
    restWentBackgroundRef.current = false;
    previousRestSecondsRef.current = 0;
  }, [activeRoutineId, exerciseId]);

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
    : displayExercise?.series || "1 series";
  const chargeText = carga
    ? `${carga} kg`
    : routineExercise?.exercise.carga ||
      displayExercise?.cargaSugerida ||
      "0.0 kg";
  const notesText =
    nota || routineExercise?.exercise.notas || displayExercise?.notas || "";
  const activationSource =
    displayExercise?.linkAM || displayExercise?.thumbnail;

  const onCompleteInterval = () => {
    if (completedIntervals >= intervalsTarget) {
      return;
    }

    setCompletedIntervals((current) => current + 1);
    restWentBackgroundRef.current = false;
    setRestEndsAt(Date.now() + restDuration * 1000);
    setRestSecondsLeft(restDuration);
    void scheduleRestNotification(
      restNotificationIdRef,
      restEndTitle,
      restEndBody,
      restDuration,
    );
  };

  const onCompleteWarmup = () => {
    if (completedWarmups >= sortedWarmups.length) {
      return;
    }

    setCompletedWarmups((current) => current + 1);
    warmupWentBackgroundRef.current = false;
    setWarmupRestEndsAt(Date.now() + restDuration * 1000);
    setWarmupRestSecondsLeft(restDuration);
    void scheduleRestNotification(
      warmupRestNotificationIdRef,
      warmupRestEndTitle,
      warmupRestEndBody,
      restDuration,
    );
  };

  const onCompleteExercise = async () => {
    if (!activeRoutineId) {
      setCompleted((current) => !current);
      return;
    }

    try {
      setCompleting(true);
      const parsedCharge = Number(carga.replace(",", "."));
      if (Number.isFinite(parsedCharge) && parsedCharge > 0) {
        await setExerciseWeight(
          displayExercise?.id || activeRoutineId,
          parsedCharge,
        );
      }

      const wasCompleted = completed;
      await toggleRoutineExerciseCompletion(activeRoutineId);
      const nowCompleted = !wasCompleted;
      setCompleted(nowCompleted);

      if (nowCompleted) {
        void notifyWithSoundAndVibration(
          "Ejercicio completado",
          "La carga quedó guardada para tu próximo ingreso.",
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
        router.push({
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

      if (activePlan?.id) {
        router.push({ pathname: "/plan/[id]", params: { id: activePlan.id } });
      }
    } finally {
      setCompleting(false);
    }
  };

  const scheduleRestNotification = async (
    notificationIdRef: { current: string | null },
    title: string,
    body: string,
    durationSeconds: number,
  ) => {
    const isExpoGo =
      Constants.appOwnership === "expo" ||
      Constants.executionEnvironment === "storeClient";
    if (isExpoGo || durationSeconds <= 0) {
      return;
    }

    try {
      const Notifications = await import("expo-notifications");

      if (!notificationsReadyRef.current) {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status !== "granted") {
          const requested = await Notifications.requestPermissionsAsync();
          if (requested.status !== "granted") {
            return;
          }
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync(
            "tauros-rest-reminder",
            {
              name: "Recordatorio de descanso",
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 150, 250],
              sound: "default",
              lockscreenVisibility:
                Notifications.AndroidNotificationVisibility.PUBLIC,
            },
          );
        }

        notificationsReadyRef.current = true;
      }

      if (notificationIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(
          notificationIdRef.current,
        );
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + durationSeconds * 1000),
        },
      });

      notificationIdRef.current = notificationId;
    } catch (_error) {
      return;
    }
  };

  const cancelScheduledNotification = async (notificationIdRef: {
    current: string | null;
  }) => {
    if (!notificationIdRef.current) {
      return;
    }

    try {
      const Notifications = await import("expo-notifications");
      await Notifications.cancelScheduledNotificationAsync(
        notificationIdRef.current,
      );
    } catch (_error) {
      // Ignore cancellation failures when the notification already fired.
    } finally {
      notificationIdRef.current = null;
    }
  };

  const showScreenNotice = (
    title: string,
    body: string,
    tone: "accent" | "success",
  ) => {
    Vibration.vibrate([0, 180, 80, 180]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScreenNotice({ title, body, tone });
  };

  const notifyWithSoundAndVibration = async (title: string, body: string) => {
    Vibration.vibrate([0, 250, 150, 250]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const isExpoGo =
      Constants.appOwnership === "expo" ||
      Constants.executionEnvironment === "storeClient";
    if (isExpoGo) {
      Alert.alert(title, body);
      return;
    }

    try {
      const Notifications = await import("expo-notifications");

      if (!notificationsReadyRef.current) {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status !== "granted") {
          const requested = await Notifications.requestPermissionsAsync();
          if (requested.status !== "granted") {
            Alert.alert(title, body);
            return;
          }
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync(
            "tauros-rest-reminder",
            {
              name: "Recordatorio de descanso",
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 150, 250],
              sound: "default",
              lockscreenVisibility:
                Notifications.AndroidNotificationVisibility.PUBLIC,
            },
          );
        }

        notificationsReadyRef.current = true;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
        },
        trigger: null,
      });
    } catch (_error) {
      Alert.alert(title, body);
    }
  };

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Ejercicio" onBack={() => router.back()} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  if (!displayExercise) {
    return (
      <TaurosScreen>
        <TaurosHeader
          title="Ejercicio no encontrado"
          onBack={() => router.back()}
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
        subtitle={`${displayExercise.categoria} · ${displayExercise.tipo}`}
        onBack={() => {
          const destPlanId = planId || activePlan?.id;
          const destDayId = dayId || targetDay?.id;
          if (destPlanId && destDayId) {
            router.push({
              pathname: "/plan/[id]",
              params: { id: destPlanId, day: destDayId },
            });
            return;
          }

          router.back();
        }}
        right={
          <TaurosPill
            label={completed ? "Hecho" : "Pendiente"}
            tone={completed ? "success" : "accent"}
          />
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
          <View style={styles.heroVideoWrap}>
            <ExerciseVideo source={displayExercise.linkVideo} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.exerciseTitle}>{displayExercise.nombre}</Text>
            <Text style={styles.exerciseMeta}>
              {displayExercise.categoria} · {displayExercise.tipo}
            </Text>
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
                <View key={warmup.id} style={styles.warmupRow}>
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
              ))}

              <View style={styles.restRow}>
                <Text style={styles.restLabel}>Descanso calentamiento</Text>
                <Text style={styles.restValue}>
                  {formatSeconds(warmupRestSecondsLeft)}
                </Text>
              </View>

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
            <Text style={styles.inputLabel}>Carga usada en este ejercicio</Text>
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

function ExerciseVideo({ source }: { source: string }) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    (videoPlayer as typeof videoPlayer & { volume?: number }).volume = 0;
    videoPlayer.play();
  });

  return (
    <VideoViewComponent
      player={player}
      style={styles.video}
      nativeControls={false}
      contentFit="cover"
    />
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

function parseRestToSeconds(rest: string) {
  const [minsRaw, secsRaw] = rest.split(":");
  const mins = Number(minsRaw || 0);
  const secs = Number(secsRaw || 0);

  if (!Number.isFinite(mins) || !Number.isFinite(secs)) {
    return 60;
  }

  return Math.max(1, mins * 60 + secs);
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
  heroVideoWrap: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
  },
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
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
