import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { TaurosSessionProvider } from "@/lib/tauros-session";

export const unstable_settings = {
  anchor: "(tabs)",
};

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <TaurosSessionProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="ejercicio/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="plan/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="plan-nutricional"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="evento/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </TaurosSessionProvider>
    </SafeAreaProvider>
  );
}
