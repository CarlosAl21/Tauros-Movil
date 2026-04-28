import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosCard, TaurosPill, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendExercises } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

export default function ExercisesScreen() {
  const { token } = useTaurosSession();
  const { exercises } = useTaurosBackend();

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Ejercicios</Text>
          <Text style={styles.pageSubtitle}>Inicia sesión para ver el catálogo real del backend.</Text>
        </View>
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displayExercises = mapBackendExercises(exercises);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Ejercicios</Text>
        <Text style={styles.pageSubtitle}>Toca cualquier ejercicio para ver video, carga, notas y activación muscular.</Text>
      </View>

      <TaurosSection title="Catálogo disponible" subtitle="La tarjeta muestra la categoría separada de la máquina, como pediste.">
        {displayExercises.map((exercise) => (
          <Link key={exercise.id} href={{ pathname: '/ejercicio/[id]', params: { id: exercise.id } }} asChild>
            <Pressable>
              <TaurosCard style={styles.exerciseCard}>
                <Image source={{ uri: exercise.thumbnail }} style={styles.thumbnail} contentFit="cover" />
                <View style={styles.contentBlock}>
                  <View style={styles.exerciseTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseTitle}>{exercise.nombre}</Text>
                      <Text style={styles.exerciseMeta}>{exercise.categoria} · {exercise.tipo}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#f4ae1a" />
                  </View>

                  <View style={styles.tagsRow}>
                    <TaurosPill label={`Categoria: ${exercise.categoria}`} tone="blue" />
                    <TaurosPill label={exercise.tipo} tone="muted" />
                  </View>

                  <View style={styles.machineBlock}>
                    <View style={styles.machineNumberBox}>
                      <Text style={styles.machineNumber}>{exercise.maquina ? exercise.maquina.numero : '—'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.machineTitle}>Maquina</Text>
                      <Text style={styles.machineText}>{exercise.maquina ? `${exercise.maquina.nombre} ${exercise.maquina.numero}` : 'Sin maquina asignada'}</Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Series</Text>
                      <Text style={styles.statValue}>{exercise.series}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Carga sugerida</Text>
                      <Text style={styles.statValue}>{exercise.cargaSugerida}</Text>
                    </View>
                  </View>
                </View>
              </TaurosCard>
            </Pressable>
          </Link>
        ))}
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  topIntro: { gap: 8 },
  pageTitle: { color: '#fff', fontSize: 30, fontWeight: '900' },
  pageSubtitle: { color: '#9e9e9e', lineHeight: 20 },
  exerciseCard: { gap: 14 },
  thumbnail: { width: '100%', height: 180, borderRadius: 18, backgroundColor: '#272727' },
  contentBlock: { gap: 14 },
  exerciseTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  exerciseMeta: { color: '#a0a0a0', marginTop: 4, fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  machineBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  machineNumberBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244, 174, 26, 0.12)' },
  machineNumber: { color: '#f4ae1a', fontWeight: '900' },
  machineTitle: { color: '#fff', fontWeight: '700', fontSize: 12 },
  machineText: { color: '#b3b3b3', marginTop: 4, lineHeight: 18, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statItem: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  statLabel: { color: '#a0a0a0', fontSize: 12 },
  statValue: { color: '#fff', fontWeight: '800', marginTop: 4 },
});
