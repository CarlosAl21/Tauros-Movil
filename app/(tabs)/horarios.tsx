import { StyleSheet, Text, View } from "react-native";

import { TaurosAuthCard } from "@/components/tauros-auth-card";
import {
    TaurosCard,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import { useTaurosBackend } from "@/lib/tauros-backend";
import { mapBackendSchedules } from "@/lib/tauros-mappers";
import { useTaurosSession } from "@/lib/tauros-session";

export default function SchedulesScreen() {
  const { token } = useTaurosSession();
  const { schedules } = useTaurosBackend();

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Horario</Text>
          <Text style={styles.pageSubtitle}>
            Inicia sesión para ver el horario semanal.
          </Text>
        </View>
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displaySchedules = mapBackendSchedules(schedules);
  const now = new Date();
  const currentDayName = now.toLocaleDateString("es-EC", { weekday: "long" });
  const normalizedCurrentDay = normalizeDay(currentDayName);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Horario</Text>
      </View>

      <TaurosSection title="Apertura semanal">
        <TaurosCard style={styles.scheduleCard}>
          {displaySchedules.length ? (
            displaySchedules.map((schedule) => {
              const isCurrentDay =
                normalizeDay(schedule.dia) === normalizedCurrentDay;
              const currentStatus = isCurrentDay
                ? getCurrentStatus(schedule.apertura, schedule.cierre, now)
                : null;

              return (
                <View
                  key={schedule.dia}
                  style={[
                    styles.scheduleRow,
                    isCurrentDay ? styles.currentDayRow : undefined,
                  ]}
                >
                  <View>
                    <Text style={styles.scheduleDayTitle}>{schedule.dia}</Text>
                    <Text style={styles.scheduleHours}>
                      {schedule.apertura} - {schedule.cierre}
                    </Text>
                    {isCurrentDay ? (
                      <Text style={styles.currentDayHint}>Hoy</Text>
                    ) : null}
                  </View>
                  {isCurrentDay ? (
                    <Text
                      style={[
                        styles.scheduleTag,
                        currentStatus === "Abierto"
                          ? styles.openTag
                          : styles.closedTag,
                      ]}
                    >
                      {currentStatus}
                    </Text>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No hay horarios disponibles.</Text>
          )}
        </TaurosCard>
      </TaurosSection>
    </TaurosScreen>
  );
}

function normalizeDay(day: string) {
  return day
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toMinutes(timeText: string) {
  const [hoursRaw, minutesRaw] = String(timeText || "").split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getCurrentStatus(apertura: string, cierre: string, now: Date) {
  if (
    String(apertura).toLowerCase() === "cerrado" ||
    String(cierre).toLowerCase() === "cerrado"
  ) {
    return "Cerrado";
  }

  const openMinutes = toMinutes(apertura);
  const closeMinutes = toMinutes(cierre);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (openMinutes === null || closeMinutes === null) {
    return "Cerrado";
  }

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes
    ? "Abierto"
    : "Cerrado";
}

const styles = StyleSheet.create({
  topIntro: { gap: 8 },
  pageTitle: { color: "#fff", fontSize: 28, fontWeight: "900" },
  pageSubtitle: { color: "#9e9e9e", lineHeight: 20 },
  scheduleCard: { gap: 12 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  currentDayRow: {
    borderColor: "#f4ae1a",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  scheduleDayTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  scheduleHours: {
    color: "#f4ae1a",
    marginTop: 4,
    fontWeight: "800",
    fontSize: 13,
  },
  currentDayHint: {
    color: "#f4ae1a",
    marginTop: 4,
    fontWeight: "800",
    fontSize: 12,
  },
  scheduleTag: { color: "#cfcfcf", fontWeight: "700", fontSize: 12 },
  openTag: { color: "#45c46f" },
  closedTag: { color: "#ff6961" },
  emptyText: { color: "#fff", fontWeight: "700" },
});
