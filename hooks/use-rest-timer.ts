import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  cancelRestNotification,
  dismissRestNotification,
  restAlarmIsExact,
  scheduleRestNotification,
  settleExpiredRestAlarm,
  type RestTimerKind,
} from "@/lib/rest-notifications";

// A finish detected this late means the app was away (JS suspended) when the
// rest ended: the system alarm should have rung already.
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
  // The rest ended while the app was away: settle it when the user is back.
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

    // The countdown hit zero with the app in the foreground. `late` means the
    // user just came back after the rest ended in the background.
    const finish = (late: boolean) => {
      const systemAlarm = systemAlarmRef.current;
      const generation = generationRef.current;

      if (systemAlarm && !late && restAlarmIsExact()) {
        // Exact alarm: it is ringing right now; never touch it.
        onFinishedRef.current({ systemAlarm: true });
        return;
      }

      if (!systemAlarm) {
        onFinishedRef.current({ systemAlarm: false });
        return;
      }

      // Inexact alarm (no exact-alarm access) or back from the background:
      // if the notification is still pending it did not ring on time, so it
      // is cancelled and the user is alerted in-app instead.
      void settleExpiredRestAlarm(kind).then((rang) => {
        if (generationRef.current !== generation) {
          return; // A new rest started meanwhile.
        }
        if (rang && late) {
          // Rang while away and the user is back: just clear the tray.
          void dismissRestNotification(kind);
          return;
        }
        onFinishedRef.current({ systemAlarm: rang });
      });
    };

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining > 0) {
        return;
      }

      // Natural expiry: an exact system alarm is ringing right now and must
      // never be cancelled or dismissed from here.
      setEndsAt(null);

      if (AppState.currentState !== "active") {
        firedAwayRef.current = true;
        return;
      }

      finish(Date.now() - endsAt > LATE_FINISH_MS);
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
        const generation = generationRef.current;
        if (!systemAlarmRef.current) {
          // Nothing could ring while away: alert now that the user is back.
          onFinishedRef.current({ systemAlarm: false });
          return;
        }
        // Same as a late finish: clear it if it rang, otherwise cancel the
        // pending (late) alarm and alert in-app.
        void settleExpiredRestAlarm(kind).then((rang) => {
          if (generationRef.current !== generation) {
            return;
          }
          if (rang) {
            void dismissRestNotification(kind);
            return;
          }
          onFinishedRef.current({ systemAlarm: false });
        });
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
