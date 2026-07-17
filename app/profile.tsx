import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import {
    openBrowserAsync,
    WebBrowserPresentationStyle,
} from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    TaurosButton,
    TaurosCard,
    TaurosHeader,
    TaurosScreen,
    TaurosSection,
} from "@/components/tauros-ui";
import {
    type BackendNutritionPlan,
    useTaurosBackend,
} from "@/lib/tauros-backend";
import { TAUROS_API_BASE_URL } from "@/lib/tauros-api";
import { useTaurosSession } from "@/lib/tauros-session";

const PRIVACY_URL = `${TAUROS_API_BASE_URL}/privacy`;
const TERMS_URL = `${TAUROS_API_BASE_URL}/terms`;

async function openLegalDocument(url: string) {
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch (_error) {
    Alert.alert("Enlace", "No se pudo abrir el documento.");
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    persistentWeight,
    setPersistentWeight,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
  } = useTaurosSession();
  const { nutritionPlans } = useTaurosBackend();
  const latestNutritionPlan = pickLatestNutritionPlan(nutritionPlans);

  const [nombre, setNombre] = useState(user?.nombre ?? "");
  const [apellido, setApellido] = useState(user?.apellido ?? "");
  const [correo, setCorreo] = useState(user?.correo ?? "");
  const [weightInput, setWeightInput] = useState(
    String(persistentWeight || ""),
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPersonalEdit, setShowPersonalEdit] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fullName =
    [user?.nombre, user?.apellido].filter(Boolean).join(" ") || "-";

  useEffect(() => {
    setNombre(user?.nombre ?? "");
    setApellido(user?.apellido ?? "");
    setCorreo(user?.correo ?? "");
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowPersonalEdit(false);
        setShowWeightForm(false);
      };
    }, []),
  );

  const savePersonalData = async () => {
    if (!nombre.trim() || !apellido.trim() || !correo.trim()) {
      Alert.alert("Perfil", "Completa nombre, apellido y correo.");
      return;
    }

    if (
      (currentPassword || newPassword || confirmPassword) &&
      !currentPassword
    ) {
      Alert.alert("Contraseña", "Debes ingresar tu contraseña actual.");
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        Alert.alert(
          "Contraseña",
          "La nueva contraseña debe tener al menos 6 caracteres.",
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert(
          "Contraseña",
          "La confirmación no coincide con la nueva contraseña.",
        );
        return;
      }
    }

    try {
      setSaving(true);
      await updateProfile({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim(),
      });

      if (newPassword) {
        await changePassword(currentPassword, newPassword);
        Alert.alert(
          "Contraseña actualizada",
          "Por seguridad se cerró tu sesión. Ingresa nuevamente.",
        );
        router.replace("/");
        return;
      }

      Alert.alert("Perfil", "Datos personales actualizados.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPersonalEdit(false);
    } catch (err) {
      Alert.alert(
        "Perfil",
        err instanceof Error ? err.message : "No se pudo guardar.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveWeight = async () => {
    const parsed = Number(weightInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Peso", "Ingresa un peso válido mayor a 0.");
      return;
    }

    try {
      setSaving(true);
      await setPersistentWeight(parsed);
      Alert.alert("Peso", "Peso registrado correctamente.");
      setShowWeightForm(false);
    } catch (err) {
      Alert.alert(
        "Peso",
        err instanceof Error ? err.message : "No se pudo registrar el peso.",
      );
    } finally {
      setSaving(false);
    }
  };

  const runDeleteAccount = async () => {
    try {
      setDeleting(true);
      await deleteAccount();
      router.replace("/");
    } catch (err) {
      Alert.alert(
        "Eliminar cuenta",
        err instanceof Error ? err.message : "No se pudo eliminar la cuenta.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta acción es irreversible: se eliminarán tus datos personales y perderás el acceso a tu cuenta. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: runDeleteAccount,
        },
      ],
    );
  };

  return (
    <TaurosScreen>
      <TaurosHeader
        title="Perfil"
        subtitle="Gestiona tus datos y tu avance"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TaurosCard style={styles.card}>
            <View style={styles.avatarWrap}>
              <Image
                source={require("../assets/images/tauros-logo.png")}
                style={styles.avatar}
                contentFit="contain"
              />
            </View>

            <Text style={styles.infoText}>Nombre: {fullName}</Text>
            <Text style={styles.infoText}>Correo: {user?.correo || "-"}</Text>
            <Text style={styles.infoText}>
              Peso actual:{" "}
              {persistentWeight ? `${persistentWeight} kg` : "No registrado"}
            </Text>

            <TaurosButton
              label={
                showPersonalEdit
                  ? "Ocultar edición personal"
                  : "Editar datos personales"
              }
              variant={showPersonalEdit ? "secondary" : "primary"}
              onPress={() => {
                setShowPersonalEdit((current) => !current);
                if (!showPersonalEdit) {
                  setShowWeightForm(false);
                }
              }}
            />

            <TaurosButton
              label={
                showWeightForm ? "Ocultar registro de peso" : "Registrar peso"
              }
              variant={showWeightForm ? "secondary" : "primary"}
              onPress={() => {
                setShowWeightForm((current) => !current);
                if (!showWeightForm) {
                  setShowPersonalEdit(false);
                }
              }}
            />

            <TaurosButton
              variant="ghost"
              label="Cerrar sesión"
              onPress={async () => {
                await logout();
                router.replace("/");
              }}
            />

            <TaurosButton
              variant="ghost"
              label={deleting ? "Eliminando..." : "Eliminar cuenta"}
              disabled={deleting}
              onPress={confirmDeleteAccount}
              style={styles.dangerButton}
              labelStyle={styles.dangerButtonLabel}
            />

            {latestNutritionPlan ? (
              <TaurosButton
                label="Ver plan nutricional"
                variant="secondary"
                onPress={() => router.push("/plan-nutricional" as never)}
              />
            ) : null}
          </TaurosCard>

          {showPersonalEdit ? (
            <TaurosSection
              title="Editar datos personales"
              subtitle="Aquí no se cambia el peso."
            >
              <TaurosCard style={styles.card}>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Nombre</Text>
                  <TextInput
                    value={nombre}
                    onChangeText={setNombre}
                    style={styles.input}
                    placeholder="Nombre"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Apellido</Text>
                  <TextInput
                    value={apellido}
                    onChangeText={setApellido}
                    style={styles.input}
                    placeholder="Apellido"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Correo</Text>
                  <TextInput
                    value={correo}
                    onChangeText={setCorreo}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    placeholder="Correo"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.separator} />

                <Text style={styles.label}>Cambiar contraseña (opcional)</Text>

                <View style={styles.fieldRow}>
                  <Text style={styles.mutedLabel}>Contraseña actual</Text>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.mutedLabel}>Nueva contraseña</Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <Text style={styles.mutedLabel}>
                    Confirmar nueva contraseña
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    style={styles.input}
                    placeholder="Repite la nueva contraseña"
                    placeholderTextColor="#666"
                  />
                </View>

                <TaurosButton
                  label={saving ? "Guardando..." : "Guardar datos personales"}
                  onPress={savePersonalData}
                  disabled={saving}
                />
              </TaurosCard>
            </TaurosSection>
          ) : null}

          {showWeightForm ? (
            <TaurosSection
              title="Registrar peso"
              subtitle="El peso se gestiona por separado para evitar cambios accidentales."
            >
              <TaurosCard style={styles.card}>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Peso (kg)</Text>
                  <TextInput
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="0.0"
                    placeholderTextColor="#666"
                  />
                </View>

                <TaurosButton
                  label={saving ? "Registrando..." : "Guardar peso"}
                  onPress={saveWeight}
                  disabled={saving}
                />
              </TaurosCard>
            </TaurosSection>
          ) : null}

          <TaurosSection
            title="Información y condiciones"
            subtitle="Términos de uso básicos"
          >
            <TaurosCard>
              <Text style={styles.termsText}>
                Usa la app con responsabilidad. Los entrenamientos son
                orientativos y no sustituyen una valoración profesional.
              </Text>
              <Pressable onPress={() => openLegalDocument(PRIVACY_URL)}>
                <Text style={styles.legalLink}>Política de privacidad</Text>
              </Pressable>
              <Pressable onPress={() => openLegalDocument(TERMS_URL)}>
                <Text style={styles.legalLink}>Términos de uso</Text>
              </Pressable>
            </TaurosCard>
          </TaurosSection>
        </ScrollView>
      </KeyboardAvoidingView>
    </TaurosScreen>
  );
}

function pickLatestNutritionPlan(plans: BackendNutritionPlan[]) {
  if (!plans.length) {
    return null;
  }

  return plans.reduce<BackendNutritionPlan>((latest, current) => {
    const latestTime = new Date(latest.createdAt || 0).getTime();
    const currentTime = new Date(current.createdAt || 0).getTime();
    return currentTime > latestTime ? current : latest;
  }, plans[0]);
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  card: { gap: 12 },
  avatarWrap: { alignItems: "center" },
  avatar: { width: 120, height: 60 },
  infoText: { color: "#d3d3d3", fontWeight: "700" },
  fieldRow: { gap: 6 },
  label: { color: "#cfcfcf", fontWeight: "800" },
  mutedLabel: { color: "#9f9f9f", fontWeight: "700" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#0b0b0b",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  separator: { height: 1, backgroundColor: "#2f2f2f", marginVertical: 4 },
  termsText: { color: "#bdbdbd", lineHeight: 20 },
  legalLink: {
    color: "#f4ae1a",
    fontWeight: "800",
    marginTop: 10,
    textDecorationLine: "underline",
  },
  dangerButton: {
    borderColor: "#e5484d",
  },
  dangerButtonLabel: {
    color: "#e5484d",
  },
});
