import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosHeader, TaurosInfoRow, TaurosPill, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { findDisplayExerciseById, findPlanExercise, mapBackendExercises, mapBackendPlans, mapBackendSuggestions } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

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

  const effectiveCarga = carga || routineExercise?.exercise.carga || displayExercise?.cargaSugerida || '0.0 kg';
  const effectiveNotas = nota || routineExercise?.exercise.notas || displayExercise?.notas || '';
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

  return (
    <TaurosScreen>
      <TaurosHeader
        title={displayExercise.nombre}
        subtitle={`${displayExercise.categoria} · ${displayExercise.tipo}`}
        onBack={() => router.back()}
        right={<TaurosPill label={completed ? 'Completado' : 'Pendiente'} tone={completed ? 'success' : 'accent'} />}
      />

      <TaurosCard style={styles.videoCard}>
        <Video
          source={{ uri: displayExercise.linkVideo }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping
        />
        <Text style={styles.videoHint}>Mira la ejecución antes de marcar la serie como completada.</Text>
      </TaurosCard>

      <TaurosSection title="Detalle del ejercicio" subtitle="La máquina se muestra aparte de la categoría y el nombre, como en el panel admin.">
        <TaurosCard style={styles.detailCard}>
          <TaurosInfoRow label="Serie y repeticiones" value={routineExercise ? `${routineExercise.exercise.series} series · ${routineExercise.exercise.repeticiones} reps` : displayExercise.series} />
          <View style={styles.spacer} />
          <TaurosInfoRow label="Descanso" value={displayExercise.descanso} />
          <View style={styles.spacer} />
          <TaurosInfoRow label="Carga sugerida" value={effectiveCarga} />
          <View style={styles.spacer} />
          <View style={styles.machineBox}>
            <View style={styles.machineNumberBox}>
              <Text style={styles.machineNumber}>{displayExercise.maquina ? displayExercise.maquina.numero : '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.machineTitle}>Maquina</Text>
              <Text style={styles.machineValue}>{displayExercise.maquina ? `${displayExercise.maquina.nombre} ${displayExercise.maquina.numero}` : 'Sin maquina asignada'}</Text>
            </View>
          </View>
          <View style={styles.tagsRow}>
            <TaurosPill label={`Categoria: ${displayExercise.categoria}`} tone="blue" />
            <TaurosPill label={displayExercise.tipo} tone="muted" />
          </View>
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Carga, notas y completado" subtitle="Puedes guardar la carga y escribir observaciones rápidas para tu historial del día.">
        <TaurosCard style={styles.formCard}>
          <Text style={styles.inputLabel}>Carga</Text>
          <TextInput value={carga} onChangeText={setCarga} style={styles.input} placeholder={effectiveCarga} placeholderTextColor="#666" />

          <Text style={styles.inputLabel}>Notas</Text>
          <TextInput value={nota} onChangeText={setNota} multiline style={[styles.input, styles.textArea]} placeholder={effectiveNotas || 'Ejemplo: ajustar asiento, controlar recorrido, bajar carga si falta técnica'} placeholderTextColor="#666" />

          <TaurosButton label={completed ? 'Ejercicio marcado' : 'Marcar como completado'} onPress={() => setCompleted((current) => !current)} />
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Activación muscular" subtitle="Se muestra la imagen y los músculos principales que intervienen.">
        <TaurosCard style={styles.activationCard}>
          <Image source={require('../../assets/images/musculos.jpg')} style={styles.activationImage} contentFit="cover" />
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

      <TaurosSection title="Sugerencias">
        <TaurosCard style={styles.suggestionCard}>
          {exerciseSuggestions.length ? exerciseSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionRow}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f4ae1a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle}>{suggestion.actividad}</Text>
                <Text style={styles.suggestionText}>{suggestion.contenido}</Text>
              </View>
            </View>
          )) : <Text style={styles.suggestionText}>Todavía no hay sugerencias específicas para este ejercicio.</Text>}
        </TaurosCard>
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  emptyText: { color: '#fff', fontWeight: '700' },
  videoCard: { gap: 10 },
  video: { width: '100%', height: 220, borderRadius: 18, backgroundColor: '#000' },
  videoHint: { color: '#9d9d9d', lineHeight: 18, fontSize: 12 },
  detailCard: { gap: 12 },
  spacer: { height: 8 },
  machineBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  machineNumberBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244, 174, 26, 0.12)' },
  machineNumber: { color: '#f4ae1a', fontWeight: '900' },
  machineTitle: { color: '#fff', fontWeight: '800', fontSize: 12 },
  machineValue: { color: '#b1b1b1', marginTop: 4, lineHeight: 18, fontSize: 12 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  formCard: { gap: 12 },
  inputLabel: { color: '#fff', fontWeight: '800', fontSize: 13 },
  input: { borderRadius: 14, borderWidth: 1, borderColor: '#353535', backgroundColor: '#0f0f0f', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700' },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  activationCard: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  activationImage: { width: 170, height: 170, borderRadius: 18, backgroundColor: '#272727' },
  activationList: { flex: 1, gap: 10 },
  activationItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activationText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  suggestionCard: { gap: 12 },
  suggestionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  suggestionTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  suggestionText: { color: '#b3b3b3', lineHeight: 18, fontSize: 12, marginTop: 4 },
});
