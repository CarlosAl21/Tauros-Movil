import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert, Platform, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosHeader, TaurosPill, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { TaurosSuggestionForm } from '../../components/tauros-suggestion-form';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { findDisplayExerciseById, findPlanExercise, mapBackendExercises, mapBackendPlans } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

const VideoViewComponent = VideoView as unknown as ComponentType<{
  player: ReturnType<typeof useVideoPlayer>;
  style: object;
  nativeControls?: boolean;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}>;

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; day?: string; planId?: string; routineId?: string }>();
  const exerciseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const dayId = Array.isArray(params.day) ? params.day[0] : params.day;
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const routineId = Array.isArray(params.routineId) ? params.routineId[0] : params.routineId;
  const { token, user, getExerciseWeight, setExerciseWeight } = useTaurosSession();
  const { exercises, plans, toggleRoutineExerciseCompletion } = useTaurosBackend();
  const [carga, setCarga] = useState('');
  const [nota, setNota] = useState('');
  const [completed, setCompleted] = useState(false);
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [completing, setCompleting] = useState(false);
  const previousRestSecondsRef = useRef(0);

  const displayExercises = mapBackendExercises(exercises);
  const displayPlans = mapBackendPlans(plans, user?.userId);
  const displayExercise = findDisplayExerciseById(exercises, exerciseId) || displayExercises.find((item) => item.id === exerciseId) || null;
  const assignedPlans = displayPlans.filter((plan) => !plan.esPlantilla && plan.activo);
  const activePlan = (planId ? displayPlans.find((plan) => plan.id === planId) : null) || assignedPlans[assignedPlans.length - 1] || displayPlans[0];
  const routineExercise = findPlanExercise(activePlan, exerciseId);
  const targetDay = (dayId && activePlan) ? activePlan.dias.find((day) => day.id === dayId) : (routineExercise?.day || null);
  const activeRoutineId = routineId || routineExercise?.exercise.rutinaEjercicioId;
  const seriesSource = routineExercise?.exercise.series || '3';
  const intervalsTarget = parseIntervalsFromSeries(seriesSource);
  const restDuration = targetDay ? Number(targetDay.descansoSegundos ?? 60) : parseRestToSeconds(displayExercise?.descanso || '01:00');

  useEffect(() => {
    setCompleted(Boolean(routineExercise?.exercise.completado));
  }, [routineExercise?.exercise.completado]);

  useEffect(() => {
    const loadSavedCharge = async () => {
      if (!displayExercise?.id) {
        return;
      }

      const savedCharge = await getExerciseWeight(displayExercise.id);
      if (savedCharge > 0) {
        setCarga(String(savedCharge));
        return;
      }

      const fallbackCharge = routineExercise?.exercise.carga || displayExercise.cargaSugerida || '';
      const parsedCharge = Number(String(fallbackCharge).replace(/[^0-9.,]/g, '').replace(',', '.'));
      setCarga(Number.isFinite(parsedCharge) && parsedCharge > 0 ? String(parsedCharge) : '');
    };

    void loadSavedCharge();
  }, [displayExercise?.id, displayExercise?.cargaSugerida, getExerciseWeight, routineExercise?.exercise.carga]);

  useEffect(() => {
    if (restSecondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRestSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [restSecondsLeft]);

  useEffect(() => {
    if (previousRestSecondsRef.current > 0 && restSecondsLeft === 0) {
      void notifyWithSoundAndVibration('Descanso terminado', 'Ya puedes continuar con la siguiente repetición.');
    }

    previousRestSecondsRef.current = restSecondsLeft;
  }, [restSecondsLeft]);

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Ejercicio" onBack={() => router.back()} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

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
  const chargeText = carga ? `${carga} kg` : routineExercise?.exercise.carga || displayExercise.cargaSugerida || '0.0 kg';
  const notesText = nota || routineExercise?.exercise.notas || displayExercise.notas || '';
  const activationSource = displayExercise.linkAM || displayExercise.thumbnail;

  const onCompleteInterval = () => {
    if (completedIntervals >= intervalsTarget) {
      return;
    }

    setCompletedIntervals((current) => current + 1);
    setRestSecondsLeft(restDuration);
  };

  const onCompleteExercise = async () => {
    if (!activeRoutineId) {
      setCompleted((current) => !current);
      return;
    }

    try {
      setCompleting(true);
      const parsedCharge = Number(carga.replace(',', '.'));
      if (Number.isFinite(parsedCharge) && parsedCharge > 0) {
        await setExerciseWeight(displayExercise.id, parsedCharge);
      }

      const wasCompleted = completed;
      await toggleRoutineExerciseCompletion(activeRoutineId);
      const nowCompleted = !wasCompleted;
      setCompleted(nowCompleted);

      if (nowCompleted) {
        void notifyWithSoundAndVibration('Ejercicio completado', 'La carga quedó guardada para tu próximo ingreso.');
      }

      if (!nowCompleted || !targetDay) {
        return;
      }

      const currentIndex = targetDay.ejercicios.findIndex((item) => item.rutinaEjercicioId === activeRoutineId);
      const nextExercise = currentIndex >= 0 ? targetDay.ejercicios[currentIndex + 1] : undefined;

      if (nextExercise) {
        router.push({
          pathname: '/ejercicio/[id]',
          params: {
            id: nextExercise.exerciseId,
            planId: activePlan?.id || '',
            day: targetDay.id,
            routineId: nextExercise.rutinaEjercicioId || '',
          },
        });
        return;
      }

      if (activePlan?.id) {
        router.push({ pathname: '/plan/[id]', params: { id: activePlan.id } });
      }
    } finally {
      setCompleting(false);
    }
  };

  const notifyWithSoundAndVibration = async (title: string, body: string) => {
    Vibration.vibrate([0, 250, 150, 250]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(title, body);
  };

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
            <ExerciseVideo source={displayExercise.linkVideo} />
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
            <InfoPill label="Descanso" value={formatSeconds(restDuration)} />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.inputLabel}>Carga usada en este ejercicio</Text>
            <TextInput
              value={carga}
              onChangeText={setCarga}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="Ejemplo: 20"
              placeholderTextColor="#666"
            />
          </View>

          <Text style={styles.inputLabel}>Notas</Text>
          <TextInput value={nota} onChangeText={setNota} multiline style={[styles.input, styles.textArea]} placeholder={notesText || 'Escribe una nota corta'} placeholderTextColor="#666" />

          <View style={styles.intervalsCard}>
            <View style={styles.intervalHeader}>
              <Text style={styles.intervalTitle}>Intervalos de repeticiones</Text>
              <Text style={styles.intervalCounter}>{completedIntervals}/{intervalsTarget}</Text>
            </View>

            <View style={styles.intervalDots}>
              {Array.from({ length: intervalsTarget }).map((_, index) => (
                <View key={`interval-${index}`} style={[styles.intervalDot, index < completedIntervals ? styles.intervalDotDone : undefined]} />
              ))}
            </View>

            <View style={styles.restRow}>
              <Text style={styles.restLabel}>Descanso</Text>
              <Text style={styles.restValue}>{formatSeconds(restSecondsLeft)}</Text>
            </View>

            <TaurosButton
              compact
              label={completedIntervals >= intervalsTarget ? 'Intervalos completados' : 'Siguiente repetición'}
              onPress={onCompleteInterval}
              disabled={completedIntervals >= intervalsTarget}
            />
          </View>

          <TaurosButton label={completed ? 'Completado' : 'Marcar como completado'} onPress={onCompleteExercise} disabled={completing} />
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Activación muscular" subtitle="Referencia visual y grupos musculares principales.">
        <TaurosCard style={styles.activationCard}>
          <View style={styles.activationImageWrap}>
            <Image source={{ uri: activationSource }} style={styles.activationImage} contentFit="contain" />
          </View>
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

      <TaurosSection title="Enviar sugerencia" subtitle="Solo el formulario, sin historial visible.">
        <TaurosSuggestionForm type="EJERCICIO" entityId={displayExercise.id} title="Comentar ejercicio" subtitle="Escribe una mejora o una observación sobre este ejercicio." />
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

function ExerciseVideo({ source }: { source: string }) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return <VideoViewComponent player={player} style={styles.video} nativeControls={false} contentFit="cover" />;
}

function parseIntervalsFromSeries(series?: string | number | null) {
  if (series === undefined || series === null) {
    return 3;
  }

  const seriesStr = typeof series === 'number' ? String(series) : series;

  const numbers = seriesStr?.match(/\d+/g)?.map(Number).filter((value) => Number.isFinite(value)) ?? [];

  if (!numbers.length) {
    return 3;
  }

  return Math.max(1, numbers[0]);
}

function parseRestToSeconds(rest: string) {
  const [minsRaw, secsRaw] = rest.split(':');
  const mins = Number(minsRaw || 0);
  const secs = Number(secsRaw || 0);

  if (!Number.isFinite(mins) || !Number.isFinite(secs)) {
    return 60;
  }

  return Math.max(1, mins * 60 + secs);
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
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
  fieldRow: { gap: 8 },
  exerciseGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  infoPill: { flexBasis: '31%', minWidth: 96, padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727', gap: 6 },
  infoPillLabel: { color: '#a0a0a0', fontSize: 12 },
  infoPillValue: { color: '#fff', fontWeight: '800', fontSize: 13 },
  inputLabel: { color: '#fff', fontWeight: '800', fontSize: 13 },
  input: { borderRadius: 14, borderWidth: 1, borderColor: '#353535', backgroundColor: '#0f0f0f', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  intervalsCard: { gap: 10, padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#2b2b2b' },
  intervalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  intervalTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  intervalCounter: { color: '#f4ae1a', fontWeight: '900' },
  intervalDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intervalDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: '#3a3a3a' },
  intervalDotDone: { backgroundColor: '#f4ae1a' },
  restRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restLabel: { color: '#d0d0d0', fontWeight: '700' },
  restValue: { color: '#fff', fontWeight: '900', fontSize: 16 },
  activationCard: { flexDirection: 'row', gap: 18, alignItems: 'center', padding: 18 },
  activationImageWrap: {
    width: 190,
    height: 190,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  activationImage: { width: '100%', height: '100%', borderRadius: 16, backgroundColor: '#ffffff' },
  activationList: { flex: 1, gap: 12, paddingLeft: 2 },
  activationItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  activationText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
