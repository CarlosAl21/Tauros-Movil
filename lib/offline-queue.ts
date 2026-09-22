import AsyncStorage from "@react-native-async-storage/async-storage";

import { taurosRequest } from "./tauros-api";

/**
 * Generic offline write queue.
 *
 * When a write fails because the device has no connectivity, the caller
 * queues it here instead of losing it. `flushOfflineQueue` replays queued
 * actions in order once there is a token available again (see
 * lib/tauros-session.tsx, which calls it on login and whenever the app
 * returns to the foreground).
 *
 * Replay order matters: some endpoints (e.g. the exercise-completion toggle)
 * are not idempotent "set to X" calls, they flip state on each call, so
 * actions must be replayed in the same order they were queued.
 */
export const OFFLINE_ACTIONS_QUEUE_KEY = "offline_actions_queue";

export type QueuedAction = {
  /** Unique id, used for logging only. */
  id: string;
  /** What this action represents (for future branching, not required yet). */
  kind: string;
  path: string;
  method: "PATCH" | "POST" | "PUT" | "DELETE";
  queuedAt: number;
};

// Serializes queueOfflineAction/flushOfflineQueue calls so overlapping
// triggers (AppState change, screen mount, a fresh queue push) never read
// and write the AsyncStorage array concurrently. Same pattern as the
// notification queue in lib/rest-notifications.ts.
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => undefined);
  return run;
}

async function readQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_ACTIONS_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_ACTIONS_QUEUE_KEY, JSON.stringify(queue));
}

export function queueOfflineAction(
  action: Omit<QueuedAction, "queuedAt">,
): Promise<void> {
  return enqueue(async () => {
    const queue = await readQueue();
    queue.push({ ...action, queuedAt: Date.now() });
    await writeQueue(queue);
  });
}

export async function getQueuedActionsCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * A network-unreachable failure (fetch itself couldn't complete) throws a
 * plain TypeError in both the browser and React Native's fetch polyfill.
 * taurosRequest's own deliberate throws (non-2xx response, session expired)
 * are always `new Error(...)`, never TypeError — that's what distinguishes
 * "try again later" from "the server actually answered, this is a real
 * error, don't retry it forever".
 */
function isConnectivityError(error: unknown): boolean {
  return error instanceof TypeError;
}

/** Replays queued actions in order against the real backend. No-op without a token. */
export function flushOfflineQueue(token: string | null): Promise<void> {
  if (!token) {
    return Promise.resolve();
  }

  return enqueue(async () => {
    let queue = await readQueue();

    while (queue.length > 0) {
      const [next, ...rest] = queue;

      try {
        await taurosRequest(next.path, { method: next.method, token });
        queue = rest;
        await writeQueue(queue);
      } catch (error) {
        if (isConnectivityError(error)) {
          // Still offline (or the server is unreachable) — stop here, keep
          // this action and everything after it queued for next time.
          return;
        }

        // The server answered with a real error (stale id, forbidden,
        // etc.) — this action can never succeed as-is. Drop it so it
        // doesn't jam the rest of the queue forever, and move on.
        console.warn(
          `[offline-queue] dropping "${next.id}" (${next.method} ${next.path}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        queue = rest;
        await writeQueue(queue);
      }
    }
  });
}
