import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

type TaurosExactAlarmNativeModule = {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
};

// Optional: absent on iOS, web, Expo Go and builds made before this module
// existed. Callers treat a missing module as "unknown" and never nag.
const nativeModule =
  Platform.OS === "android"
    ? requireOptionalNativeModule<TaurosExactAlarmNativeModule>(
        "TaurosExactAlarm",
      )
    : null;

/**
 * `true`/`false` on Android when the state is known (always `true` below
 * Android 12), `null` when it cannot be determined.
 */
export function canScheduleExactAlarms(): boolean | null {
  if (Platform.OS !== "android") {
    return true;
  }

  try {
    return nativeModule ? nativeModule.canScheduleExactAlarms() : null;
  } catch {
    return null;
  }
}

/**
 * Opens "Alarms & reminders" for this app (intent carries `package:<appId>`).
 * Returns false when the screen could not be opened.
 */
export function openExactAlarmSettings(): boolean {
  try {
    return nativeModule ? nativeModule.openExactAlarmSettings() : false;
  } catch {
    return false;
  }
}
