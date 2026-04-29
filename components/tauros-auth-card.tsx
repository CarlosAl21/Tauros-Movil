import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { TaurosButton, TaurosCard, TaurosPill } from '@/components/tauros-ui';
import { TaurosLoginPayload, TaurosRegisterPayload, useTaurosSession } from '@/lib/tauros-session';

const initialLogin: TaurosLoginPayload = { correo: '', password: '' };
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
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (!showRegister) {
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
      Alert.alert('Autenticación', error instanceof Error ? error.message : 'No se pudo completar el acceso');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TaurosCard style={styles.card}>
      <View style={styles.header}>
        <TaurosPill label="Tauros" tone="accent" />
        <Text style={styles.title}>{showRegister ? 'Registro' : 'Ingreso'}</Text>
        <Text style={styles.subtitle}>{showRegister ? 'Completa tus datos para entrar al sistema.' : 'Accede con tu correo y contraseña.'}</Text>
      </View>

      <View style={styles.form}>
        {!showRegister ? (
          <>
            <Field label="Correo" value={loginForm.correo} onChangeText={(value) => setLoginForm((current) => ({ ...current, correo: value }))} keyboardType="email-address" />
            <Field label="Contraseña" value={loginForm.password} onChangeText={(value) => setLoginForm((current) => ({ ...current, password: value }))} secureTextEntry />
          </>
        ) : (
          <>
            <Field label="Cédula" value={registerForm.cedula} onChangeText={(value) => setRegisterForm((current) => ({ ...current, cedula: value }))} />
            <Field label="Nombre" value={registerForm.nombre} onChangeText={(value) => setRegisterForm((current) => ({ ...current, nombre: value }))} />
            <Field label="Apellido" value={registerForm.apellido} onChangeText={(value) => setRegisterForm((current) => ({ ...current, apellido: value }))} />
            <Field label="Fecha de nacimiento" value={registerForm.fechaNacimiento} onChangeText={(value) => setRegisterForm((current) => ({ ...current, fechaNacimiento: value }))} placeholder="YYYY-MM-DD" />
            <Field label="Correo" value={registerForm.correo} onChangeText={(value) => setRegisterForm((current) => ({ ...current, correo: value }))} keyboardType="email-address" />
            <Field label="Contraseña" value={registerForm.password} onChangeText={(value) => setRegisterForm((current) => ({ ...current, password: value }))} secureTextEntry />
            <Field label="Teléfono" value={registerForm.telefono} onChangeText={(value) => setRegisterForm((current) => ({ ...current, telefono: value }))} keyboardType="phone-pad" />
          </>
        )}
      </View>

      <TaurosButton label={submitting ? 'Procesando...' : showRegister ? 'Crear cuenta' : 'Entrar'} onPress={submit} disabled={submitting} />

      <Pressable onPress={() => setShowRegister((current) => !current)} style={styles.linkRow}>
        <MaterialCommunityIcons name="account-switch-outline" size={16} color="#f4ae1a" />
        <Text style={styles.linkText}>{showRegister ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}</Text>
      </Pressable>
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
  card: { gap: 14 },
  header: { gap: 6 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  subtitle: { color: '#a9a9a9', lineHeight: 18, fontSize: 13 },
  form: { gap: 10 },
  field: { gap: 6 },
  label: { color: '#fff', fontWeight: '700', fontSize: 12 },
  input: { borderRadius: 14, borderWidth: 1, borderColor: '#303030', backgroundColor: '#0f0f0f', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 2 },
  linkText: { color: '#f4ae1a', fontWeight: '800' },
});
