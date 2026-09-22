import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform, Vibration } from "react-native";

/**
 * Rest-timer alerts.
 *
 * - Background / locked screen: a local notification scheduled for an absolute
 *   date. The OS fires it, so it works even if the JS thread is suspended.
 *   Android plays the sound from the channel; iOS plays `content.sound`.
 * - Foreground: the OS notification is suppressed (see the handler below) and
 *   the app plays the same sound at full volume plus strong haptics instead,
 *   so the user never hears the alert twice.
 *
 * The custom sound (`assets/sounds/rest_alarm.wav`) is bundled natively through
 * the `expo-notifications` config plugin in app.json, so changing it requires a
 * native rebuild (EAS build / expo run:*). The file name must match the
 * registered asset, and stays lowercase/underscored for Android `res/raw`.
 */
export const REST_ALARM_SOUND_FILE = "rest_alarm.wav";
// Android channel settings are immutable once created, so the id carries a
// version. Bump it (and delete the old id below) whenever the settings change.
const REST_CHANNEL_ID = "tauros-rest-alarm-v2";
const GENERAL_CHANNEL_ID = "tauros-general";
const LEGACY_CHANNEL_IDS = ["tauros-rest-reminder"];
const REST_NOTIFICATION_KIND = "rest-finished";

export type RestTimerKind = "interval" | "warmup";

// Only one scheduled notification per timer kind can exist because the
// identifier is deterministic: scheduling again replaces it (no duplicates) and
// cancelling never needs a stored id.
const restIdentifier = (kind: RestTimerKind) => `tauros-rest-${kind}`;

let channelsReady = false;
let alarmPlayer: AudioPlayer | null = null;

// Notification calls are serialised so a cancel issued right after a schedule
// (e.g. the user skips the rest immediately) always runs after it.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function canUseSystemNotifications() {
  if (Platform.OS === "web") {
    return false;
  }

  const isExpoGo =
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient";
  return !isExpoGo;
}

/**
 * Foreground behaviour. Call once at app start (root layout).
 * Rest alerts are handled in-app while the app is open, so the system banner
 * and sound are suppressed only for those; everything else keeps the default.
 */
export function configureNotificationHandler() {
  if (Platform.OS === "web") {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isRestAlert =
        notification.request.content.data?.kind === REST_NOTIFICATION_KIND;

      return {
        shouldShowBanner: !isRestAlert,
        shouldShowList: !isRestAlert,
        shouldPlaySound: !isRestAlert,
        shouldSetBadge: false,
      };
    },
  });
}

async function ensureAndroidChannels() {
  if (Platform.OS !== "android" || channelsReady) {
    return;
  }

  await Promise.all(
    LEGACY_CHANNEL_IDS.map((id) =>
      Notifications.deleteNotificationChannelAsync(id).catch(() => undefined),
    ),
  );

  await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
    name: "Fin del descanso",
    description: "Aviso sonoro cuando termina tu tiempo de descanso.",
    importance: Notifications.AndroidImportance.MAX,
    sound: REST_ALARM_SOUND_FILE,
    enableVibrate: true,
    vibrationPattern: [0, 500, 200, 500, 200, 800],
    enableLights: true,
    lightColor: "#F4AE1A",
    showBadge: false,
    // ALARM usage keeps the sound audible on the alarm volume stream, which
    // is usually louder than the notification stream and is not muted by
    // "vibrate/silent" ringer modes.
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    // Only takes effect if the user granted Do Not Disturb access.
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
    name: "General",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  channelsReady = true;
}

// Android 12+ (API 31) requires this permission for a notification to fire at
// its exact scheduled time; on Android 14+ it is OFF by default for any app
// that isn't a clock/calendar app, and there is no programmatic "request"
// dialog for it like a normal permission — the user must flip it on in
// system Settings. We can only deep-link there and ask once.
const EXACT_ALARM_PROMPT_KEY = "tauros_exact_alarm_prompted_v1";

