import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSuggestionsByType, taurosPlans, taurosExercises } from '@/lib/tauros-data';
import { TaurosButton, TaurosCard, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection } from '@/components/tauros-ui';

function getPlanProgress(planId: string) {
  const plan = taurosPlans.find((item) => item.id === planId);
  if (!plan) {
    return { total: 0, completed: 0, progress: 0 };
  }

  const total = plan.dias.reduce((accumulator, day) => accumulator + day.ejercicios.length, 0);
  const completed = plan.dias.reduce((accumulator, day) => accumulator + day.ejercicios.filter((exercise) => exercise.completado).length, 0);
  return { total, completed, progress: total ? Math.round((completed / total) * 100) : 0 };
}

export default function PlansScreen() {
  const router = useRouter();

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Tus rutinas</Text>
        <Text style={styles.pageSubtitle}>
          Aquí ves tus planes asignados, el avance de cada día y los ejercicios que debes completar.
        </Text>
      </View>

      <TaurosSection title="Planes disponibles" subtitle="La app respeta que los datos corporales los complete solo el entrenador.">
        {taurosPlans.map((plan) => {
          const progress = getPlanProgress(plan.id);
          const suggestions = getSuggestionsByType('RUTINA', plan.id).slice(0, 2);

          return (
            <TaurosCard key={plan.id} style={styles.planCard}>
              <View style={styles.planHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{plan.nombre}</Text>
                  <Text style={styles.planSubtitle}>{plan.descripcion}</Text>
                </View>
                <TaurosPill label={plan.activo ? 'Activo' : 'Plantilla'} tone={plan.activo ? 'success' : 'muted'} />
              </View>

              <View style={styles.planMetaRow}>
                <TaurosPill label={`${plan.duracionDias} dias`} tone="accent" />
                <TaurosPill label={plan.objetivo} tone="blue" />
              </View>

              <View style={styles.planProgressBlock}>
                <View style={styles.progressInfoRow}>
                  <Text style={styles.planMetric}>Progreso general</Text>
                  <Text style={styles.planMetric}>{progress.completed}/{progress.total} ejercicios</Text>
                </View>
                <TaurosProgressBar value={progress.progress} />
              </View>

              <View style={styles.daysList}>
                {plan.dias.map((day) => (
                  <Pressable key={day.id} onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })} style={styles.dayCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayTitle}>Dia {day.numeroDia} · {day.nombre}</Text>
                      <Text style={styles.daySubtitle}>{day.descripcion}</Text>
                    </View>
                    <View style={styles.dayCountBox}>
                      <MaterialCommunityIcons name="dumbbell" size={16} color="#f4ae1a" />
                      <Text style={styles.dayCount}>{day.ejercicios.length}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={styles.planActions}>
                <Link href={{ pathname: '/plan/[id]', params: { id: plan.id } }} asChild>
                  <Pressable style={{ flex: 1 }}>
                    <TaurosButton label="Abrir detalle" />
                  </Pressable>
                </Link>
              </View>

              <View style={styles.suggestionBlock}>
                <Text style={styles.suggestionHeading}>Sugerencias de rutina</Text>
                {suggestions.map((item) => (
                  <View key={item.id} style={styles.suggestionRow}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f4ae1a" />
                    <Text style={styles.suggestionText}>{item.contenido}</Text>
                  </View>
                ))}
              </View>
            </TaurosCard>
          );
        })}
      </TaurosSection>

      <TaurosSection title="Ejercicios destacados" subtitle="Los campos de categoría y máquina se muestran separados como pediste.">
        <TaurosCard>
          {taurosExercises.slice(0, 2).map((exercise) => (
            <View key={exercise.id} style={styles.exerciseRow}>
              <View style={styles.exerciseNumberBox}>
                <Text style={styles.exerciseNumber}>{exercise.maquina ? exercise.maquina.numero : '—'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseTitle}>{exercise.nombre}</Text>
                <Text style={styles.exerciseMeta}>Categoria: {exercise.categoria} · Tipo: {exercise.tipo}</Text>
                <Text style={styles.exerciseMeta}>Maquina: {exercise.maquina ? `${exercise.maquina.nombre} ${exercise.maquina.numero}` : 'Sin maquina asignada'}</Text>
              </View>
            </View>
          ))}
        </TaurosCard>
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  topIntro: {
    gap: 8,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  pageSubtitle: {
    color: '#9e9e9e',
    lineHeight: 20,
  },
  planCard: {
    gap: 14,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  planSubtitle: {
    color: '#a0a0a0',
    marginTop: 4,
    lineHeight: 18,
    fontSize: 13,
  },
  planMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  planProgressBlock: {
    gap: 10,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planMetric: {
    color: '#d0d0d0',
    fontSize: 12,
    fontWeight: '700',
  },
  daysList: {
    gap: 10,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#272727',
  },
  dayTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  daySubtitle: {
    color: '#9f9f9f',
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
  },
  dayCountBox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 174, 26, 0.12)',
  },
  dayCount: {
    color: '#f4ae1a',
    fontWeight: '900',
  },
  planActions: {
    gap: 10,
  },
  suggestionBlock: {
    gap: 10,
  },
  suggestionHeading: {
    color: '#fff',
    fontWeight: '800',
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  suggestionText: {
    flex: 1,
    color: '#b8b8b8',
    lineHeight: 18,
    fontSize: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  exerciseNumberBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 174, 26, 0.12)',
  },
  exerciseNumber: {
    color: '#f4ae1a',
    fontWeight: '900',
  },
  exerciseTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  exerciseMeta: {
    color: '#a3a3a3',
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
});
