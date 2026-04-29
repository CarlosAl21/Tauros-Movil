import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosEmptyState, TaurosPill, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendEvents } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

export default function EventsScreen() {
  const router = useRouter();
  const { token, user } = useTaurosSession();
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

  const displayEvents = mapBackendEvents(events, user?.userId).filter((event) => event.activo);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Eventos</Text>
        <Text style={styles.pageSubtitle}>Consulta solo los eventos activos y entra al detalle cuando quieras.</Text>
      </View>

      <TaurosSection title="Eventos activos" subtitle="Tarjetas simples, como en el inicio.">
        {displayEvents.length ? displayEvents.map((event) => {
          return (
            <TaurosCard key={event.id} style={styles.eventCard}>
              <View style={styles.eventTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{event.nombre}</Text>
                  <Text style={styles.eventMeta}>{new Date(event.fechaHora).toLocaleDateString('es-EC')} · {event.lugar}</Text>
                </View>
                <TaurosPill label="Activo" tone="success" />
              </View>

              <Text style={styles.eventDescription}>{event.descripcion}</Text>

              <View style={styles.actionsRow}>
                <TaurosButton
                  compact
                  label={event.inscrito ? 'Inscrito' : 'Registrarme'}
                  disabled={Boolean(event.inscrito)}
                  onPress={async () => {
                    try {
                      await registerForEvent(event.id);
                      Alert.alert('Registro exitoso', 'Te registraste correctamente en el evento.');
                    } catch (error) {
                      Alert.alert('Registro', error instanceof Error ? error.message : 'No se pudo registrar');
                    }
                  }}
                />
                <TaurosButton compact variant="ghost" label="Ver detalles" onPress={() => router.push({ pathname: '/evento/[id]', params: { id: event.id } })} />
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
  actionsRow: { flexDirection: 'row', gap: 10 },
});
