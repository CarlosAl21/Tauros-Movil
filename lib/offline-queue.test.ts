const store: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
}));
jest.mock("./tauros-api", () => ({ taurosRequest: jest.fn() }));

import {
  flushOfflineQueue,
  hasQueuedAction,
  OFFLINE_ACTIONS_QUEUE_KEY,
  queueOfflineAction,
} from "./offline-queue";
import { taurosRequest } from "./tauros-api";

const request = taurosRequest as jest.Mock;
const action = (id: string, userId: string) => ({
  id,
  kind: "set-body-weight",
  userId,
  path: `/p/${id}`,
  method: "POST" as const,
});
const queuedIds = () =>
  JSON.parse(store[OFFLINE_ACTIONS_QUEUE_KEY] ?? "[]").map(
    (item: { id: string }) => item.id,
  );
const statusError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status });

describe("offline-queue", () => {
  beforeEach(() => {
    delete store[OFFLINE_ACTIONS_QUEUE_KEY];
    request.mockReset();
  });

  it("replays only the current user's actions and drops ownerless ones", async () => {
    store[OFFLINE_ACTIONS_QUEUE_KEY] = JSON.stringify([
      { id: "legacy", kind: "x", path: "/legacy", method: "POST", queuedAt: 1 },
    ]);
    await queueOfflineAction(action("a1", "user-a"));
    await queueOfflineAction(action("b1", "user-b"));
    request.mockResolvedValue({});

    await flushOfflineQueue("token-b", "user-b");

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/p/b1", expect.objectContaining({ token: "token-b" }));
    expect(queuedIds()).toEqual(["a1"]);
    expect(await hasQueuedAction("set-body-weight", "user-a")).toBe(true);
    expect(await hasQueuedAction("set-body-weight", "user-b")).toBe(false);
  });

  it("keeps actions when the session expired (401) or the server is down", async () => {
    await queueOfflineAction(action("a1", "user-a"));
    await queueOfflineAction(action("a2", "user-a"));

    request.mockRejectedValueOnce(statusError(401));
    await flushOfflineQueue("token-a", "user-a");
    expect(queuedIds()).toEqual(["a1", "a2"]);

    request.mockRejectedValueOnce(new TypeError("Network request failed"));
    await flushOfflineQueue("token-a", "user-a");
    request.mockRejectedValueOnce(statusError(503));
    await flushOfflineQueue("token-a", "user-a");
    expect(queuedIds()).toEqual(["a1", "a2"]);
  });

  it("drops a genuinely rejected action and continues", async () => {
    await queueOfflineAction(action("a1", "user-a"));
    await queueOfflineAction(action("a2", "user-a"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    request.mockRejectedValueOnce(statusError(422)).mockResolvedValueOnce({});

    await flushOfflineQueue("token-a", "user-a");

    expect(request).toHaveBeenCalledTimes(2);
    expect(queuedIds()).toEqual([]);
    warn.mockRestore();
  });
});
