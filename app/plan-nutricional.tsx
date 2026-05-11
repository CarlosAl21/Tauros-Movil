import { useRouter } from "expo-router";
import {
    openBrowserAsync,
    WebBrowserPresentationStyle,
} from "expo-web-browser";
import { Alert, StyleSheet, Text, View } from "react-native";

import { TaurosAuthCard } from "@/components/tauros-auth-card";
import {
    TaurosButton,
    TaurosCard,
    TaurosHeader,
    TaurosPill,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import {
    type BackendNutritionPlan,
    useTaurosBackend,
} from "@/lib/tauros-backend";
import { useTaurosSession } from "@/lib/tauros-session";

export default function NutritionPlanScreen() {
  const router = useRouter();
  const { token } = useTaurosSession();
  const { nutritionPlans } = useTaurosBackend();
  const latestPlan = pickLatestNutritionPlan(nutritionPlans);

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Plan nutricional" onBack={() => router.back()} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const openLatestPlan = async () => {
    if (!latestPlan) {
      return;
    }

    const targetUrl =
      latestPlan.previewUrl || latestPlan.downloadUrl || latestPlan.linkPdf;
    if (!targetUrl) {
      Alert.alert(
        "Plan nutricional",
        "No hay enlace disponible para abrir el PDF.",
      );
      return;
    }

    try {
      await openBrowserAsync(targetUrl, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch (_error) {
      Alert.alert("Plan nutricional", "No se pudo abrir el PDF.");
    }
  };

  return (
    <TaurosScreen>
      <TaurosHeader
        title="Plan nutricional"
        subtitle="Mostrando el plan más reciente"
        onBack={() => router.back()}
      />

      <TaurosSection
        title="Tu PDF nutricional"
        subtitle="Solo se muestra la versión más reciente cargada para tu usuario."
      >
        {latestPlan ? (
          <TaurosCard style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.title}>Plan activo</Text>
              <TaurosPill label="Reciente" tone="accent" />
            </View>

            <Text style={styles.meta}>
              Fecha de carga: {formatDate(latestPlan.createdAt)}
            </Text>

            <TaurosButton label="Abrir PDF" onPress={openLatestPlan} />
          </TaurosCard>
        ) : (
          <TaurosCard>
            <Text style={styles.emptyText}>
              No tienes un plan nutricional cargado actualmente.
            </Text>
          </TaurosCard>
        )}
      </TaurosSection>
    </TaurosScreen>
  );
}

function pickLatestNutritionPlan(plans: BackendNutritionPlan[]) {
  if (!plans.length) {
    return null;
  }

    return plans.reduce<BackendNutritionPlan>((latest, current) => {
    const latestTime = new Date(latest.createdAt || 0).getTime();
    const currentTime = new Date(current.createdAt || 0).getTime();
    return currentTime > latestTime ? current : latest;
    }, plans[0]);
}

function formatDate(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "900" },
  meta: { color: "#bcbcbc", lineHeight: 20, fontSize: 13 },
  emptyText: { color: "#fff", fontWeight: "700" },
});
