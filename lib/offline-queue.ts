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
  /** Owner: only replayed with this user's session. */
  userId: string;
  path: string;
  method: "PATCH" | "POST" | "PUT" | "DELETE";
  /** Serialized JSON body, for writes that carry a payload. */
  body?: string;
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

/** Whether this user still has an action of this kind waiting to be replayed. */
export async function hasQueuedAction(kind: string, userId: string | undefined): Promise<boolean> {
  const queue = await readQueue();
  return queue.some((action) => action.kind === kind && action.userId === userId);
}

/**
 * A network-unreachable failure (fetch itself couldn't complete) throws a
 * plain TypeError in both the browser and React Native's fetch polyfill.
 * taurosRequest's own deliberate throws (non-2xx response, session expired)
 * are always `new Error(...)`, never TypeError — that's what distinguishes
 * "try again later" from "the server actually answered, this is a real
 * error, don't retry it forever".
 */
function isPermanentRejection(error: unknown): boolean {
  // Only a genuine 4xx rejection (400/403/404/409/422...) can never succeed.
  // Offline (TypeError), session expired (401), timeouts/rate limits and 5xx
  // are retried later instead of losing the user's data.
  const status = (error as { status?: unknown } | null)?.status;
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    ![401, 408, 429].includes(status)
  );
}

/**
 * Replays this user's queued actions, in order, with their token. Other users'
 * actions stay queued for their own next session (the queue is device-wide);
 * legacy entries without an owner are dropped since they can't be attributed.
 */
export function flushOfflineQueue(token: string | null, userId: string | undefined): Promise<void> {
  if (!token || !userId) {
    return Promise.resolve();
  }

  return enqueue(async () => {
    let queue = (await readQueue()).filter((action) => Boolean(action.userId));
    await writeQueue(queue);

    for (const next of queue.filter((action) => action.userId === userId)) {
      try {
        await taurosRequest(next.path, {
          method: next.method,
          token,
          body: next.body,
        });
      } catch (error) {
        if (!isPermanentRejection(error)) {
          // Retryable: keep this action and everything after it, in order.
          return;
        }

        // Rejected for good (stale id, validation...): drop it so it
        // doesn't jam the rest of the queue forever, and move on.
        console.warn(
          `[offline-queue] dropping "${next.id}" (${next.method} ${next.path}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      queue = queue.filter((action) => action !== next);
      await writeQueue(queue);
    }
  });
}