async function ensureExactAlarmsAllowed() {
  if (Platform.OS !== "android" || (Platform.Version as number) < 31) {
    return;
  }

  try {
    const alreadyPrompted = await AsyncStorage.getItem(EXACT_ALARM_PROMPT_KEY);
    if (alreadyPrompted) {
      return;
    }
    await AsyncStorage.setItem(EXACT_ALARM_PROMPT_KEY, "1");

    Alert.alert(
      "Activa las alarmas de descanso",
      "Para que la alarma de fin de descanso suene aunque tengas la app en segundo plano, Android pide activar \"Alarmas y recordatorios\" para TaurosGym en Ajustes.",
      [
        { text: "Ahora no", style: "cancel" },
        {
          text: "Abrir ajustes",
          onPress: () => {
            void (async () => {
              try {
                await Linking.sendIntent("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
              } catch {
                await Linking.openSettings().catch(() => undefined);
              }
            })();
          },
        },
      ],
    );
  } catch {
    // Best-effort only: never block the rest of the flow on this.
  }
}

/**
 * Creates the Android channels and asks for notification permission.
 * On Android 13+ the permission prompt only appears once a channel exists,
 * so the channels are always created first.
 * Safe to call repeatedly; returns whether notifications can be delivered.
 */
export async function ensureNotificationsReady(): Promise<boolean> {
  if (!canUseSystemNotifications()) {
    return false;
  }

  try {
    await ensureAndroidChannels();

    let permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted && permissions.canAskAgain) {
      permissions = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowSound: true,
          allowBadge: true,
        },
      });
    }

    void ensureExactAlarmsAllowed();

    return (
      permissions.granted ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.warn("[rest-notifications] setup failed", error);
    return false;
  }
}

/** Schedules the "rest finished" notification for an absolute end time. */
export function scheduleRestNotification(params: {
  kind: RestTimerKind;
  title: string;
  body: string;
  endsAt: number;
}) {
  return enqueue(async () => {
    if (params.endsAt - Date.now() <= 500) {
      return;
    }

    const ready = await ensureNotificationsReady();
    if (!ready) {
      return;
    }

    try {
      const identifier = restIdentifier(params.kind);
      // Explicit cancel first: guarantees a single pending alert per kind
      // even on platforms that do not replace by identifier.
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: params.title,
          body: params.body,
          sound: REST_ALARM_SOUND_FILE,
          priority: Notifications.AndroidNotificationPriority.MAX,
          // Breaks through Focus modes when the app has the Time Sensitive
          // capability; iOS treats it as a regular alert otherwise.
          interruptionLevel: "timeSensitive",
          data: { kind: REST_NOTIFICATION_KIND, timer: params.kind },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(params.endsAt),
          channelId: REST_CHANNEL_ID,
        },
      });
    } catch (error) {
      console.warn("[rest-notifications] schedule failed", error);
    }
  });
}

/** Cancels a pending rest notification (skip, stop, leaving the screen). */
export function cancelRestNotification(kind: RestTimerKind) {
  if (!canUseSystemNotifications()) {
    return Promise.resolve();
  }

  return enqueue(async () => {
    try {
      const identifier = restIdentifier(kind);
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await Notifications.dismissNotificationAsync(identifier);
    } catch {
      // Nothing scheduled or already delivered: nothing to cancel.
    }
  });
}

/** Immediate, non-rest notification (e.g. "exercise completed"). */
export function notifyNow(title: string, body: string) {
  return enqueue(async () => {
    const ready = await ensureNotificationsReady();
    if (!ready) {
      return false;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: "default" },
        trigger: { channelId: GENERAL_CHANNEL_ID },
      });
      return true;
    } catch (error) {
      console.warn("[rest-notifications] notify failed", error);
      return false;
    }
  });
}

async function playAlarmSound() {
  if (Platform.OS === "web") {
    return;
  }

  try {
    // iOS: without `playsInSilentMode` the sound is muted by the ring/silent
    // switch. `mixWithOthers` avoids leaving other apps' audio ducked.
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
    });

    if (!alarmPlayer) {
      alarmPlayer = createAudioPlayer(
        require("../assets/sounds/rest_alarm.wav"),
      );
    }

    alarmPlayer.volume = 1;
    await alarmPlayer.seekTo(0);
    alarmPlayer.play();
  } catch (error) {
    console.warn("[rest-notifications] in-app sound failed", error);
  }
}

/** Foreground alert when a rest timer reaches zero: sound + strong haptics. */
export function playRestFinishedAlert() {
  Vibration.vibrate([0, 500, 200, 500, 200, 800]);
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(
    () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    250,
  );
  setTimeout(
    () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    600,
  );
  void playAlarmSound();
}
