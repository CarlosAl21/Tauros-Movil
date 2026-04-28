import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatTaurosDate, getEventById, getSuggestionsByType } from '@/lib/tauros-data';
import { TaurosButton, TaurosCard, TaurosHeader, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection } from '@/components/tauros-ui';

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const event = useMemo(() => getEventById(Array.isArray(params.id) ? params.id[0] : params.id), [params.id]);
  const [registered, setRegistered] = useState(false);

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

  const suggestions = getSuggestionsByType('EVENTO', event.id);
  const progress = Math.round((event.asistentes / event.cupo) * 100);

  return (
    <TaurosScreen>
      <TaurosHeader
        title={event.nombre}
        subtitle={event.lugar}
        onBack={() => router.back()}
        right={<TaurosPill label={registered ? 'Registrado' : 'Evento activo'} tone={registered ? 'success' : 'accent'} />}
      />

      <TaurosCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryDate}>{formatTaurosDate(event.fechaHora)}</Text>
            <Text style={styles.summaryDescription}>{event.descripcion}</Text>
          </View>
          <TaurosPill label={`${event.asistentes}/${event.cupo}`} tone="blue" />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Cupos ocupados</Text>
            <Text style={styles.progressLabel}>{progress}%</Text>
          </View>
          <TaurosProgressBar value={progress} />
        </View>

        <View style={styles.actionsRow}>
          <TaurosButton label={registered ? 'Cancelar registro' : 'Registrarme'} onPress={() => setRegistered((current) => !current)} />
          <TaurosButton variant="ghost" label="Compartir evento" onPress={() => undefined} />
        </View>
      </TaurosCard>

      <TaurosSection title="Información del evento" subtitle="Aquí el usuario ve lo necesario antes de registrarse.">
        <TaurosCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color="#f4ae1a" />
            <Text style={styles.infoText}>{event.lugar}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-group-outline" size={18} color="#f4ae1a" />
            <Text style={styles.infoText}>{event.asistentes} participantes registrados</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-check-outline" size={18} color="#f4ae1a" />
            <Text style={styles.infoText}>{event.activo ? 'Evento activo' : 'Evento inactivo'}</Text>
          </View>
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Sugerencias de evento">
        <TaurosCard style={styles.suggestionCard}>
          {suggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.suggestionRow}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f4ae1a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle}>{suggestion.actividad}</Text>
                <Text style={styles.suggestionText}>{suggestion.contenido}</Text>
              </View>
            </View>
          ))}
        </TaurosCard>
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: '#fff',
    fontWeight: '700',
  },
  summaryCard: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  summaryDate: {
    color: '#f4ae1a',
    fontWeight: '900',
    fontSize: 16,
  },
  summaryDescription: {
    color: '#a1a1a1',
    marginTop: 6,
    lineHeight: 18,
    fontSize: 12,
  },
  progressBlock: {
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#d1d1d1',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoCard: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
  },
  suggestionCard: {
    gap: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  suggestionText: {
    color: '#b3b3b3',
    lineHeight: 18,
    fontSize: 12,
    marginTop: 4,
  },
});
