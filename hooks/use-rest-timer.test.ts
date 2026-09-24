import { createElement } from "react";
import type { ReactElement } from "react";

// No @types/react-test-renderer in the project: type only what is used.
type ReactTestRenderer = {
  update(element: ReactElement): void;
  unmount(): void;
};
const { act, create } = require("react-test-renderer") as {
  act(callback: () => void): void;
  act(callback: () => Promise<void>): Promise<void>;
  create(element: ReactElement): ReactTestRenderer;
};

// Minimal AppState double: the hook only reads `currentState` and listens to
// "change".
type AppStateListener = (state: string) => void;
const mockAppState = {
  currentState: "active",
  listeners: new Set<AppStateListener>(),
  set(state: string) {
    this.currentState = state;
    this.listeners.forEach((listener) => listener(state));
  },
};

jest.mock("react-native", () => ({
  AppState: {
    get currentState() {
      return mockAppState.currentState;
    },
    addEventListener: (_event: string, listener: AppStateListener) => {
      mockAppState.listeners.add(listener);
      return { remove: () => mockAppState.listeners.delete(listener) };
    },
  },
}));

jest.mock("@/lib/rest-notifications", () => ({
  scheduleRestNotification: jest.fn(async () => true),
  cancelRestNotification: jest.fn(async () => undefined),
  dismissRestNotification: jest.fn(async () => undefined),
  settleExpiredRestAlarm: jest.fn(async () => true),
  restAlarmIsExact: jest.fn(() => true),
}));

import {
  cancelRestNotification,
  dismissRestNotification,
  scheduleRestNotification,
  settleExpiredRestAlarm,
} from "@/lib/rest-notifications";

import { useRestTimer } from "./use-rest-timer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const schedule = scheduleRestNotification as jest.Mock;
const cancel = cancelRestNotification as jest.Mock;
const dismiss = dismissRestNotification as jest.Mock;
const settle = settleExpiredRestAlarm as jest.Mock;

type Timer = ReturnType<typeof useRestTimer>;

function mountTimer() {
  const onFinished = jest.fn();
  let timer: Timer | null = null;
  function Harness() {
    // New callback identity on every render, like an inline screen callback.
    timer = useRestTimer("interval", (info) => onFinished(info));
    return null;
  }

  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(createElement(Harness));
  });

  return {
    onFinished,
    get timer() {
      return timer as unknown as Timer;
    },
    rerender: () =>
      act(() => {
        renderer!.update(createElement(Harness));
      }),
    unmount: () =>
      act(() => {
        renderer!.unmount();
      }),
  };
}

// Lets the enqueued schedule/settle promises resolve.
const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

describe("useRestTimer alarm lifecycle", () => {
  // react-test-renderer logs a deprecation notice on every create().
  const originalError = console.error;
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (String(args[0]).includes("react-test-renderer is deprecated")) {
        return;
      }
      originalError(...args);
    });
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-24T10:00:00Z"));
    mockAppState.currentState = "active";
    mockAppState.listeners.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("schedules the system alarm once, upfront, for the absolute end time", async () => {
    const view = mountTimer();
    const startedAt = Date.now();

    act(() => {
      view.timer.start({ durationSeconds: 60, title: "t", body: "b" });
    });
    await flush();

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith({
      kind: "interval",
      title: "t",
      body: "b",
      endsAt: startedAt + 60_000,
    });

    // Countdown ticks and re-renders never reschedule or cancel it.
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    view.rerender();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(view.timer.secondsLeft).toBe(30);
  });

  it("leaves the alarm untouched while the app is in the background", async () => {
    const view = mountTimer();
    act(() => {
      view.timer.start({ durationSeconds: 60, title: "t", body: "b" });
    });
    await flush();

    act(() => {
      jest.advanceTimersByTime(56_000);
      mockAppState.set("inactive");
      mockAppState.set("background");
      // Past the end time while away (JS may still tick on some devices).
      jest.advanceTimersByTime(10_000);
    });
    await flush();

    expect(cancel).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
    expect(view.onFinished).not.toHaveBeenCalled();
  });

  it("only settles the alarm once the user is back, and clears the delivered one", async () => {
    const view = mountTimer();
    act(() => {
      view.timer.start({ durationSeconds: 60, title: "t", body: "b" });
    });
    await flush();

    act(() => {
      mockAppState.set("background");
      jest.advanceTimersByTime(70_000);
    });
    act(() => {
      mockAppState.set("active");
    });
    await flush();

    expect(settle).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(view.onFinished).not.toHaveBeenCalled();
  });

  it("alerts in-app on return when the system alarm could not be scheduled", async () => {
    schedule.mockResolvedValueOnce(false);
    const view = mountTimer();
    act(() => {
      view.timer.start({ durationSeconds: 60, title: "t", body: "b" });
    });
    await flush();

    act(() => {
      mockAppState.set("background");
      jest.advanceTimersByTime(70_000);
    });
    act(() => {
      mockAppState.set("active");
    });
    await flush();

    expect(view.onFinished).toHaveBeenCalledWith({ systemAlarm: false });
  });

  it("cancels the alarm on skip and on leaving the screen", async () => {
    const view = mountTimer();
    act(() => {
      view.timer.start({ durationSeconds: 60, title: "t", body: "b" });
    });
    await flush();

    act(() => {
      view.timer.stop();
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(view.timer.secondsLeft).toBe(0);

    view.unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
