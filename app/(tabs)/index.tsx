import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosInfoRow, TaurosInputButton, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection, TaurosStat } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendEvents, mapBackendExercises, mapBackendPlans, mapBackendSchedules } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

const styles = StyleSheet.create({
  heroCard: { gap: 16 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroTextBlock: { flex: 1, gap: 10 },
  heroTextBlockRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 32 },
  topLogoWrap: { alignItems: 'center', marginBottom: 12 },
  topLogo: { width: 120, height: 80 },
  profileIcon: { marginLeft: 12 },
  heroStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  planCard: { gap: 14 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  planSubtitle: { color: '#9f9f9f', marginTop: 4, lineHeight: 18, fontSize: 12 },
  dayPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  dayTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  daySubtitle: { color: '#9b9b9b', marginTop: 4, lineHeight: 18, fontSize: 12 },
  progressBlock: { gap: 10 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#dcdcdc', fontWeight: '700' },
  progressValue: { color: '#f4ae1a', fontWeight: '900' },
  exercisePreviewList: { gap: 10 },
  exercisePreviewRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727', gap: 10 },
  exercisePreviewTitle: { color: '#fff', fontWeight: '800' },
  exercisePreviewMeta: { color: '#b3b3b3', marginTop: 4, fontSize: 12 },
  compactCard: { gap: 12 },
  eventHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  eventTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  eventMeta: { color: '#f4ae1a', marginTop: 4, fontSize: 12, fontWeight: '700' },
  eventDescription: { color: '#b3b3b3', lineHeight: 18, fontSize: 12 },
  scheduleCard: { gap: 10 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  scheduleDay: { color: '#fff', fontWeight: '800' },
  scheduleHours: { color: '#c8c8c8', fontWeight: '700' },
  profileCard: { gap: 12 },
  weightBox: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  weightLabel: { color: '#fff', fontWeight: '800' },
  weightInput: { borderRadius: 14, borderWidth: 1, borderColor: '#3a3a3a', backgroundColor: '#0f0f0f', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700' },
  loadingText: { color: '#fff', fontWeight: '700' },
  pageTitle: { color: '#fff', fontSize: 30, fontWeight: '900' },
  pageSubtitle: { color: '#9e9e9e', lineHeight: 20 },
  topIntro: { gap: 8, marginBottom: 12 },
  emptyText: { color: '#fff', fontWeight: '700' },
});

export default function HomeScreen() {
  const router = useRouter();
  const { token, user, persistentWeight, setPersistentWeight, logout } = useTaurosSession();
  const { exercises, plans, events, schedules, loading } = useTaurosBackend();
  const [weightInput, setWeightInput] = useState(String(persistentWeight || ''));

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Tauros</Text>
          <Text style={styles.pageSubtitle}>Ingresa para ver tu rutina asignada, eventos activos y horarios del gimnasio.</Text>
        </View>
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  if (loading) {
    return (
      <TaurosScreen>
        <TaurosCard>
          <Text style={styles.loadingText}>Cargando datos del backend...</Text>
        </TaurosCard>
      </TaurosScreen>
    );
  }

  const displayExercises = mapBackendExercises(exercises);
  const displayPlans = mapBackendPlans(plans, user?.userId);
  const displayEvents = mapBackendEvents(events).filter((event) => event.activo);
  const displaySchedules = mapBackendSchedules(schedules);
  const assignedPlans = displayPlans.filter((plan) => !plan.esPlantilla && plan.activo);
  const latestPlan = assignedPlans[assignedPlans.length - 1] || null;
  const latestDay = latestPlan?.dias?.[0] || null;
  const latestExercises = latestDay?.ejercicios || [];
  const completedExercises = latestExercises.filter((exercise) => exercise.completado).length;
  const progress = latestExercises.length ? Math.round((completedExercises / latestExercises.length) * 100) : 0;
  const currentSchedule = displaySchedules.slice(0, 3);
  const upcomingEvents = displayEvents.slice(0, 2);

  return (
    <TaurosScreen>
      <View style={styles.topLogoWrap}>
        <Image source={require('../../assets/images/tauros-logo.png')} style={styles.topLogo} contentFit="contain" />
      </View>

      <TaurosCard style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlockRow}>
            <Text style={styles.heroTitle}>Hola, {user?.nombre ?? 'atleta'}</Text>
            <Pressable onPress={() => router.push('/profile')} style={styles.profileIcon} accessibilityLabel="Abrir perfil">
              <MaterialCommunityIcons name="account-circle" size={32} color="#f4ae1a" />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroStatsGrid}>
          <TaurosStat label="Rutina" value={latestPlan?.nombre ?? 'Sin plan'} icon={<MaterialCommunityIcons name="clipboard-text-outline" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Avance" value={`${progress}%`} icon={<MaterialCommunityIcons name="check-circle-outline" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Peso" value={persistentWeight ? `${persistentWeight} kg` : 'Pendiente'} icon={<MaterialCommunityIcons name="scale-bathroom" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Eventos" value={`${displayEvents.length}`} icon={<MaterialCommunityIcons name="calendar-star" size={16} color="#f4ae1a" />} />
        </View>

        <View style={styles.quickActions}>
          <TaurosInputButton href="/planes" label="Mi rutina" icon={<MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#f4ae1a" />} />
          <TaurosInputButton href="/ejercicios" label="Ejercicios" icon={<MaterialCommunityIcons name="dumbbell" size={18} color="#f4ae1a" />} />
          <TaurosInputButton href="/eventos" label="Eventos" icon={<MaterialCommunityIcons name="calendar-star" size={18} color="#f4ae1a" />} />
          <TaurosInputButton href="/horarios" label="Horario" icon={<MaterialCommunityIcons name="clock-time-five-outline" size={18} color="#f4ae1a" />} />
        </View>
      </TaurosCard>

      <TaurosSection title="Rutina actual" subtitle="Solo aparece la última rutina asignada al usuario.">
        {latestPlan ? (
          <TaurosCard style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{latestPlan.nombre}</Text>
                <Text style={styles.planSubtitle}>{latestPlan.descripcion}</Text>
              </View>
              <TaurosPill label={latestDay ? `Dia ${latestDay.numeroDia}` : 'Sin dia'} tone="accent" />
            </View>

            {latestDay ? (
              <Pressable onPress={() => router.push({ pathname: '/plan/[id]', params: { id: latestPlan.id, day: latestDay.id } })} style={styles.dayPreview}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>{latestDay.nombre}</Text>
                  <Text style={styles.daySubtitle}>{latestDay.descripcion}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#f4ae1a" />
              </Pressable>
            ) : null}

            <View style={styles.progressBlock}>
              <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>Progreso del día</Text>
                <Text style={styles.progressValue}>{progress}%</Text>
              </View>
              <TaurosProgressBar value={progress} />
            </View>

            <View style={styles.exercisePreviewList}>
              {latestExercises.slice(0, 4).map((exercise) => {
                const detail = displayExercises.find((item) => item.id === exercise.exerciseId);

                return (
                  <Pressable key={exercise.exerciseId} onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: exercise.exerciseId } })} style={styles.exercisePreviewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exercisePreviewTitle}>{detail?.nombre ?? exercise.exerciseId}</Text>
                      <Text style={styles.exercisePreviewMeta}>{exercise.series} series · {exercise.repeticiones} reps · {exercise.carga}</Text>
                    </View>
                    <MaterialCommunityIcons name={exercise.completado ? 'check-circle' : 'chevron-right'} size={20} color={exercise.completado ? '#45c46f' : '#f4ae1a'} />
                  </Pressable>
                );
              })}
            </View>

            <TaurosButton label="Abrir rutina completa" onPress={() => router.push({ pathname: '/plan/[id]', params: { id: latestPlan.id } })} />
          </TaurosCard>
        ) : (
          <TaurosCard>
            <Text style={styles.emptyText}>Todavía no tienes una rutina asignada.</Text>
          </TaurosCard>
        )}
      </TaurosSection>

      <TaurosSection title="Eventos activos" subtitle="Solo los eventos disponibles para registrarte.">
        {upcomingEvents.length ? upcomingEvents.map((event) => (
          <TaurosCard key={event.id} style={styles.compactCard}>
            <View style={styles.eventHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{event.nombre}</Text>
                <Text style={styles.eventMeta}>{new Date(event.fechaHora).toLocaleDateString('es-EC')} · {event.lugar}</Text>
              </View>
              <TaurosPill label="Activo" tone="success" />
            </View>
            <Text style={styles.eventDescription}>{event.descripcion}</Text>
            <TaurosButton compact label="Ver detalles" onPress={() => router.push({ pathname: '/evento/[id]', params: { id: event.id } })} />
          </TaurosCard>
        )) : <TaurosCard><Text style={styles.emptyText}>No hay eventos activos por ahora.</Text></TaurosCard>}
      </TaurosSection>

      <TaurosSection title="Horario" subtitle="Vista directa del horario semanal.">
        <TaurosCard style={styles.scheduleCard}>
          {currentSchedule.map((schedule) => (
            <View key={schedule.dia} style={styles.scheduleRow}>
              <Text style={styles.scheduleDay}>{schedule.dia}</Text>
              <Text style={styles.scheduleHours}>{schedule.apertura} - {schedule.cierre}</Text>
            </View>
          ))}
        </TaurosCard>
      </TaurosSection>

    </TaurosScreen>
  );
}
