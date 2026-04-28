import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getSuggestionsByType,
  taurosEvents,
  taurosExercises,
  taurosPlans,
  taurosProfile,
  taurosSchedules,
} from '@/lib/tauros-data';
import {
  TaurosButton,
  TaurosCard,
  TaurosInfoRow,
  TaurosInputButton,
  TaurosPill,
  TaurosProgressBar,
  TaurosScreen,
  TaurosSection,
  TaurosStat,
} from '@/components/tauros-ui';

function countPlanExercises() {
  const activePlan = taurosPlans.find((plan) => plan.activo) || taurosPlans[0];
  const total = activePlan.dias.reduce((accumulator, day) => accumulator + day.ejercicios.length, 0);
  const done = activePlan.dias.reduce(
    (accumulator, day) => accumulator + day.ejercicios.filter((exercise) => exercise.completado).length,
    0
  );

  return { activePlan, total, done, progress: total ? Math.round((done / total) * 100) : 0 };
}

export default function HomeScreen() {
  const router = useRouter();
  const { activePlan, total, done, progress } = countPlanExercises();
  const upcomingEvents = taurosEvents.slice(0, 2);
  const suggestedExercises = taurosExercises.slice(0, 3);
  const routineSuggestions = getSuggestionsByType('RUTINA', activePlan.id).slice(0, 2);

  return (
    <TaurosScreen>
      <TaurosCard style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <TaurosPill label="Tauros Member" tone="accent" />
            <Text style={styles.heroTitle}>Hola, {taurosProfile.nombre.split(' ')[0]}</Text>
            <Text style={styles.heroSubtitle}>
              Tu foco de hoy es completar la rutina y dejar constancia de cada carga.
            </Text>
          </View>
          <Image
            source={require('../../assets/images/tauros-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={styles.heroStatsGrid}>
          <TaurosStat label="Rutina activa" value={activePlan.nombre} icon={<MaterialCommunityIcons name="clipboard-text-outline" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Ejercicios completados" value={`${done}/${total}`} icon={<MaterialCommunityIcons name="check-circle-outline" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Peso actual" value={`${taurosProfile.peso} kg`} icon={<MaterialCommunityIcons name="scale-bathroom" size={16} color="#f4ae1a" />} />
          <TaurosStat label="Eventos activos" value={taurosEvents.length} icon={<MaterialCommunityIcons name="calendar-star" size={16} color="#f4ae1a" />} />
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

      <TaurosSection title="Rutina de hoy" subtitle="Marca cada ejercicio cuando lo completes y añade la carga que usaste.">
        <TaurosCard>
          <View style={styles.routineHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>{activePlan.dias[0].nombre}</Text>
              <Text style={styles.routineSubtitle}>{activePlan.dias[0].descripcion}</Text>
            </View>
            <TaurosPill label={`${activePlan.dias[0].ejercicios.length} ejercicios`} tone="blue" />
          </View>

          <View style={styles.exercisePreviewList}>
            {activePlan.dias[0].ejercicios.map((exercise) => {
              const detail = taurosExercises.find((item) => item.id === exercise.exerciseId);

              return (
                <Pressable key={exercise.exerciseId} onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: exercise.exerciseId } })} style={styles.exercisePreviewRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exercisePreviewTitle}>{detail?.nombre ?? exercise.exerciseId}</Text>
                    <Text style={styles.exercisePreviewMeta}>{exercise.series} series · {exercise.repeticiones} repeticiones · {exercise.carga}</Text>
                  </View>
                  <MaterialCommunityIcons name={exercise.completado ? 'check-circle' : 'chevron-right'} size={20} color={exercise.completado ? '#45c46f' : '#f4ae1a'} />
                </Pressable>
              );
            })}
          </View>

          <TaurosButton label="Abrir rutina completa" onPress={() => router.push({ pathname: '/plan/[id]', params: { id: activePlan.id } })} />
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Próximos eventos" subtitle="Los usuarios pueden registrarse directamente desde la app.">
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
              <TaurosButton compact label="Registrar" onPress={() => router.push({ pathname: '/evento/[id]', params: { id: event.id } })} />
              <TaurosButton compact variant="ghost" label="Detalles" onPress={() => router.push({ pathname: '/evento/[id]', params: { id: event.id } })} />
            </View>
          </TaurosCard>
        ))}
      </TaurosSection>

      <TaurosSection title="Sugerencias del coach" subtitle="Se muestran en los módulos donde el backend permite contenido útil para el usuario.">
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
          {suggestedExercises.map((exercise) => (
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

      <TaurosSection title="Horario de apertura" subtitle="Acceso rápido al horario del gimnasio y datos personales editables.">
        <TaurosCard>
          <TaurosInfoRow label="Usuario" value={taurosProfile.nombre} />
          <View style={styles.smallSpacer} />
          <TaurosInfoRow label="Peso permitido para editar" value={`${taurosProfile.peso} kg`} />
          <View style={styles.smallSpacer} />
          <TaurosInfoRow label="Lo demás lo completa el entrenador" value="Bloqueado" />
          <View style={styles.scheduleDivider} />
          {taurosSchedules.slice(0, 3).map((schedule) => (
            <View key={schedule.dia} style={styles.schedulePreviewRow}>
              <Text style={styles.schedulePreviewDay}>{schedule.dia}</Text>
              <Text style={styles.schedulePreviewHours}>{schedule.apertura} - {schedule.cierre}</Text>
            </View>
          ))}
        </TaurosCard>
        <Link href="/horarios" asChild>
          <Pressable>
            <TaurosButton label="Abrir horario del gym" />
          </Pressable>
        </Link>
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroTextBlock: {
    flex: 1,
    gap: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 32,
  },
  heroSubtitle: {
    color: '#b0b0b0',
    fontSize: 14,
    lineHeight: 20,
  },
  logo: {
    width: 88,
    height: 88,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  progressBlock: {
    gap: 10,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#dcdcdc',
    fontWeight: '700',
  },
  progressValue: {
    color: '#f4ae1a',
    fontWeight: '900',
  },
  quickActions: {
    gap: 10,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  routineTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  routineSubtitle: {
    color: '#9e9e9e',
    fontSize: 13,
    marginTop: 4,
  },
  exercisePreviewList: {
    gap: 10,
    marginBottom: 14,
  },
  exercisePreviewRow: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#272727',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exercisePreviewTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  exercisePreviewMeta: {
    color: '#9e9e9e',
    marginTop: 4,
    fontSize: 12,
  },
  compactCard: {
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  eventMeta: {
    color: '#f4ae1a',
    marginTop: 4,
    fontSize: 12,
  },
  eventDescription: {
    color: '#9e9e9e',
    marginTop: 6,
    lineHeight: 18,
    fontSize: 13,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  suggestionThumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#262626',
  },
  suggestionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  suggestionText: {
    color: '#a9a9a9',
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 8,
  },
  smallSpacer: {
    height: 10,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 12,
  },
  schedulePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  schedulePreviewDay: {
    color: '#fff',
    fontWeight: '700',
  },
  schedulePreviewHours: {
    color: '#f4ae1a',
    fontWeight: '800',
  },
});

