import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    TaurosCard,
    TaurosPill,
    TaurosProgressBar,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import { useTaurosBackend } from "@/lib/tauros-backend";
import type { BackendPlan, BackendExercise } from "@/lib/tauros-backend";
import { mapBackendPlans, pickLatestAssignedPlan } from "@/lib/tauros-mappers";
import { useTaurosSession } from "@/lib/tauros-session";
import { useOfflineRoutine } from "@/hooks/useOfflineRoutine";

const OFFLINE_PLANS_KEY = "offline_plans_list";
const OFFLINE_EXERCISES_KEY = "offline_exercises_catalog";

export default function PlansScreen() {
  const router = useRouter();
  const { user } = useTaurosSession();
  const { plans, exercises, refresh, error } = useTaurosBackend();
  const { saveRoutineForOffline } = useOfflineRoutine();
  const [isOffline, setIsOffline] = useState(false);
  const [offlinePlans, setOfflinePlans] = useState<BackendPlan[]>([]);

  // Auto-save fetched plans to AsyncStorage (fire-and-forget)
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    if (!plans.length) return;
    const key = plans.map((p) => p.planEntrenamientoId).join(",");
    if (key === lastSavedRef.current) return;
    lastSavedRef.current = key;

    // Persist plan list for offline access
    AsyncStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(plans)).catch(() => {});

    // Persist each individual plan for detail cache-first reads
    for (const plan of plans) {
      saveRoutineForOffline(plan.planEntrenamientoId, plan).catch(() => {});
    }
  }, [plans, saveRoutineForOffline]);

  // Cache the exercises catalog so detail screen has names/machine info offline
  const lastSavedExercisesRef = useRef<number>(0);
  useEffect(() => {
    if (!exercises.length) return;
    if (exercises.length === lastSavedExercisesRef.current) return;
    lastSavedExercisesRef.current = exercises.length;
    AsyncStorage.setItem(OFFLINE_EXERCISES_KEY, JSON.stringify(exercises)).catch(() => {});
  }, [exercises]);

  // When network fetch fails, fall back to locally cached plans
  useEffect(() => {
    if (!error) {
      setIsOffline(false);
      return;
    }
    AsyncStorage.getItem(OFFLINE_PLANS_KEY)
      .then((raw) => {
        if (raw) {
          setOfflinePlans(JSON.parse(raw) as BackendPlan[]);
          setIsOffline(true);
        }
      })
      .catch(() => {});
  }, [error]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const activePlans = isOffline ? offlinePlans : plans;
  const displayPlans = mapBackendPlans(activePlans, user?.userId);
  const assignedPlans = displayPlans.filter(
    (plan) => !plan.esPlantilla && plan.activo,
  );
  const latestPlan = pickLatestAssignedPlan(assignedPlans);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Rutinas</Text>
        {isOffline ? (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons name="wifi-off" size={14} color="#f4ae1a" />
            <Text style={styles.offlineText}>Modo sin conexión</Text>
          </View>
        ) : null}
      </View>

      {latestPlan ? (
        <TaurosSection
          title="Tu rutina actual"
          subtitle="Toca un día para ver solo esa pantalla."
        >
          <TaurosCard style={styles.planCard}>
            <View style={styles.planHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{latestPlan.nombre}</Text>
                <Text style={styles.planSubtitle}>
                  {latestPlan.descripcion}
                </Text>
              </View>
              <View style={styles.planStatusBlock}>
                <MaterialCommunityIcons
                  name={
                    latestPlan.completado
                      ? "check-decagram"
                      : "clipboard-text-outline"
                  }
                  size={18}
                  color={latestPlan.completado ? "#45c46f" : "#f4ae1a"}
                />
                <Text style={styles.planStatusText}>
                  {latestPlan.completado ? "Completo" : "En curso"}
                </Text>
              </View>
            </View>

            <View style={styles.planMetaRow}>
              <TaurosPill
                label={`${latestPlan.duracionDias} días`}
                tone="accent"
              />
              <TaurosPill
                label={latestPlan.completado ? "Plan completo" : "Asignada"}
                tone={latestPlan.completado ? "success" : "muted"}
              />
            </View>

            <View style={styles.daysList}>
              {latestPlan.dias.map((day) => {
                const completed = day.ejercicios.filter(
                  (exercise) => exercise.completado,
                ).length;
                const progress = day.ejercicios.length
                  ? Math.round((completed / day.ejercicios.length) * 100)
                  : 0;

                return (
                  <Pressable
                    key={day.id}
                    onPress={() =>
                      router.push({
                        pathname: "/plan/[id]",
                        params: { id: latestPlan.id, day: day.id },
                      })
                    }
                    style={styles.dayCard}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayTitle}>
                        Día {day.numeroDia} · {day.nombre}
                      </Text>
                      <Text style={styles.daySubtitle}>{day.descripcion}</Text>
                      <View style={{ marginTop: 10 }}>
                        <TaurosProgressBar value={progress} />
                      </View>
                    </View>
                    <View style={styles.dayCountBox}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color="#f4ae1a"
                      />
                      <Text style={styles.dayCount}>
                        {day.ejercicios.length}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </TaurosCard>
        </TaurosSection>
      ) : (
        <TaurosCard>
          <Text style={styles.emptyText}>
            No tienes una rutina asignada todavía.
          </Text>
        </TaurosCard>
      )}
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  topIntro: { gap: 8 },
  pageTitle: { color: "#fff", fontSize: 30, fontWeight: "900" },
  pageSubtitle: { color: "#9e9e9e", lineHeight: 20 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(244, 174, 26, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(244, 174, 26, 0.25)",
    alignSelf: "flex-start",
  },
  offlineText: { color: "#f4ae1a", fontSize: 12, fontWeight: "700" },
  planCard: { gap: 14 },
  planHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  planSubtitle: {
    color: "#a0a0a0",
    marginTop: 4,
    lineHeight: 18,
    fontSize: 13,
  },
  planStatusBlock: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(244, 174, 26, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(244, 174, 26, 0.18)",
  },
  planStatusText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  planMetaRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  daysList: { gap: 10 },
  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#272727",
  },
  dayTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  daySubtitle: { color: "#9f9f9f", marginTop: 4, lineHeight: 18, fontSize: 12 },
  dayCountBox: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(244, 174, 26, 0.12)",
  },
  dayCount: { color: "#f4ae1a", fontWeight: "900" },
  emptyText: { color: "#fff", fontWeight: "700" },
});
