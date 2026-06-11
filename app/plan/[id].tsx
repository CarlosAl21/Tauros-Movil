import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TaurosAuthCard } from "@/components/tauros-auth-card";
import {
    TaurosButton,
    TaurosCard,
    TaurosHeader,
    TaurosPill,
    TaurosProgressBar,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import { useTaurosBackend } from "@/lib/tauros-backend";
import type { BackendPlan } from "@/lib/tauros-backend";
import {
    mapBackendExercises,
    mapBackendPlans,
    pickLatestAssignedPlan,
} from "@/lib/tauros-mappers";
import { useTaurosSession } from "@/lib/tauros-session";
import { useOfflineRoutine } from "@/hooks/useOfflineRoutine";
import { TaurosSuggestionForm } from "../../components/tauros-suggestion-form";

export default function PlanDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; day?: string }>();
  const planId = Array.isArray(params.id) ? params.id[0] : params.id;
  const dayId = Array.isArray(params.day) ? params.day[0] : params.day;
  const { token, user } = useTaurosSession();
  const { exercises, plans, toggleRoutineExerciseCompletion } =
    useTaurosBackend();
  const { getRoutine } = useOfflineRoutine();
  const [markingKey, setMarkingKey] = useState<string | null>(null);

  // Cache-first: seed local state with any previously cached plan so the
  // screen is immediately usable while the network fetch runs in background.
  const [cachedPlan, setCachedPlan] = useState<BackendPlan | null>(null);
  useEffect(() => {
    if (!planId) return;
    getRoutine(planId)
      .then((entry) => {
        if (entry?.data) setCachedPlan(entry.data as BackendPlan);
      })
      .catch(() => {});
    // Only run on mount / when planId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Plan" onBack={() => router.replace("/planes")} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displayExercises = mapBackendExercises(exercises);
  // Merge live plans with the offline-cached plan so the screen renders
  // immediately even before the network request completes.
  const allRawPlans = cachedPlan
    ? [
        cachedPlan,
        ...plans.filter(
          (p) => p.planEntrenamientoId !== cachedPlan.planEntrenamientoId,
        ),
      ]
    : plans;
  const displayPlans = mapBackendPlans(allRawPlans, user?.userId);
  const latestAssignedPlan = pickLatestAssignedPlan(
    displayPlans.filter((item) => !item.esPlantilla && item.activo),
  );
  const plan =
    displayPlans.find((item) => item.id === planId) ||
    latestAssignedPlan ||
    displayPlans.find((item) => !item.esPlantilla) ||
    displayPlans[0];
  const selectedDay = plan?.dias.find((item) => item.id === dayId) ?? null;

  if (!plan) {
    return (
      <TaurosScreen>
        <TaurosHeader
          title="Plan no encontrado"
          onBack={() => router.replace("/planes")}
        />
        <TaurosCard>
          <Text style={styles.emptyText}>
            No se encontró el plan solicitado.
          </Text>
        </TaurosCard>
      </TaurosScreen>
    );
  }

  const visibleDays = selectedDay ? [selectedDay] : plan.dias;
  const totalExercises = visibleDays.reduce(
    (accumulator, day) => accumulator + day.ejercicios.length,
    0,
  );
  const completedExercises = visibleDays.reduce(
    (accumulator, day) =>
      accumulator +
      day.ejercicios.filter((exercise) => exercise.completado).length,
    0,
  );
  const progress = totalExercises
    ? Math.round((completedExercises / totalExercises) * 100)
    : 0;
  const nextPendingDayId = selectedDay
    ? null
    : (plan.dias.find((day) => !day.finalizada)?.id ?? null);

  const toggleExercise = async (
    dayId: string,
    exerciseId: string,
    rutinaEjercicioId?: string,
    autoNextExerciseId?: string,
    autoNextRutinaEjercicioId?: string,
  ) => {
    if (!rutinaEjercicioId) {
      return;
    }

    const currentDay = plan.dias.find((item) => item.id === dayId);
    const currentExercise = currentDay?.ejercicios.find(
      (item) =>
        item.exerciseId === exerciseId &&
        item.rutinaEjercicioId === rutinaEjercicioId,
    );

    try {
      setMarkingKey(rutinaEjercicioId);
      await toggleRoutineExerciseCompletion(rutinaEjercicioId);

      if (
        currentExercise &&
        !currentExercise.completado &&
        autoNextExerciseId
      ) {
        router.push({
          pathname: "/ejercicio/[id]",
          params: {
            id: autoNextExerciseId,
            planId: plan.id,
            day: dayId,
            routineId: autoNextRutinaEjercicioId || "",
          },
        });
      }
    } finally {
      setMarkingKey(null);
    }
  };

  return (
    <TaurosScreen>
      <TaurosHeader
        title={plan.nombre}
        subtitle={
          selectedDay
            ? `Día ${selectedDay.numeroDia} · ${selectedDay.nombre}`
            : plan.objetivo
        }
        onBack={() => router.replace("/planes")}
        right={
          <TaurosPill
            label={
              plan.completado
                ? "Completo"
                : plan.esPlantilla
                  ? "Plantilla"
                  : "Asignado"
            }
            tone={
              plan.completado
                ? "success"
                : plan.esPlantilla
                  ? "muted"
                  : "success"
            }
          />
        }
      />

      <TaurosCard style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{plan.descripcion}</Text>
            <Text style={styles.summarySubtitle}>
              {selectedDay
                ? "Estás viendo solo este día para que puedas entrenar sin distracciones."
                : "La app permite entrar a un día concreto para verlo en pantalla completa."}
            </Text>
          </View>
          <TaurosPill label={`${plan.duracionDias} dias`} tone="accent" />
        </View>

        <View style={styles.summaryTags}>
          <TaurosPill label={plan.objetivo} tone="blue" />
          <TaurosPill label={`Ejercicios: ${totalExercises}`} tone="muted" />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Avance de la rutina</Text>
            <Text style={styles.progressLabel}>{progress}%</Text>
          </View>
          <TaurosProgressBar value={progress} />
        </View>
      </TaurosCard>

      <TaurosSection
        title={selectedDay ? "Día seleccionado" : "Días del plan"}
        subtitle="Cada día abre su propia pantalla y muestra solo lo que corresponde."
      >
        {visibleDays.map((day) => {
          const dayCompleted = day.ejercicios.filter(
            (exercise) => exercise.completado,
          ).length;
          const dayProgress = day.ejercicios.length
            ? Math.round((dayCompleted / day.ejercicios.length) * 100)
            : 0;
          const isNextPendingDay = nextPendingDayId === day.id;

          return (
            <TaurosCard
              key={day.id}
              style={[
                styles.dayCard,
                isNextPendingDay ? styles.nextPendingDayCard : undefined,
              ]}
            >
              <View style={styles.dayHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>
                    Dia {day.numeroDia} · {day.nombre}
                  </Text>
                  <Text style={styles.daySubtitle}>{day.descripcion}</Text>
                </View>
                <TaurosPill
                  label={
                    day.finalizada
                      ? "Finalizado"
                      : `${dayCompleted}/${day.ejercicios.length}`
                  }
                  tone={day.finalizada ? "success" : "accent"}
                />
              </View>

              <TaurosProgressBar value={dayProgress} />

              <View style={styles.exerciseList}>
                {day.ejercicios.map((exercise) => {
                  const detail = displayExercises.find(
                    (item) => item.id === exercise.exerciseId,
                  );
                  const checked = Boolean(exercise.completado);
                  const isMarking = markingKey === exercise.rutinaEjercicioId;
                  const currentIndex = day.ejercicios.findIndex(
                    (item) =>
                      item.rutinaEjercicioId === exercise.rutinaEjercicioId,
                  );
                  const nextExercise =
                    currentIndex >= 0
                      ? day.ejercicios[currentIndex + 1]
                      : undefined;

                  return (
                    <View
                      key={exercise.exerciseId + day.id}
                      style={styles.exerciseRow}
                    >
                      <Pressable
                        onPress={() =>
                          toggleExercise(
                            day.id,
                            exercise.exerciseId,
                            exercise.rutinaEjercicioId,
                            nextExercise?.exerciseId,
                            nextExercise?.rutinaEjercicioId,
                          )
                        }
                        style={styles.checkbox}
                        disabled={isMarking}
                      >
                        <MaterialCommunityIcons
                          name={
                            checked
                              ? "check-circle"
                              : "checkbox-blank-circle-outline"
                          }
                          size={22}
                          color={checked ? "#45c46f" : "#f4ae1a"}
                        />
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseTitle}>
                          {detail?.nombre ?? exercise.exerciseId}
                        </Text>
                        {detail?.maquina ? (
                          <Text style={styles.exerciseMachine}>
                            {`Maquina #${detail.maquina.numero}`}
                            {"\n"}
                            {detail.maquina.nombre}
                          </Text>
                        ) : null}
                        <Text style={styles.exerciseMeta}>
                          {formatExerciseVolume(
                            exercise.series,
                            exercise.repeticiones,
                            exercise.tiempoSegundos,
                          )}
                        </Text>
                        <Text style={styles.exerciseCharge}>
                          Carga: {exercise.carga || "-"}
                        </Text>
                        <Text style={styles.exerciseNotes}>
                          {exercise.notas}
                        </Text>
                        {exercise.calentamientos?.length ? (
                          <View style={styles.warmupsBlock}>
                            <Text style={styles.warmupsTitle}>
                              Calentamientos
                            </Text>
                            {exercise.calentamientos
                              .slice()
                              .sort((left, right) => left.orden - right.orden)
                              .map((warmup) => (
                                <Text key={warmup.id} style={styles.warmupItem}>
                                  C{warmup.orden}:{" "}
                                  {formatExerciseVolume(
                                    warmup.series,
                                    warmup.repeticiones,
                                    warmup.tiempoSegundos,
                                  )}{" "}
                                  · Intensidad: {warmup.intensidad || "-"}
                                </Text>
                              ))}
                          </View>
                        ) : null}
                        {isMarking ? (
                          <Text style={styles.loadingHint}>
                            Actualizando...
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        style={styles.detailButton}
                        onPress={() =>
                          router.push({
                            pathname: "/ejercicio/[id]",
                            params: {
                              id: exercise.exerciseId,
                              planId: plan.id,
                              day: day.id,
                              routineId: exercise.rutinaEjercicioId || "",
                            },
                          })
                        }
                      >
                        <Text style={styles.detailButtonText}>Ver</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <TaurosButton
                label={day.finalizada ? "Dia finalizado" : "Dia en curso"}
                disabled
              />
            </TaurosCard>
          );
        })}
      </TaurosSection>

      {selectedDay ? (
        <TaurosSection
          title="Rutina completa"
          subtitle="Vuelve a la vista general para cambiar de día."
        >
          <TaurosButton
            label="Ver todos los días"
            onPress={() =>
              router.push({ pathname: "/plan/[id]", params: { id: plan.id } })
            }
          />
        </TaurosSection>
      ) : null}

      <TaurosSection
        title="Enviar sugerencia"
        subtitle="Solo el formulario para que el usuario aporte mejoras."
      >
        <TaurosSuggestionForm
          type="RUTINA"
          entityId={selectedDay?.id ?? plan.id}
          title="Comentar rutina"
          subtitle="Escribe una sugerencia para esta rutina."
        />
      </TaurosSection>
    </TaurosScreen>
  );
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
    return "0s";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs ? `${mins}m ${secs}s` : `${mins}m`;
}

const styles = StyleSheet.create({
  emptyText: { color: "#fff", fontWeight: "700" },
  summaryCard: { gap: 14 },
  summaryTopRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  summaryTitle: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },
  summarySubtitle: {
    color: "#a1a1a1",
    marginTop: 6,
    lineHeight: 18,
    fontSize: 12,
  },
  summaryTags: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  progressBlock: { gap: 10 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { color: "#d1d1d1", fontWeight: "700" },
  dayCard: { gap: 14 },
  dayHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  dayTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  daySubtitle: { color: "#9d9d9d", marginTop: 4, fontSize: 12, lineHeight: 18 },
  exerciseList: { gap: 10 },
  exerciseRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#272727",
  },
  checkbox: { paddingTop: 2 },
  exerciseTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  exerciseMachine: {
    color: "#e0e0e0",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseMeta: {
    color: "#f4ae1a",
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseCharge: {
    color: "#bdbdbd",
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseNotes: {
    color: "#a7a7a7",
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
  },
  warmupsBlock: {
    marginTop: 8,
    gap: 4,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#131313",
    borderWidth: 1,
    borderColor: "#262626",
  },
  warmupsTitle: { color: "#f4ae1a", fontWeight: "800", fontSize: 11 },
  warmupItem: { color: "#cfcfcf", fontSize: 11, lineHeight: 16 },
  loadingHint: {
    color: "#f4ae1a",
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
  },
  detailButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#303030",
  },
  detailButtonText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  nextPendingDayCard: { borderColor: "#f4ae1a", borderWidth: 1.5 },
});
