import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform, Vibration } from "react-native";

import {
  canScheduleExactAlarms,
  openExactAlarmSettings,
} from "../modules/tauros-exact-alarm";

/**
 * Rest-timer alarm.
 *
 * Single source of truth: when a rest starts, ONE system notification is
 * scheduled for the absolute end time. The OS fires it, so it rings whether
 * the app is in the foreground, in the background or closed:
 * - Android plays the sound configured on the rest channel (alarm stream).
 * - iOS plays `content.sound`.
 * - In the foreground the handler below presents it too (banner + sound), so
 *   the app never plays a second, in-app copy of the sound.
 *
 * The notification is only cancelled/dismissed on explicit user actions (skip,
 * stop, new rest, leaving the exercise, completing it) or after the user is
 * back in the app once it rang — never on natural expiry, which would kill the
 * alarm the moment it fires.
 *
 * The in-app sound (`playRestFinishedFallbackAlert`) is only a fallback for
 * when system notifications are unavailable (permission denied, Expo Go, web).
 *
 * The sound (`assets/sounds/rest_alarm.wav`) is bundled natively by the
 * `expo-notifications` config plugin (app.json `sounds`) and protected from
 * Android resource shrinking by `plugins/with-keep-alarm-sound.js`, so
 * changing it requires a native rebuild.
 */
export type RestTimerKind = "interval" | "warmup";

const REST_ALARM_SOUND_FILE = "rest_alarm.wav";
// Android freezes channel settings at creation time, so the id carries a
// version. Bump it and move the old id to LEGACY_CHANNEL_IDS on any change.
const REST_CHANNEL_ID = "tauros-rest-alarm-v3";
const GENERAL_CHANNEL_ID = "tauros-general";
const LEGACY_CHANNEL_IDS = ["tauros-rest-reminder", "tauros-rest-alarm-v2"];
const VIBRATION_PATTERN = [0, 500, 200, 500, 200, 800];

// Deterministic id per timer kind: scheduling again replaces the previous
// alarm and cancelling never needs a stored id.
const restIdentifier = (kind: RestTimerKind) => `tauros-rest-${kind}`;

let channelsReady: Promise<void> | null = null;
let exactAlarmPromptShown = false;
let fallbackPlayer: AudioPlayer | null = null;

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

function ensureAndroidChannels() {
  if (Platform.OS !== "android") {
    return Promise.resolve();
  }

  channelsReady ??= (async () => {
    await Promise.all(
      LEGACY_CHANNEL_IDS.map((id) =>
        Notifications.deleteNotificationChannelAsync(id).catch(() => undefined),
      ),
    );

    await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
      name: "Fin del descanso",
      description: "Alarma sonora cuando termina tu tiempo de descanso.",
      importance: Notifications.AndroidImportance.MAX,
      sound: REST_ALARM_SOUND_FILE,
      enableVibrate: true,
      vibrationPattern: VIBRATION_PATTERN,
      showBadge: false,
      // Alarm stream: louder than the notification stream and not silenced
      // by the "vibrate" ringer mode.
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      // Only effective if the user granted Do Not Disturb access.
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
  })().catch((error) => {
    channelsReady = null;
    throw error;
  });

  return channelsReady;
}

/**
 * App start (root layout): foreground presentation + channel setup.
 * Every notification, the rest alarm included, is presented in the foreground
 * with banner and sound: that system notification IS the foreground alarm.
 */
export function initializeNotifications() {
  if (!canUseSystemNotifications()) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  void ensureAndroidChannels().catch((error) =>
    console.warn("[rest-notifications] channel setup failed", error),
  );
}

/**
 * Creates the Android channels (required before the Android 13+ prompt) and
 * requests notification permission if it can still be asked.
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
        ios: { allowAlert: true, allowSound: true, allowBadge: true },
      });
    }

    return (
      permissions.granted ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.warn("[rest-notifications] setup failed", error);
    return false;
  }
}

/**
 * Android 12+ needs "Alarms & reminders" access for the alarm to fire at the
 * exact second (Android 14+ denies it by default); without it the OS may
 * deliver it minutes late. There is no runtime dialog, only a settings screen,
 * so the state is checked on every rest start and the user is asked at most
 * once per app session.
 */
