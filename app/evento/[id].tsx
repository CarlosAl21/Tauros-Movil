import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosHeader, TaurosPill, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { TaurosSuggestionForm } from '../../components/tauros-suggestion-form';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendEvents } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token, user } = useTaurosSession();
  const { events, registerForEvent } = useTaurosBackend();

  if (!token) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Evento" onBack={() => router.back()} />
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const event = mapBackendEvents(events, user?.userId).find((item) => item.id === eventId);

  if (!event) {
    return (
      <TaurosScreen>
        <TaurosHeader title="Evento no encontrado" onBack={() => router.back()} />
        <TaurosCard>
          <Text style={styles.emptyText}>No se encontró el evento solicitado.</Text>
        </TaurosCard>
      </TaurosScreen>
    );
  }

  return (
    <TaurosScreen>
      <TaurosHeader title={event.nombre} subtitle={event.lugar} onBack={() => router.back()} right={<TaurosPill label="Activo" tone="success" />} />

      <TaurosCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryDate}>{new Date(event.fechaHora).toLocaleDateString('es-EC')}</Text>
            <Text style={styles.summaryDescription}>{event.descripcion}</Text>
          </View>
          <TaurosPill label="Evento" tone="blue" />
        </View>

        <View style={styles.actionsRow}>
          <TaurosButton
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
        </View>
      </TaurosCard>

      <TaurosSection title="Información del evento" subtitle="Solo datos útiles.">
        <TaurosCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color="#f4ae1a" />
            <Text style={styles.infoText}>{event.lugar}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-check-outline" size={18} color="#f4ae1a" />
            <Text style={styles.infoText}>{event.activo ? 'Evento activo' : 'Evento inactivo'}</Text>
          </View>
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Enviar sugerencia" subtitle="Solo se muestra el formulario, no el historial de sugerencias.">
        <TaurosSuggestionForm type="EVENTO" entityId={event.id} title="Comentar evento" subtitle="Cuéntale al gimnasio qué debería mejorar." />
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  emptyText: { color: '#fff', fontWeight: '700' },
  summaryCard: { gap: 14 },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  summaryDate: { color: '#f4ae1a', fontWeight: '900', fontSize: 16 },
  summaryDescription: { color: '#a1a1a1', marginTop: 6, lineHeight: 18, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  infoCard: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, color: '#fff', fontWeight: '700' },
});
