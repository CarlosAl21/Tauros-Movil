import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { ComponentType } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosHeader, TaurosInfoRow, TaurosPill, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { findDisplayExerciseById, findPlanExercise, mapBackendExercises, mapBackendPlans, mapBackendSuggestions } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

const VideoComponent = Video as unknown as ComponentType<{
  source: { uri: string };
  style: object;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  resizeMode?: ResizeMode;
  useNativeControls?: boolean;
}>;

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const exerciseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token, user } = useTaurosSession();
  const { exercises, plans, suggestions } = useTaurosBackend();
  const [carga, setCarga] = useState('');
  const [nota, setNota] = useState('');
  const [completed, setCompleted] = useState(false);

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Ejercicio" onBack={() => router.back()} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displayExercises = mapBackendExercises(exercises);
  const displayPlans = mapBackendPlans(plans, user?.userId);
  const activePlan = displayPlans.find((plan) => !plan.esPlantilla) || displayPlans[0];
  const displayExercise = findDisplayExerciseById(exercises, exerciseId) || displayExercises.find((item) => item.id === exerciseId) || null;
  const routineExercise = findPlanExercise(activePlan, exerciseId);
  const exerciseSuggestions = mapBackendSuggestions(suggestions).filter((item) => item.tipoEntidad === 'EJERCICIO' && item.actividad === displayExercise?.nombre);

  if (!displayExercise) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Ejercicio no encontrado" onBack={() => router.back()} />
        <TaurosCard>
          <Text style={styles.emptyText}>No se encontró el ejercicio solicitado.</Text>
        </TaurosCard>
      </TaurosScreen>
    );
  }

  const seriesText = routineExercise ? `${routineExercise.exercise.series} series · ${routineExercise.exercise.repeticiones} reps` : displayExercise.series;
  const chargeText = carga || routineExercise?.exercise.carga || displayExercise.cargaSugerida || '0.0 kg';
  const notesText = nota || routineExercise?.exercise.notas || displayExercise.notas || '';
  const activationSource = displayExercise.linkAM || displayExercise.thumbnail;

  return (
    <TaurosScreen>
      <TaurosHeader
        title={displayExercise.nombre}
        subtitle={`${displayExercise.categoria} · ${displayExercise.tipo}`}
        onBack={() => router.back()}
        right={<TaurosPill label={completed ? 'Hecho' : 'Pendiente'} tone={completed ? 'success' : 'accent'} />}
      />

      <TaurosCard style={styles.heroCard}>
        <View style={styles.heroVisualRow}>
          <View style={styles.heroVideoWrap}>
            <VideoComponent
              source={{ uri: displayExercise.linkVideo }}
              style={styles.video}
              shouldPlay
              isLooping
              isMuted
              resizeMode={ResizeMode.COVER}
            />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.exerciseTitle}>{displayExercise.nombre}</Text>
            <Text style={styles.exerciseMeta}>{displayExercise.categoria} · {displayExercise.tipo}</Text>
            <View style={styles.machineBadge}>
              <Text style={styles.machineBadgeLabel}>Maquina</Text>
              <Text style={styles.machineBadgeValue}>{displayExercise.maquina ? `${displayExercise.maquina.nombre} ${displayExercise.maquina.numero}` : 'Sin maquina asignada'}</Text>
            </View>
          </View>
        </View>
      </TaurosCard>

      <TaurosSection title="Serie y carga" subtitle="Lo esencial para entrenar sin ruido visual.">
        <TaurosCard style={styles.compactCard}>
          <View style={styles.exerciseGrid}>
            <InfoPill label="Series y reps" value={seriesText} />
            <InfoPill label="Carga" value={chargeText} />
            <InfoPill label="Descanso" value={displayExercise.descanso} />
          </View>

          <Text style={styles.inputLabel}>Notas</Text>
          <TextInput value={nota} onChangeText={setNota} multiline style={[styles.input, styles.textArea]} placeholder={notesText || 'Escribe una nota corta'} placeholderTextColor="#666" />

          <TaurosButton label={completed ? 'Completado' : 'Marcar como completado'} onPress={() => setCompleted((current) => !current)} />
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Activación muscular" subtitle="La imagen viene del backend en `linkAM` y ya no depende del recurso local.">
        <TaurosCard style={styles.activationCard}>
          <Image source={{ uri: activationSource }} style={styles.activationImage} contentFit="cover" />
          <View style={styles.activationList}>
            {displayExercise.activacion.map((muscle) => (
              <View key={muscle} style={styles.activationItem}>
                <MaterialCommunityIcons name="target" size={18} color="#f4ae1a" />
                <Text style={styles.activationText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Sugerencias" subtitle="Directo desde el backend.">
        <TaurosCard style={styles.suggestionCard}>
          {exerciseSuggestions.length ? exerciseSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionRow}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f4ae1a" />
              <Text style={styles.suggestionText}>{suggestion.contenido}</Text>
            </View>
          )) : <Text style={styles.suggestionText}>No hay sugerencias específicas para este ejercicio.</Text>}
        </TaurosCard>
      </TaurosSection>
    </TaurosScreen>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: { color: '#fff', fontWeight: '700' },
  heroCard: { gap: 14 },
  heroVisualRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  heroVideoWrap: { flex: 1.1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0a0a0a' },
  video: { width: '100%', height: 240, backgroundColor: '#000' },
  heroInfo: { flex: 0.9, justifyContent: 'space-between', gap: 12 },
  exerciseTitle: { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 28 },
  exerciseMeta: { color: '#a8a8a8', fontSize: 13, lineHeight: 18 },
  machineBadge: { padding: 14, borderRadius: 18, backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a', gap: 4 },
  machineBadgeLabel: { color: '#f4ae1a', fontSize: 12, fontWeight: '800' },
  machineBadgeValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  compactCard: { gap: 14 },
  exerciseGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  infoPill: { flexBasis: '31%', minWidth: 96, padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727', gap: 6 },
  infoPillLabel: { color: '#a0a0a0', fontSize: 12 },
  infoPillValue: { color: '#fff', fontWeight: '800', fontSize: 13 },
  inputLabel: { color: '#fff', fontWeight: '800', fontSize: 13 },
  input: { borderRadius: 14, borderWidth: 1, borderColor: '#353535', backgroundColor: '#0f0f0f', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  activationCard: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  activationImage: { width: 150, height: 150, borderRadius: 18, backgroundColor: '#272727' },
  activationList: { flex: 1, gap: 10 },
  activationItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activationText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  suggestionCard: { gap: 12 },
  suggestionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  suggestionText: { flex: 1, color: '#b3b3b3', lineHeight: 18, fontSize: 12 },
});
