import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTaurosDate, taurosEvents } from '@/lib/tauros-data';
import { TaurosButton, TaurosCard, TaurosPill, TaurosProgressBar, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useMemo, useState } from 'react';

export default function EventsScreen() {
  const [registered, setRegistered] = useState<Record<string, boolean>>({});

  const toggledEvents = useMemo(
    () =>
      taurosEvents.map((event) => ({
        ...event,
        registered: Boolean(registered[event.id]),
      })),
    [registered]
  );

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Eventos</Text>
        <Text style={styles.pageSubtitle}>
          Consulta los eventos activos y regístrate con un toque. También puedes ver la sugerencia asociada.
        </Text>
      </View>

      <TaurosSection title="Eventos activos" subtitle="Los participantes y cupos quedan visibles para evitar dudas antes de registrarse.">
        {toggledEvents.map((event) => {
          const progress = Math.round((event.asistentes / event.cupo) * 100);

          return (
            <TaurosCard key={event.id} style={styles.eventCard}>
              <View style={styles.eventTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{event.nombre}</Text>
                  <Text style={styles.eventMeta}>{formatTaurosDate(event.fechaHora)}</Text>
                  <Text style={styles.eventLocation}>{event.lugar}</Text>
                </View>
                <TaurosPill label={event.registered ? 'Registrado' : 'Activo'} tone={event.registered ? 'success' : 'accent'} />
              </View>

              <Text style={styles.eventDescription}>{event.descripcion}</Text>

              <View style={styles.capacityRow}>
                <Text style={styles.capacityLabel}>Ocupación</Text>
                <Text style={styles.capacityLabel}>{event.asistentes}/{event.cupo}</Text>
              </View>
              <TaurosProgressBar value={progress} />

              <View style={styles.actionsRow}>
                <TaurosButton
                  compact
                  label={event.registered ? 'Cancelar' : 'Registrarme'}
                  onPress={() => setRegistered((current) => ({ ...current, [event.id]: !current[event.id] }))}
                />
                <Link href={{ pathname: '/evento/[id]', params: { id: event.id } }} asChild>
                  <Pressable style={{ flex: 1 }}>
                    <TaurosButton compact variant="ghost" label="Ver detalles" />
                  </Pressable>
                </Link>
              </View>

              <View style={styles.suggestionRow}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f4ae1a" />
                <Text style={styles.suggestionText}>
                  Recomendación: llega con 15 minutos de anticipación y mantén lista tu hidratación.
                </Text>
              </View>
            </TaurosCard>
          );
        })}
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
  eventCard: {
    gap: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  eventMeta: {
    color: '#f4ae1a',
    marginTop: 4,
    fontWeight: '700',
    fontSize: 12,
  },
  eventLocation: {
    color: '#b4b4b4',
    marginTop: 4,
    fontSize: 13,
  },
  eventDescription: {
    color: '#a8a8a8',
    lineHeight: 18,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityLabel: {
    color: '#d2d2d2',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  suggestionText: {
    flex: 1,
    color: '#b6b6b6',
    lineHeight: 18,
    fontSize: 12,
  },
});
