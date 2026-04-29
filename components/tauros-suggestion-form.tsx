import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { TaurosButton, TaurosCard } from '@/components/tauros-ui';
import { type BackendSuggestionPayload, useTaurosBackend } from '@/lib/tauros-backend';

type TaurosSuggestionFormProps = {
  type: BackendSuggestionPayload['tipoEntidad'];
  entityId: string;
  title?: string;
  subtitle?: string;
};

export function TaurosSuggestionForm({
  type,
  entityId,
  title = 'Enviar sugerencia',
  subtitle = 'Escribe una mejora breve para el gimnasio.',
}: TaurosSuggestionFormProps) {
  const { createSuggestion } = useTaurosBackend();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sendSuggestion = async () => {
    const trimmed = content.trim();

    if (!trimmed) {
      Alert.alert('Sugerencias', 'Escribe un comentario antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      await createSuggestion({ tipoEntidad: type, entidadId: entityId, contenido: trimmed });
      setContent('');
      Alert.alert('Sugerencia enviada', 'Tu comentario se envió correctamente.');
    } catch (error) {
      Alert.alert('Sugerencias', error instanceof Error ? error.message : 'No se pudo enviar la sugerencia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TaurosCard style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="message-text-outline" size={20} color="#f4ae1a" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        placeholder="Escribe tu sugerencia"
        placeholderTextColor="#666"
        style={styles.input}
        textAlignVertical="top"
        returnKeyType="default"
      />

      <TaurosButton label={submitting ? 'Enviando...' : 'Enviar sugerencia'} onPress={sendSuggestion} disabled={submitting} />
    </TaurosCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { color: '#fff', fontWeight: '900', fontSize: 15 },
  subtitle: { color: '#9f9f9f', marginTop: 4, lineHeight: 18, fontSize: 12 },
  input: { minHeight: 96, borderRadius: 16, borderWidth: 1, borderColor: '#303030', backgroundColor: '#101010', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top', fontSize: 14 },
});