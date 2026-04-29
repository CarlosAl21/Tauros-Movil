import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { TaurosCard, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendPlans, pickLatestAssignedPlan } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

export default function PlansScreen() {
  const router = useRouter();
  const { user } = useTaurosSession();
  const { plans, refresh } = useTaurosBackend();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const displayPlans = mapBackendPlans(plans, user?.userId);
  const assignedPlans = displayPlans.filter((plan) => !plan.esPlantilla && plan.activo);
  const latestPlan = pickLatestAssignedPlan(assignedPlans);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Rutinas</Text>
        <Text style={styles.pageSubtitle}>Solo se muestra la última rutina asignada al usuario.</Text>
      </View>

      {latestPlan ? (
        <TaurosSection title="Tu rutina actual" subtitle="Toca un día para ver solo esa pantalla.">
          <TaurosCard style={styles.planCard}>
            <View style={styles.planHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{latestPlan.nombre}</Text>
                <Text style={styles.planSubtitle}>{latestPlan.descripcion}</Text>
              </View>
              <View style={styles.planStatusBlock}>
                <MaterialCommunityIcons name={latestPlan.completado ? 'check-decagram' : 'clipboard-text-outline'} size={18} color={latestPlan.completado ? '#45c46f' : '#f4ae1a'} />
                <Text style={styles.planStatusText}>{latestPlan.completado ? 'Completo' : 'En curso'}</Text>
              </View>
            </View>

            <View style={styles.planMetaRow}>
              <TaurosPill label={`${latestPlan.duracionDias} días`} tone="accent" />
              <TaurosPill label={latestPlan.completado ? 'Plan completo' : 'Asignada'} tone={latestPlan.completado ? 'success' : 'muted'} />
            </View>

            <View style={styles.daysList}>
              {latestPlan.dias.map((day) => {
                const completed = day.ejercicios.filter((exercise) => exercise.completado).length;
                const progress = day.ejercicios.length ? Math.round((completed / day.ejercicios.length) * 100) : 0;

                return (
                  <Pressable key={day.id} onPress={() => router.push({ pathname: '/plan/[id]', params: { id: latestPlan.id, day: day.id } })} style={styles.dayCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayTitle}>Día {day.numeroDia} · {day.nombre}</Text>
                      <Text style={styles.daySubtitle}>{day.descripcion}</Text>
                      <View style={{ marginTop: 10 }}>
                        <TaurosProgressBar value={progress} />
                      </View>
                    </View>
                    <View style={styles.dayCountBox}>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#f4ae1a" />
                      <Text style={styles.dayCount}>{day.ejercicios.length}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </TaurosCard>
        </TaurosSection>
      ) : (
        <TaurosCard>
          <Text style={styles.emptyText}>No tienes una rutina asignada todavía.</Text>
        </TaurosCard>
      )}
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  topIntro: { gap: 8 },
  pageTitle: { color: '#fff', fontSize: 30, fontWeight: '900' },
  pageSubtitle: { color: '#9e9e9e', lineHeight: 20 },
  planCard: { gap: 14 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  planSubtitle: { color: '#a0a0a0', marginTop: 4, lineHeight: 18, fontSize: 13 },
  planStatusBlock: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(244, 174, 26, 0.08)', borderWidth: 1, borderColor: 'rgba(244, 174, 26, 0.18)' },
  planStatusText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  planMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  daysList: { gap: 10 },
  dayCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  dayTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  daySubtitle: { color: '#9f9f9f', marginTop: 4, lineHeight: 18, fontSize: 12 },
  dayCountBox: { width: 52, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(244, 174, 26, 0.12)' },
  dayCount: { color: '#f4ae1a', fontWeight: '900' },
  emptyText: { color: '#fff', fontWeight: '700' },
});
