import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TaurosAuthCard } from "@/components/tauros-auth-card";
import {
    TaurosCard,
    TaurosInputButton,
    TaurosScreen,
    TaurosStat,
} from "@/components/tauros-ui";
import { useTaurosBackend } from "@/lib/tauros-backend";
import {
    mapBackendEvents,
    mapBackendPlans,
    pickLatestAssignedPlan,
} from "@/lib/tauros-mappers";
import { useTaurosSession } from "@/lib/tauros-session";

const MOTIVATIONS = [
  "Un entrenamiento más te acerca a tu mejor versión.",
  "La constancia vence al impulso.",
  "Hoy suma más que ayer.",
  "Tu progreso se construye repetición a repetición.",
  "La disciplina transforma intención en resultados.",
];

function pickMotivation() {
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
}

export default function HomeScreen() {
  const { token, user, persistentWeight } = useTaurosSession();
  const { plans, events, loading } = useTaurosBackend();
  const [motivation] = useState(() => pickMotivation());

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Tauros</Text>
          <Text style={styles.pageSubtitle}>
            Ingresa para ver tu rutina asignada, eventos activos y horarios del
            gimnasio.
          </Text>
        </View>
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  if (loading) {
    return (
      <TaurosScreen>
        <TaurosCard>
          <Text style={styles.loadingText}>Cargando datos.</Text>
        </TaurosCard>
      </TaurosScreen>
    );
  }

  const displayPlans = mapBackendPlans(plans, user?.userId);
  const displayEvents = mapBackendEvents(events).filter(
    (event) => event.activo,
  );
  const assignedPlans = displayPlans.filter(
    (plan) => !plan.esPlantilla && plan.activo,
  );
  const latestPlan = pickLatestAssignedPlan(assignedPlans);
  const latestDay = latestPlan?.dias?.[0] || null;
  const latestExercises = latestDay?.ejercicios || [];
  const completedExercises = latestExercises.filter(
    (exercise) => exercise.completado,
  ).length;
  const progress = latestExercises.length
    ? Math.round((completedExercises / latestExercises.length) * 100)
    : 0;

  return (
    <TaurosScreen>
      <View style={styles.topLogoWrap}>
        <Image
          source={require("../../assets/images/tauros-logo.png")}
          style={styles.topLogo}
          contentFit="contain"
        />
      </View>

      <TaurosCard style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroTitle}>Hola, {user?.nombre ?? "atleta"}</Text>
        </View>
        <Text style={styles.motivationText}>{motivation}</Text>

        <View style={styles.heroStatsGrid}>
          <TaurosStat
            label="Rutina"
            value={latestPlan?.nombre ?? "Sin plan"}
            icon={
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={16}
                color="#f4ae1a"
              />
            }
          />
          <TaurosStat
            label="Avance"
            value={`${progress}%`}
            icon={
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={16}
                color="#f4ae1a"
              />
            }
          />
          <TaurosStat
            label="Peso"
            value={persistentWeight ? `${persistentWeight} kg` : "Pendiente"}
            icon={
              <MaterialCommunityIcons
                name="scale-bathroom"
                size={16}
                color="#f4ae1a"
              />
            }
          />
          <TaurosStat
            label="Eventos"
            value={`${displayEvents.length}`}
            icon={
              <MaterialCommunityIcons
                name="calendar-star"
                size={16}
                color="#f4ae1a"
              />
            }
          />
        </View>

        <View style={styles.quickActions}>
          <TaurosInputButton
            href="/planes"
            label="Mi rutina"
            icon={
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={18}
                color="#f4ae1a"
              />
            }
          />
          <TaurosInputButton
            href="/ejercicios"
            label="Ejercicios"
            icon={
              <MaterialCommunityIcons
                name="dumbbell"
                size={18}
                color="#f4ae1a"
              />
            }
          />
          <TaurosInputButton
            href="/eventos"
            label="Eventos"
            icon={
              <MaterialCommunityIcons
                name="calendar-star"
                size={18}
                color="#f4ae1a"
              />
            }
          />
          <TaurosInputButton
            href="/horarios"
            label="Horario"
            icon={
              <MaterialCommunityIcons
                name="clock-time-five-outline"
                size={18}
                color="#f4ae1a"
              />
            }
          />
        </View>
      </TaurosCard>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: { gap: 16 },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "900", lineHeight: 32 },
  motivationText: {
    color: "#f4ae1a",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  topLogoWrap: { alignItems: "center", marginBottom: 12 },
  topLogo: { width: 120, height: 80 },
  heroStatsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  loadingText: { color: "#fff", fontWeight: "700" },
  pageTitle: { color: "#fff", fontSize: 30, fontWeight: "900" },
  pageSubtitle: { color: "#9e9e9e", lineHeight: 20 },
  topIntro: { gap: 8, marginBottom: 12 },
});