function promptForExactAlarmsIfMissing() {
  if (Platform.OS !== "android" || exactAlarmPromptShown) {
    return;
  }

  // null = unknown (native module unavailable): never nag in that case.
  if (canScheduleExactAlarms() !== false) {
    return;
  }

  exactAlarmPromptShown = true;
  Alert.alert(
    "Activa las alarmas de descanso",
    'Para que la alarma de fin de descanso suene a tiempo con la app en segundo plano o cerrada, activa "Alarmas y recordatorios" para TaurosGym en Ajustes.',
    [
      { text: "Ahora no", style: "cancel" },
      {
        text: "Abrir ajustes",
        onPress: () => {
          if (!openExactAlarmSettings()) {
            void Linking.openSettings().catch(() => undefined);
          }
        },
      },
    ],
  );
}

/**
 * Schedules the rest alarm for an absolute end time, replacing any previous
 * one of the same kind. Resolves to true when the system alarm is in place
 * (it will ring by itself); false means the caller must alert in-app.
 */
export function scheduleRestNotification(params: {
  kind: RestTimerKind;
  title: string;
  body: string;
  endsAt: number;
}): Promise<boolean> {
  return enqueue(async () => {
    const ready = await ensureNotificationsReady();
    if (!ready) {
      return false;
    }

    promptForExactAlarmsIfMissing();

    try {
      const identifier = restIdentifier(params.kind);
      await clearRestNotification(identifier);

      if (params.endsAt - Date.now() <= 500) {
        return false;
      }

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: params.title,
          body: params.body,
          sound: REST_ALARM_SOUND_FILE,
          // Pre-Android 8 devices use the per-notification priority.
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: VIBRATION_PATTERN,
          data: { kind: "rest-finished", timer: params.kind },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(params.endsAt),
          channelId: REST_CHANNEL_ID,
        },
      });
      return true;
    } catch (error) {
      console.warn("[rest-notifications] schedule failed", error);
      return false;
    }
  });
}

async function clearRestNotification(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(
    () => undefined,
  );
  await Notifications.dismissNotificationAsync(identifier).catch(
    () => undefined,
  );
}

/**
 * Cancels the pending alarm and removes it from the tray. Only for explicit
 * user actions: skip, stop, completing the exercise, leaving the screen.
 */
export function cancelRestNotification(kind: RestTimerKind) {
  if (!canUseSystemNotifications()) {
    return Promise.resolve();
  }

  return enqueue(() => clearRestNotification(restIdentifier(kind)));
}

/** Removes an already delivered alarm from the tray (user is back in the app). */
export function dismissRestNotification(kind: RestTimerKind) {
  if (!canUseSystemNotifications()) {
    return Promise.resolve();
  }

  return enqueue(() =>
    Notifications.dismissNotificationAsync(restIdentifier(kind)).catch(
      () => undefined,
    ),
  );
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

/**
 * In-app alarm (loud sound + vibration) for when no system alarm could be
 * scheduled. Never used when the system notification rings, so the user
 * never hears it twice.
 */
export function playRestFinishedFallbackAlert() {
  Vibration.vibrate(VIBRATION_PATTERN);

  if (Platform.OS === "web") {
    return;
  }

  void (async () => {
    try {
      // iOS: without `playsInSilentMode` the ring/silent switch mutes it.
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        allowsRecording: false,
        shouldPlayInBackground: false,
      });

      fallbackPlayer ??= createAudioPlayer(
        require("../assets/sounds/rest_alarm.wav"),
      );
      fallbackPlayer.volume = 1;
      await fallbackPlayer.seekTo(0);
      fallbackPlayer.play();
    } catch (error) {
      console.warn("[rest-notifications] in-app sound failed", error);
    }
  })();
}
