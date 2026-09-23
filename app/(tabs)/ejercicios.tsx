import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ExerciseMedia } from "@/components/exercise-media";
import { TaurosAuthCard } from "@/components/tauros-auth-card";
import {
    TaurosCard,
    TaurosPill,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import { useTaurosBackend } from "@/lib/tauros-backend";
import { mapBackendExercises } from "@/lib/tauros-mappers";
import { useTaurosSession } from "@/lib/tauros-session";

export default function ExercisesScreen() {
  const router = useRouter();
  const { token } = useTaurosSession();
  const { exercises } = useTaurosBackend();

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Ejercicios</Text>
          <Text style={styles.pageSubtitle}>
            Inicia sesión para ver el catálogo real del backend.
          </Text>
        </View>
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displayExercises = mapBackendExercises(exercises);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Ejercicios</Text>
      </View>

      <TaurosSection title="Catálogo disponible">
        {displayExercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            onPress={() =>
              router.push({
                pathname: "/ejercicio/[id]",
                params: { id: exercise.id },
              })
            }
          >
            <TaurosCard style={styles.exerciseCard}>
              <ExerciseMedia
                source={exercise.linkVideo}
                fallback={exercise.thumbnail}
                showPlayOverlay
              />
              <View style={styles.contentBlock}>
                <View style={styles.exerciseTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseTitle}>{exercise.nombre}</Text>
                    {exercise.categoria || exercise.tipo ? (
                      <Text style={styles.exerciseMeta}>
                        {[exercise.categoria, exercise.tipo]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color="#f4ae1a"
                  />
                </View>

                {exercise.categoria || exercise.tipo ? (
                  <View style={styles.tagsRow}>
                    {exercise.categoria ? (
                      <TaurosPill
                        label={`Categoria: ${exercise.categoria}`}
                        tone="blue"
                      />
                    ) : null}
                    {exercise.tipo ? (
                      <TaurosPill label={exercise.tipo} tone="muted" />
                    ) : null}
                  </View>
                ) : null}

                {exercise.maquina ? (
                  <View style={styles.machineBlock}>
                    <View style={styles.machineNumberBox}>
                      <Text style={styles.machineNumber}>
                        {exercise.maquina.numero}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.machineTitle}>Máquina</Text>
                      <Text style={styles.machineText}>
                        {`${exercise.maquina.nombre} ${exercise.maquina.numero}`}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Series, rest and load belong to a routine, not the catalog. */}
                {exercise.tiempoSegundos ? (
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Tiempo</Text>
                      <Text style={styles.statValue}>
                        {formatDuration(exercise.tiempoSegundos)}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </TaurosCard>
          </Pressable>
        ))}
      </TaurosSection>
    </TaurosScreen>
  );
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
  topIntro: { gap: 8 },
  pageTitle: { color: "#fff", fontSize: 30, fontWeight: "900" },
  pageSubtitle: { color: "#9e9e9e", lineHeight: 20 },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#323232",
    marginTop: 4,
  },
  backButtonText: { color: "#fff", fontWeight: "800" },
  exerciseCard: { gap: 14 },
  contentBlock: { gap: 14 },
  exerciseTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  exerciseTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  exerciseMeta: { color: "#a0a0a0", marginTop: 4, fontSize: 13 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  machineBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#272727",
  },
  machineNumberBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 174, 26, 0.12)",
  },
  machineNumber: { color: "#f4ae1a", fontWeight: "900" },
  machineTitle: { color: "#fff", fontWeight: "700", fontSize: 12 },
  machineText: { color: "#b3b3b3", marginTop: 4, lineHeight: 18, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  statItem: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#272727",
  },
  statLabel: { color: "#a0a0a0", fontSize: 12 },
  statValue: { color: "#fff", fontWeight: "800", marginTop: 4 },
});
