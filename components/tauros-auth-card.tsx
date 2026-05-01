import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    type TextInputProps,
    View,
} from "react-native";

import { TaurosButton, TaurosCard, TaurosPill } from "@/components/tauros-ui";
import {
    TaurosLoginPayload,
    TaurosRegisterPayload,
    useTaurosSession,
} from "@/lib/tauros-session";

const initialLogin: TaurosLoginPayload = { correo: "", password: "" };
const initialRegister: TaurosRegisterPayload = {
  cedula: "",
  nombre: "",
  apellido: "",
  fechaNacimiento: "",
  correo: "",
  password: "",
  telefono: "",
};

export function TaurosAuthCard() {
  const { login, register } = useTaurosSession();
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const selectedBirthDate = useMemo(
    () => parseDateString(registerForm.fechaNacimiento) || new Date(),
    [registerForm.fechaNacimiento],
  );

  const submit = async () => {
    setSubmitting(true);
    try {
      if (!showRegister) {
        if (!loginForm.correo || !loginForm.password) {
          throw new Error("Completa correo y contraseña");
        }
        await login(loginForm);
        return;
      }

      if (
        !registerForm.cedula ||
        !registerForm.nombre ||
        !registerForm.apellido ||
        !registerForm.fechaNacimiento ||
        !registerForm.correo ||
        !registerForm.password ||
        !registerForm.telefono
      ) {
        throw new Error("Completa todos los campos del registro");
      }

      if (!acceptedTerms) {
        throw new Error(
          "Debes aceptar los términos y condiciones para crear una cuenta",
        );
      }

      await register(registerForm);
    } catch (error) {
      Alert.alert(
        "Autenticación",
        error instanceof Error
          ? error.message
          : "No se pudo completar el acceso",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TaurosCard style={styles.card}>
      <View style={styles.header}>
        <TaurosPill label="Tauros" tone="accent" />
        <Text style={styles.title}>
          {showRegister ? "Registro" : "Ingreso"}
        </Text>
        <Text style={styles.subtitle}>
          {showRegister
            ? "Completa tus datos para entrar al sistema."
            : "Accede con tu correo y contraseña."}
        </Text>
      </View>

      <View style={styles.form}>
        {!showRegister ? (
          <>
            <Field
              label="Correo"
              value={loginForm.correo}
              onChangeText={(value) =>
                setLoginForm((current) => ({ ...current, correo: value }))
              }
              keyboardType="email-address"
            />
            <Field
              label="Contraseña"
              value={loginForm.password}
              onChangeText={(value) =>
                setLoginForm((current) => ({ ...current, password: value }))
              }
              secureTextEntry
            />
          </>
        ) : (
          <>
            <Field
              label="Cédula"
              value={registerForm.cedula}
              onChangeText={(value) =>
                setRegisterForm((current) => ({ ...current, cedula: value }))
              }
            />
            <Field
              label="Nombre"
              value={registerForm.nombre}
              onChangeText={(value) =>
                setRegisterForm((current) => ({ ...current, nombre: value }))
              }
            />
            <Field
              label="Apellido"
              value={registerForm.apellido}
              onChangeText={(value) =>
                setRegisterForm((current) => ({ ...current, apellido: value }))
              }
            />
            <DateField
              label="Fecha de nacimiento"
              value={registerForm.fechaNacimiento}
              onPress={() => setShowBirthDatePicker(true)}
            />
            <Field
              label="Correo"
              value={registerForm.correo}
              onChangeText={(value) =>
                setRegisterForm((current) => ({ ...current, correo: value }))
              }
              keyboardType="email-address"
            />
            <Field
              label="Contraseña"
              value={registerForm.password}
              onChangeText={(value) =>
                setRegisterForm((current) => ({ ...current, password: value }))
              }
              secureTextEntry
            />
            <Field
              label="Teléfono"
              value={registerForm.telefono}
              onChangeText={(value) =>
                setRegisterForm((current) => ({ ...current, telefono: value }))
              }
              keyboardType="phone-pad"
            />
            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((current) => !current)}
            >
              <MaterialCommunityIcons
                name={
                  acceptedTerms ? "checkbox-marked" : "checkbox-blank-outline"
                }
                size={22}
                color="#f4ae1a"
              />
              <View style={styles.termsTextWrap}>
                <Text style={styles.termsText}>
                  Acepto los términos de uso y condiciones
                </Text>
                <Pressable onPress={() => setShowTermsModal(true)}>
                  <Text style={styles.termsLink}>Ver términos</Text>
                </Pressable>
              </View>
            </Pressable>
            <Modal
              transparent
              visible={showBirthDatePicker}
              animationType="fade"
              onRequestClose={() => setShowBirthDatePicker(false)}
            >
              <Pressable
                style={styles.pickerBackdrop}
                onPress={() => setShowBirthDatePicker(false)}
              >
                <Pressable style={styles.pickerCard} onPress={() => {}}>
                  <Text style={styles.pickerTitle}>
                    Selecciona tu fecha de nacimiento
                  </Text>
                  <DateTimePicker
                    value={selectedBirthDate}
                    mode="date"
                    display="calendar"
                    maximumDate={new Date()}
                    onChange={(_event, date) => {
                      if (date) {
                        setRegisterForm((current) => ({
                          ...current,
                          fechaNacimiento: formatDateForInput(date),
                        }));
                      }
                    }}
                  />
                  <Pressable
                    style={styles.pickerDoneButton}
                    onPress={() => setShowBirthDatePicker(false)}
                  >
                    <Text style={styles.pickerDoneText}>Listo</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
            <Modal
              transparent
              visible={showTermsModal}
              animationType="fade"
              onRequestClose={() => setShowTermsModal(false)}
            >
              <Pressable
                style={styles.termsBackdrop}
                onPress={() => setShowTermsModal(false)}
              >
                <Pressable style={styles.termsModalCard} onPress={() => {}}>
                  <Text style={styles.termsModalTitle}>
                    Términos de uso y condiciones
                  </Text>
                  <Text style={styles.termsModalText}>
                    Al crear tu cuenta aceptas que Tauros procese y almacene tus
                    datos personales y de entrenamiento para brindarte el
                    servicio dentro de la app. Usa la aplicación con
                    responsabilidad y entiende que las rutinas y recomendaciones
                    son orientativas y no sustituyen una valoración profesional.
                  </Text>
                  <Pressable
                    style={styles.termsCloseButton}
                    onPress={() => setShowTermsModal(false)}
                  >
                    <Text style={styles.termsCloseText}>Entendido</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          </>
        )}
      </View>

      <TaurosButton
        label={
          submitting
            ? "Procesando..."
            : showRegister
              ? "Crear cuenta"
              : "Entrar"
        }
        onPress={submit}
        disabled={submitting || (showRegister && !acceptedTerms)}
      />

      <Pressable
        onPress={() => {
          setShowRegister((current) => !current);
          setShowTermsModal(false);
          if (!showRegister) {
            setAcceptedTerms(false);
          }
        }}
        style={styles.linkRow}
      >
        <MaterialCommunityIcons
          name="account-switch-outline"
          size={16}
          color="#f4ae1a"
        />
        <Text style={styles.linkText}>
          {showRegister ? "Ya tengo cuenta" : "Crear cuenta nueva"}
        </Text>
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

function DateField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={onPress} style={styles.dateField}>
        <Text
          style={[
            styles.dateFieldText,
            !value ? styles.dateFieldPlaceholder : undefined,
          ]}
        >
          {value || "Selecciona una fecha"}
        </Text>
        <MaterialCommunityIcons
          name="calendar-month"
          size={18}
          color="#f4ae1a"
        />
      </Pressable>
    </View>
  );
}

function parseDateString(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  header: { gap: 6 },
  title: { color: "#fff", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#a9a9a9", lineHeight: 18, fontSize: 13 },
  form: { gap: 10 },
  field: { gap: 6 },
  label: { color: "#fff", fontWeight: "700", fontSize: 12 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#303030",
    backgroundColor: "#0f0f0f",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#303030",
    backgroundColor: "#0f0f0f",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateFieldText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  dateFieldPlaceholder: { color: "#666" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 2,
  },
  linkText: { color: "#f4ae1a", fontWeight: "800" },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  termsTextWrap: { flex: 1, gap: 3 },
  termsText: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 18 },
  termsLink: { color: "#f4ae1a", fontSize: 12, fontWeight: "800" },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2f2f2f",
    gap: 12,
  },
  pickerTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f4ae1a",
  },
  pickerDoneText: { color: "#111", fontWeight: "900" },
  termsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  termsModalCard: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2f2f2f",
    gap: 14,
  },
  termsModalTitle: { color: "#fff", fontSize: 17, fontWeight: "900" },
  termsModalText: { color: "#d0d0d0", lineHeight: 20, fontSize: 13 },
  termsCloseButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f4ae1a",
  },
  termsCloseText: { color: "#111", fontWeight: "900" },
});
