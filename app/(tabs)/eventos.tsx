import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosEmptyState, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendEvents } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

export default function EventsScreen() {
  const { token } = useTaurosSession();
  const { events, registerForEvent } = useTaurosBackend();

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Eventos</Text>
          <Text style={styles.pageSubtitle}>Inicia sesión para consultar y registrarte en eventos activos.</Text>
        </View>
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displayEvents = mapBackendEvents(events);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Eventos</Text>
        <Text style={styles.pageSubtitle}>Consulta los eventos activos y regístrate con un toque.</Text>
      </View>

      <TaurosSection title="Eventos activos" subtitle="El backend devuelve los participantes actuales y la app habilita el registro desde aquí.">
        {displayEvents.length ? displayEvents.map((event) => {
          const progress = Math.min(100, Math.round((event.asistentes / event.cupo) * 100));

          return (
            <TaurosCard key={event.id} style={styles.eventCard}>
              <View style={styles.eventTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{event.nombre}</Text>
                  <Text style={styles.eventMeta}>{new Date(event.fechaHora).toLocaleDateString('es-EC')}</Text>
                  <Text style={styles.eventLocation}>{event.lugar}</Text>
                </View>
                <TaurosPill label={event.activo ? 'Activo' : 'Inactivo'} tone={event.activo ? 'success' : 'muted'} />
              </View>

              <Text style={styles.eventDescription}>{event.descripcion}</Text>

              <View style={styles.capacityRow}>
                <Text style={styles.capacityLabel}>Participantes</Text>
                <Text style={styles.capacityLabel}>{event.asistentes}</Text>
              </View>
              <TaurosProgressBar value={progress} />

              <View style={styles.actionsRow}>
                <TaurosButton
                  compact
                  label="Registrarme"
                  onPress={async () => {
                    try {
                      await registerForEvent(event.id);
                      Alert.alert('Registro exitoso', 'Te registraste correctamente en el evento.');
                    } catch (error) {
                      Alert.alert('Registro', error instanceof Error ? error.message : 'No se pudo registrar');
                    }
                  }}
                />
                <Link href={{ pathname: '/evento/[id]', params: { id: event.id } }} asChild>
                  <Pressable style={{ flex: 1 }}>
                    <TaurosButton compact variant="ghost" label="Ver detalles" />
                  </Pressable>
                </Link>
              </View>

              <View style={styles.suggestionRow}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f4ae1a" />
                <Text style={styles.suggestionText}>Llega con anticipación y mantén lista tu hidratación.</Text>
              </View>
            </TaurosCard>
          );
        }) : <TaurosCard><TaurosEmptyState message="No hay eventos activos disponibles en este momento." /></TaurosCard>}
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  topIntro: { gap: 8 },
  pageTitle: { color: '#fff', fontSize: 30, fontWeight: '900' },
  pageSubtitle: { color: '#9e9e9e', lineHeight: 20 },
  eventCard: { gap: 12 },
  eventTopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  eventTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  eventMeta: { color: '#f4ae1a', marginTop: 4, fontWeight: '700', fontSize: 12 },
  eventLocation: { color: '#b4b4b4', marginTop: 4, fontSize: 13 },
  eventDescription: { color: '#a8a8a8', lineHeight: 18 },
  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capacityLabel: { color: '#d2d2d2', fontSize: 12, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  suggestionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  suggestionText: { flex: 1, color: '#b6b6b6', lineHeight: 18, fontSize: 12 },
});
