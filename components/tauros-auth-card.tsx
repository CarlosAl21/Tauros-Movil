import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { TaurosButton, TaurosCard, TaurosPill } from '@/components/tauros-ui';
import { TaurosLoginPayload, TaurosRegisterPayload, useTaurosSession } from '@/lib/tauros-session';

const initialLogin: TaurosLoginPayload = {
  correo: '',
  password: '',
};

const initialRegister: TaurosRegisterPayload = {
  cedula: '',
  nombre: '',
  apellido: '',
  fechaNacimiento: '',
  correo: '',
  password: '',
  telefono: '',
};

export function TaurosAuthCard() {
  const { login, register } = useTaurosSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'login') {
        if (!loginForm.correo || !loginForm.password) {
          throw new Error('Completa correo y contraseña');
        }
        await login(loginForm);
        return;
      }

      if (!registerForm.cedula || !registerForm.nombre || !registerForm.apellido || !registerForm.fechaNacimiento || !registerForm.correo || !registerForm.password || !registerForm.telefono) {
        throw new Error('Completa todos los campos del registro');
      }

      await register(registerForm);
    } catch (error) {
      Alert.alert('Autenticación', error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TaurosCard style={styles.card}>
      <View style={styles.header}>
        <TaurosPill label="Acceso Tauros" tone="accent" />
        <Text style={styles.title}>Inicia sesión para sincronizar tus rutinas con el backend</Text>
        <Text style={styles.subtitle}>Los ejercicios, planes, horarios y eventos se cargan desde la API real del sistema.</Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode('login')} style={[styles.modeButton, mode === 'login' ? styles.modeButtonActive : undefined]}>
          <Text style={[styles.modeText, mode === 'login' ? styles.modeTextActive : undefined]}>Ingresar</Text>
        </Pressable>
        <Pressable onPress={() => setMode('register')} style={[styles.modeButton, mode === 'register' ? styles.modeButtonActive : undefined]}>
          <Text style={[styles.modeText, mode === 'register' ? styles.modeTextActive : undefined]}>Registrar</Text>
        </Pressable>
      </View>

      {mode === 'login' ? (
        <View style={styles.form}>
          <Field label="Correo" value={loginForm.correo} onChangeText={(value) => setLoginForm((current) => ({ ...current, correo: value }))} keyboardType="email-address" />
          <Field label="Contraseña" value={loginForm.password} onChangeText={(value) => setLoginForm((current) => ({ ...current, password: value }))} secureTextEntry />
        </View>
      ) : (
        <View style={styles.form}>
          <Field label="Cédula" value={registerForm.cedula} onChangeText={(value) => setRegisterForm((current) => ({ ...current, cedula: value }))} />
          <Field label="Nombre" value={registerForm.nombre} onChangeText={(value) => setRegisterForm((current) => ({ ...current, nombre: value }))} />
          <Field label="Apellido" value={registerForm.apellido} onChangeText={(value) => setRegisterForm((current) => ({ ...current, apellido: value }))} />
          <Field label="Fecha de nacimiento" value={registerForm.fechaNacimiento} onChangeText={(value) => setRegisterForm((current) => ({ ...current, fechaNacimiento: value }))} placeholder="YYYY-MM-DD" />
          <Field label="Correo" value={registerForm.correo} onChangeText={(value) => setRegisterForm((current) => ({ ...current, correo: value }))} keyboardType="email-address" />
          <Field label="Contraseña" value={registerForm.password} onChangeText={(value) => setRegisterForm((current) => ({ ...current, password: value }))} secureTextEntry />
          <Field label="Teléfono" value={registerForm.telefono} onChangeText={(value) => setRegisterForm((current) => ({ ...current, telefono: value }))} keyboardType="phone-pad" />
        </View>
      )}

      <TaurosButton label={submitting ? 'Procesando...' : mode === 'login' ? 'Entrar al sistema' : 'Crear cuenta'} onPress={submit} disabled={submitting} />

      <View style={styles.tipRow}>
        <MaterialCommunityIcons name="shield-account-outline" size={18} color="#f4ae1a" />
        <Text style={styles.tipText}>La sesión se guarda en el dispositivo para que no tengas que iniciar cada vez.</Text>
      </View>
    </TaurosCard>
  );
}

function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor="#666" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  header: {
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#ababab',
    lineHeight: 18,
    fontSize: 13,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(244, 174, 26, 0.12)',
    borderColor: 'rgba(244, 174, 26, 0.3)',
  },
  modeText: {
    color: '#b4b4b4',
    fontWeight: '800',
  },
  modeTextActive: {
    color: '#f4ae1a',
  },
  form: {
    gap: 10,
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#343434',
    backgroundColor: '#0f0f0f',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    color: '#a8a8a8',
    lineHeight: 18,
    fontSize: 12,
  },
});
