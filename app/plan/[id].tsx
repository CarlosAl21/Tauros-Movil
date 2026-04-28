import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosHeader, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendExercises, mapBackendPlans, mapBackendSuggestions } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

export default function PlanDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const planId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token, user } = useTaurosSession();
  const { exercises, plans, suggestions } = useTaurosBackend();
  const [completion, setCompletion] = useState<Record<string, boolean>>({});

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Plan" onBack={() => router.back()} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displayExercises = mapBackendExercises(exercises);
  const displayPlans = mapBackendPlans(plans, user?.userId);
  const plan = displayPlans.find((item) => item.id === planId) || displayPlans.find((item) => !item.esPlantilla) || displayPlans[0];
  const planSuggestions = mapBackendSuggestions(suggestions).filter((item) => item.tipoEntidad === 'RUTINA' && (!plan || item.actividad === plan.nombre));

  if (!plan) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Plan no encontrado" onBack={() => router.back()} />
        <TaurosCard>
          <Text style={styles.emptyText}>No se encontró el plan solicitado.</Text>
        </TaurosCard>
      </TaurosScreen>
    );
  }

  const totalExercises = plan.dias.reduce((accumulator, day) => accumulator + day.ejercicios.length, 0);
  const completedExercises = plan.dias.reduce((accumulator, day) => accumulator + day.ejercicios.filter((exercise) => completion[exercise.exerciseId + day.id] || exercise.completado).length, 0);
  const progress = totalExercises ? Math.round((completedExercises / totalExercises) * 100) : 0;

  const toggleExercise = (dayId: string, exerciseId: string) => {
    const key = exerciseId + dayId;
    setCompletion((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <TaurosScreen>
      <TaurosHeader title={plan.nombre} subtitle={plan.objetivo} onBack={() => router.back()} right={<TaurosPill label={plan.esPlantilla ? 'Plantilla' : 'Asignado'} tone={plan.esPlantilla ? 'muted' : 'success'} />} />

      <TaurosCard style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{plan.descripcion}</Text>
            <Text style={styles.summarySubtitle}>La app permite marcar cada ejercicio para cerrar el día cuando termines.</Text>
          </View>
          <TaurosPill label={`${plan.duracionDias} dias`} tone="accent" />
        </View>

        <View style={styles.summaryTags}>
          <TaurosPill label={plan.objetivo} tone="blue" />
          <TaurosPill label={`Ejercicios: ${totalExercises}`} tone="muted" />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Avance de la rutina</Text>
            <Text style={styles.progressLabel}>{progress}%</Text>
          </View>
          <TaurosProgressBar value={progress} />
        </View>
      </TaurosCard>

      <TaurosSection title="Dias del plan" subtitle="Cada día se puede marcar por ejercicio. La carga y las notas quedan visibles para el usuario.">
        {plan.dias.map((day) => {
          const dayCompleted = day.ejercicios.filter((exercise) => completion[exercise.exerciseId + day.id] || exercise.completado).length;
          const dayProgress = day.ejercicios.length ? Math.round((dayCompleted / day.ejercicios.length) * 100) : 0;

          return (
            <TaurosCard key={day.id} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>Dia {day.numeroDia} · {day.nombre}</Text>
                  <Text style={styles.daySubtitle}>{day.descripcion}</Text>
                </View>
                <TaurosPill label={`${dayCompleted}/${day.ejercicios.length}`} tone={dayProgress === 100 ? 'success' : 'accent'} />
              </View>

              <TaurosProgressBar value={dayProgress} />

              <View style={styles.exerciseList}>
                {day.ejercicios.map((exercise) => {
                  const detail = displayExercises.find((item) => item.id === exercise.exerciseId);
                  const checked = Boolean(completion[exercise.exerciseId + day.id] || exercise.completado);

                  return (
                    <View key={exercise.exerciseId + day.id} style={styles.exerciseRow}>
                      <Pressable onPress={() => toggleExercise(day.id, exercise.exerciseId)} style={styles.checkbox}>
                        <MaterialCommunityIcons name={checked ? 'check-circle' : 'checkbox-blank-circle-outline'} size={22} color={checked ? '#45c46f' : '#f4ae1a'} />
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseTitle}>{detail?.nombre ?? exercise.exerciseId}</Text>
                        <Text style={styles.exerciseMeta}>#{exercise.orden} · {exercise.series} series · {exercise.repeticiones} reps · {exercise.carga}</Text>
                        <Text style={styles.exerciseNotes}>{exercise.notas}</Text>
                      </View>
                      <Link href={{ pathname: '/ejercicio/[id]', params: { id: exercise.exerciseId } }} asChild>
                        <Pressable style={styles.detailButton}>
                          <Text style={styles.detailButtonText}>Ver</Text>
                        </Pressable>
                      </Link>
                    </View>
                  );
                })}
              </View>

              <TaurosButton label={dayCompleted === day.ejercicios.length ? 'Dia completado' : 'Marcar dia'} onPress={() => day.ejercicios.forEach((exercise) => setCompletion((current) => ({ ...current, [exercise.exerciseId + day.id]: true })))} />
            </TaurosCard>
          );
        })}
      </TaurosSection>

      <TaurosSection title="Sugerencias de rutina" subtitle="Se basan en el tipo RUTINA que el backend expone en modo lectura.">
        <TaurosCard style={styles.suggestionCard}>
          {planSuggestions.length ? planSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionRow}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f4ae1a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle}>{suggestion.actividad}</Text>
                <Text style={styles.suggestionText}>{suggestion.contenido}</Text>
              </View>
            </View>
          )) : <Text style={styles.suggestionText}>No hay sugerencias de rutina para este plan.</Text>}
        </TaurosCard>
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  emptyText: { color: '#fff', fontWeight: '700' },
  summaryCard: { gap: 14 },
  summaryTopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  summaryTitle: { color: '#fff', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  summarySubtitle: { color: '#a1a1a1', marginTop: 6, lineHeight: 18, fontSize: 12 },
  summaryTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  progressBlock: { gap: 10 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#d1d1d1', fontWeight: '700' },
  dayCard: { gap: 14 },
  dayHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dayTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  daySubtitle: { color: '#9d9d9d', marginTop: 4, fontSize: 12, lineHeight: 18 },
  exerciseList: { gap: 10 },
  exerciseRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  checkbox: { paddingTop: 2 },
  exerciseTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  exerciseMeta: { color: '#f4ae1a', marginTop: 4, fontSize: 12, fontWeight: '700' },
  exerciseNotes: { color: '#a7a7a7', marginTop: 4, lineHeight: 18, fontSize: 12 },
  detailButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#222', borderWidth: 1, borderColor: '#303030' },
  detailButtonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  suggestionCard: { gap: 12 },
  suggestionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  suggestionTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  suggestionText: { color: '#b3b3b3', lineHeight: 18, fontSize: 12, marginTop: 4 },
});
