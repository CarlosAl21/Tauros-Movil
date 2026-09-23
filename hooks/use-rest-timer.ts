import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  cancelRestNotification,
  dismissRestNotification,
  scheduleRestNotification,
  type RestTimerKind,
} from "@/lib/rest-notifications";

// A finish detected this late means the app was away (JS suspended) when the
// rest ended, so the system alarm already rang.
const LATE_FINISH_MS = 2000;

type RestFinishedInfo = {
  /** The system notification rang (or is ringing) for this rest. */
  systemAlarm: boolean;
};

type StartRestParams = {
  durationSeconds: number;
  title: string;
  body: string;
};

/**
 * Countdown for one rest timer, backed by the scheduled system alarm
 * (lib/rest-notifications.ts). `onFinished` only runs when the rest ends with
 * the app in the foreground and the user has not been alerted yet.
 */
export function useRestTimer(
  kind: RestTimerKind,
  onFinished: (info: RestFinishedInfo) => void,
) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const systemAlarmRef = useRef(false);
  // The alarm fired while the app was away: dismiss it when the user is back.
  const firedAwayRef = useRef(false);
  // Discards schedule results that resolve after the rest was replaced/stopped.
  const generationRef = useRef(0);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (endsAt === null) {
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining > 0) {
        return;
      }

      // Natural expiry: the system alarm is ringing right now. It must never
      // be cancelled or dismissed from here.
      setEndsAt(null);
      const systemAlarm = systemAlarmRef.current;

      if (AppState.currentState !== "active") {
        firedAwayRef.current = true;
        return;
      }

      const late = Date.now() - endsAt > LATE_FINISH_MS;
      if (late && systemAlarm) {
        // Back in the app after it already rang: just clear the tray.
        void dismissRestNotification(kind);
        return;
      }

      onFinishedRef.current({ systemAlarm });
    };

    tick();
    const timer = setInterval(tick, 1000);
    // Timers are throttled/suspended in the background: recompute on return.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        tick();
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [endsAt, kind]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && firedAwayRef.current) {
        firedAwayRef.current = false;
        void dismissRestNotification(kind);
      }
    });

    return () => subscription.remove();
  }, [kind]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    systemAlarmRef.current = false;
    firedAwayRef.current = false;
    setEndsAt(null);
    setSecondsLeft(0);
    void cancelRestNotification(kind);
  }, [kind]);

  const start = useCallback(
    ({ durationSeconds, title, body }: StartRestParams) => {
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        stop();
        return;
      }

      const generation = ++generationRef.current;
      const nextEndsAt = Date.now() + durationSeconds * 1000;
      systemAlarmRef.current = false;
      firedAwayRef.current = false;
      setEndsAt(nextEndsAt);
      setSecondsLeft(durationSeconds);

      // Replaces (cancels + dismisses) any previous alarm of this kind.
      void scheduleRestNotification({
        kind,
        title,
        body,
        endsAt: nextEndsAt,
      }).then((scheduled) => {
        if (generationRef.current === generation) {
          systemAlarmRef.current = scheduled;
        }
      });
    },
    [kind, stop],
  );

  // Leaving the exercise must never leave an alarm pending.
  useEffect(() => {
    return () => {
      void cancelRestNotification(kind);
    };
  }, [kind]);

  return { secondsLeft, start, stop };
}
