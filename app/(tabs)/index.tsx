import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosInfoRow, TaurosInputButton, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection, TaurosStat } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendEvents, mapBackendExercises, mapBackendPlans, mapBackendSchedules, mapBackendSuggestions } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

export default function HomeScreen() {
  const router = useRouter();
  const { token, user, persistentWeight } = useTaurosSession();
  const { exercises, plans, events, schedules, suggestions, loading } = useTaurosBackend();

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Tauros Movil</Text>
          <Text style={styles.pageSubtitle}>Ingresa con tu cuenta para ver tus rutinas, tus eventos activos y el horario del gym desde el backend real.</Text>
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
  const displayEvents = mapBackendEvents(events);
  const displaySchedules = mapBackendSchedules(schedules);
  const displaySuggestions = mapBackendSuggestions(suggestions);

  const activePlan = displayPlans.find((plan) => !plan.esPlantilla && plan.dias.length > 0) || displayPlans.find((plan) => !plan.esPlantilla) || displayPlans[0];
  const activeDay = activePlan?.dias[0];
  const activeExercises = activeDay?.ejercicios || [];
  const completedExercises = activeExercises.filter((exercise) => exercise.completado).length;
  const progress = activeExercises.length ? Math.round((completedExercises / activeExercises.length) * 100) : 0;
  const upcomingEvents = displayEvents.slice(0, 2);
  const routineSuggestions = displaySuggestions.filter((item) => item.tipoEntidad === 'RUTINA').slice(0, 2);
  const exerciseHighlights = displayExercises.slice(0, 3);

  return (
    <TaurosScreen>
      <TaurosCard style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Hola, {user?.nombre ?? 'atleta'}</Text>
            <Text style={styles.heroSubtitle}>Rutina, ejercicios, eventos y horario en una sola vista limpia.</Text>
          </View>
          <Image source={require('../../assets/images/tauros-logo.png')} style={styles.logo} contentFit="contain" />
        </View>

        <View style={styles.heroStatsGrid}>
          <TaurosStat label="Rutina" value={activePlan?.nombre ?? 'Sin plan'} icon={<MaterialCommunityIcons name="clipboard-text-outline" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Avance" value={`${progress}%`} icon={<MaterialCommunityIcons name="check-circle-outline" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Peso" value={persistentWeight ? `${persistentWeight} kg` : 'Pendiente'} icon={<MaterialCommunityIcons name="scale-bathroom" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Eventos" value={`${displayEvents.length}`} icon={<MaterialCommunityIcons name="calendar-star" size={16} color="#f4ae1a" />} />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>Progreso de la rutina</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <TaurosProgressBar value={progress} />
        </View>

        <View style={styles.quickActions}>
          <TaurosInputButton href="/planes" label="Ver mis rutinas" icon={<MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#f4ae1a" />} />
          <TaurosInputButton href="/ejercicios" label="Explorar ejercicios" icon={<MaterialCommunityIcons name="dumbbell" size={18} color="#f4ae1a" />} />
          <TaurosInputButton href="/horarios" label="Horario del gym" icon={<MaterialCommunityIcons name="clock-time-five-outline" size={18} color="#f4ae1a" />} />
        </View>
      </TaurosCard>

      <TaurosSection title="Rutina de hoy" subtitle="Vista rápida para abrir el entrenamiento actual.">
        <TaurosCard>
          <View style={styles.routineHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>{activeDay?.nombre ?? 'Sin rutina asignada'}</Text>
              <Text style={styles.routineSubtitle}>{activeDay?.descripcion ?? 'Cuando el backend entregue un plan, aparecerá aquí.'}</Text>
            </View>
            <TaurosPill label={`${activeExercises.length} ejercicios`} tone="blue" />
          </View>

          <View style={styles.exercisePreviewList}>
            {activeExercises.map((exercise) => {
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

          <TaurosButton label="Abrir rutina completa" onPress={() => router.push({ pathname: '/plan/[id]', params: { id: activePlan?.id ?? '' } })} />
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Próximos eventos" subtitle="Solo lo necesario para entrar o registrarte.">
        {upcomingEvents.map((event) => (
          <TaurosCard key={event.id} style={styles.compactCard}>
            <View style={styles.eventRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{event.nombre}</Text>
                <Text style={styles.eventMeta}>{event.lugar} · {event.fechaHora}</Text>
                <Text style={styles.eventDescription}>{event.descripcion}</Text>
              </View>
              <TaurosPill label={`${event.asistentes}/${event.cupo}`} tone="success" />
            </View>
            <View style={styles.eventActions}>
              <Link href={{ pathname: '/evento/[id]', params: { id: event.id } }} asChild>
                <Pressable>
                  <Text style={styles.eventLink}>Ver detalles</Text>
                </Pressable>
              </Link>
            </View>
          </TaurosCard>
        ))}
      </TaurosSection>

      <TaurosSection title="Sugerencias" subtitle="Recomendaciones breves del sistema.">
        <TaurosCard>
          {routineSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionRow}>
              <TaurosPill label={suggestion.tipoEntidad} tone="accent" />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle}>{suggestion.actividad}</Text>
                <Text style={styles.suggestionText}>{suggestion.contenido}</Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          {exerciseHighlights.map((exercise) => (
            <View key={exercise.id} style={styles.suggestionRow}>
              <Image source={{ uri: exercise.thumbnail }} style={styles.suggestionThumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle}>{exercise.nombre}</Text>
                <Text style={styles.suggestionText}>{exercise.notas}</Text>
              </View>
            </View>
          ))}
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Horario" subtitle="Solo horarios y peso. Sin ruido extra.">
        <TaurosCard>
          <TaurosInfoRow label="Usuario" value={user?.nombre ?? 'Sin perfil'} />
          <View style={styles.smallSpacer} />
          <TaurosInfoRow label="Peso permitido para editar" value={persistentWeight ? `${persistentWeight} kg` : 'No registrado'} />
          <View style={styles.smallSpacer} />
          <TaurosInfoRow label="Lo demás lo completa el entrenador" value="Bloqueado" />
          <View style={styles.scheduleDivider} />
          {displaySchedules.slice(0, 3).map((schedule) => (
            <View key={schedule.dia} style={styles.schedulePreviewRow}>
              <Text style={styles.schedulePreviewDay}>{schedule.dia}</Text>
              <Text style={styles.schedulePreviewHours}>{schedule.apertura} - {schedule.cierre}</Text>
            </View>
          ))}
        </TaurosCard>
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: { gap: 18 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroTextBlock: { flex: 1, gap: 10 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 32 },
  heroSubtitle: { color: '#b0b0b0', fontSize: 14, lineHeight: 20 },
  logo: { width: 88, height: 88 },
  heroStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progressBlock: { gap: 10 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#dcdcdc', fontWeight: '700' },
  progressValue: { color: '#f4ae1a', fontWeight: '900' },
  quickActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  routineHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routineTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  routineSubtitle: { color: '#a8a8a8', marginTop: 4, lineHeight: 18, fontSize: 12 },
  exercisePreviewList: { gap: 10, marginBottom: 14 },
  exercisePreviewRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727', gap: 10 },
  exercisePreviewTitle: { color: '#fff', fontWeight: '800' },
  exercisePreviewMeta: { color: '#b3b3b3', marginTop: 4, fontSize: 12 },
  compactCard: { gap: 12 },
  eventRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  eventTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  eventMeta: { color: '#f4ae1a', marginTop: 4, fontSize: 12, fontWeight: '700' },
  eventDescription: { color: '#b3b3b3', marginTop: 6, lineHeight: 18, fontSize: 12 },
  eventActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  eventLink: { color: '#f4ae1a', fontWeight: '800' },
  suggestionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  suggestionTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  suggestionText: { color: '#b3b3b3', marginTop: 4, lineHeight: 18, fontSize: 12 },
  suggestionThumb: { width: 58, height: 58, borderRadius: 14, backgroundColor: '#272727' },
  divider: { height: 1, backgroundColor: '#2a2a2a', marginVertical: 6 },
  smallSpacer: { height: 8 },
  scheduleDivider: { height: 1, backgroundColor: '#2a2a2a', marginVertical: 10 },
  schedulePreviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  schedulePreviewDay: { color: '#fff', fontWeight: '800' },
  schedulePreviewHours: { color: '#c8c8c8' },
  loadingText: { color: '#fff', fontWeight: '700' },
  pageTitle: { color: '#fff', fontSize: 30, fontWeight: '900' },
  pageSubtitle: { color: '#9e9e9e', lineHeight: 20 },
  topIntro: { gap: 8, marginBottom: 12 },
});
