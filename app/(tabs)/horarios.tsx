import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TaurosAuthCard } from '@/components/tauros-auth-card';
import { TaurosButton, TaurosCard, TaurosInfoRow, TaurosPill, TaurosScreen, TaurosSection } from '@/components/tauros-ui';
import { useTaurosBackend } from '@/lib/tauros-backend';
import { mapBackendSchedules } from '@/lib/tauros-mappers';
import { useTaurosSession } from '@/lib/tauros-session';

WebBrowser.maybeCompleteAuthSession();

function GoogleConnectCard() {
  const googleConfig = useMemo(() => {
    const expoClientId = process.env.EXPO_PUBLIC_TAUROS_GOOGLE_EXPO_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_TAUROS_GOOGLE_IOS_CLIENT_ID;
    const androidClientId = process.env.EXPO_PUBLIC_TAUROS_GOOGLE_ANDROID_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_TAUROS_GOOGLE_WEB_CLIENT_ID;

    if (!expoClientId && !iosClientId && !androidClientId && !webClientId) {
      return null;
    }

    return {
      expoClientId: expoClientId || undefined,
      iosClientId: iosClientId || undefined,
      androidClientId: androidClientId || undefined,
      webClientId: webClientId || undefined,
    };
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest(googleConfig || undefined);
  const [googleStatus, setGoogleStatus] = useState('');

  useEffect(() => {
    if (response?.type === 'success') {
      setGoogleStatus('Cuenta de Google conectada correctamente.');
    }
  }, [response]);

  if (!googleConfig) {
    return (
      <TaurosCard style={styles.googleCard}>
        <View style={styles.googleHeader}>
          <MaterialCommunityIcons name="google" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.googleTitle}>Google opcional</Text>
            <Text style={styles.googleSubtitle}>Si luego agregas las credenciales, aparecerá aquí.</Text>
          </View>
        </View>
      </TaurosCard>
    );
  }

  return (
    <TaurosCard style={styles.googleCard}>
      <View style={styles.googleHeader}>
        <MaterialCommunityIcons name="google" size={26} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.googleTitle}>Continuar con Google</Text>
          <Text style={styles.googleSubtitle}>Solo se activa cuando las credenciales están configuradas.</Text>
        </View>
      </View>

      <Pressable
        disabled={!request}
        onPress={() => promptAsync()}
        style={({ pressed }) => [styles.googleButton, !request ? styles.googleButtonDisabled : undefined, pressed && request ? styles.googleButtonPressed : undefined]}>
        <Text style={styles.googleButtonText}>{request ? 'Iniciar sesión con Google' : 'Configurando...'}</Text>
      </Pressable>

      {googleStatus ? <Text style={styles.googleStatus}>{googleStatus}</Text> : null}
    </TaurosCard>
  );
}

export default function SchedulesScreen() {
  const { token, persistentWeight, setPersistentWeight } = useTaurosSession();
  const { schedules } = useTaurosBackend();
  const [peso, setPeso] = useState(String(persistentWeight || ''));

  if (!token) {
    return (
      <TaurosScreen>
        <View style={styles.topIntro}>
          <Text style={styles.pageTitle}>Horario</Text>
          <Text style={styles.pageSubtitle}>Inicia sesión para ver el horario y guardar tu peso.</Text>
        </View>
        <TaurosAuthCard />
      </TaurosScreen>
    );
  }

  const displaySchedules = mapBackendSchedules(schedules);

  return (
    <TaurosScreen>
      <View style={styles.topIntro}>
        <Text style={styles.pageTitle}>Horario</Text>
        <Text style={styles.pageSubtitle}>Solo lo esencial: horarios y tu peso.</Text>
      </View>

      <TaurosSection title="Apertura semanal" subtitle="Información directa desde el backend.">
        <TaurosCard style={styles.scheduleCard}>
          {displaySchedules.length ? displaySchedules.map((schedule) => (
            <View key={schedule.dia} style={styles.scheduleRow}>
              <View style={styles.scheduleDayBadge}>
                <Text style={styles.scheduleDayText}>{schedule.dia.slice(0, 3)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.scheduleHeaderRow}>
                  <Text style={styles.scheduleDayTitle}>{schedule.dia}</Text>
                  {schedule.destacado ? <TaurosPill label="Clave" tone="accent" /> : null}
                </View>
                <Text style={styles.scheduleHours}>{schedule.apertura} - {schedule.cierre}</Text>
              </View>
            </View>
          )) : <Text style={styles.emptyText}>No se encontraron horarios en el backend.</Text>}
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Mi peso" subtitle="Se guarda localmente en el dispositivo.">
        <TaurosCard style={styles.profileCard}>
          <TaurosInfoRow label="Peso actual" value={persistentWeight ? `${persistentWeight} kg` : 'Pendiente'} />
          <View style={styles.weightBox}>
            <Text style={styles.weightLabel}>Peso actual (kg)</Text>
            <TextInput value={peso} onChangeText={setPeso} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor="#666" style={styles.weightInput} />
          </View>
          <TaurosButton
            label="Guardar peso"
            onPress={async () => {
              const parsed = Number(peso);
              if (!Number.isFinite(parsed)) {
                Alert.alert('Peso', 'Ingresa un valor válido');
                return;
              }
              await setPersistentWeight(parsed);
              Alert.alert('Peso actualizado', `Nuevo peso registrado: ${parsed} kg`);
            }}
          />
        </TaurosCard>
      </TaurosSection>

      <TaurosSection title="Google" subtitle="Opcional y oculto si faltan credenciales.">
        <GoogleConnectCard />
      </TaurosSection>
    </TaurosScreen>
  );
}

const styles = StyleSheet.create({
  topIntro: { gap: 8 },
  pageTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },
  pageSubtitle: { color: '#9e9e9e', lineHeight: 20 },
  scheduleCard: { gap: 14 },
  scheduleRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#262626' },
  scheduleDayBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244, 174, 26, 0.12)' },
  scheduleDayText: { color: '#f4ae1a', fontWeight: '900' },
  scheduleHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  scheduleDayTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  scheduleHours: { color: '#f4ae1a', marginTop: 4, fontWeight: '800', fontSize: 13 },
  profileCard: { gap: 12 },
  weightBox: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#171717', borderWidth: 1, borderColor: '#272727' },
  weightLabel: { color: '#fff', fontWeight: '800' },
  weightInput: { borderRadius: 14, borderWidth: 1, borderColor: '#3a3a3a', backgroundColor: '#0f0f0f', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700' },
  googleCard: { gap: 14 },
  googleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  googleSubtitle: { color: '#9e9e9e', marginTop: 4, lineHeight: 18, fontSize: 12 },
  googleButton: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  googleButtonDisabled: { opacity: 0.55 },
  googleButtonPressed: { transform: [{ scale: 0.99 }] },
  googleButtonText: { color: '#111', fontWeight: '900', textAlign: 'center' },
  googleStatus: { color: '#45c46f', fontSize: 12, lineHeight: 18 },
  emptyText: { color: '#fff', fontWeight: '700' },
});
