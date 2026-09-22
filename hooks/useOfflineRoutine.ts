import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadMedia } from '../lib/mediaCache';
import { queueOfflineAction as queueOfflineActionShared } from '../lib/offline-queue';
import type { BackendPlan } from '../lib/tauros-backend';

const OFFLINE_ROUTINE_KEY = 'offline_routines';

/**
 * Extract all media URLs from a BackendPlan.
 * Each exercise can have a video (linkVideo) and an animation (linkAM).
 * Returns an array of { id, url } pairs suitable for downloadMedia.
 */
function extractMediaItems(plan: BackendPlan): Array<{ id: string; url: string }> {
  const items: Array<{ id: string; url: string }> = [];
  for (const day of plan.rutinasDia ?? []) {
    for (const re of day.rutinasEjercicio ?? []) {
      const ejercicio = re.ejercicio;
      if (!ejercicio) continue;
      const { ejercicioId, linkVideo, linkAM } = ejercicio;
      if (linkVideo) {
        items.push({ id: `${ejercicioId}_video`, url: linkVideo });
      }
      if (linkAM) {
        items.push({ id: `${ejercicioId}_am`, url: linkAM });
      }
    }
  }
  return items;
}

export function useOfflineRoutine() {
  const [routines, setRoutines] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(OFFLINE_ROUTINE_KEY);
      if (raw) setRoutines(JSON.parse(raw));
    })();
  }, []);

  async function saveRoutineForOffline(routineId: string, routineData: BackendPlan) {
    // Save plan data first so it's available offline even if media download fails.
    const raw = await AsyncStorage.getItem(OFFLINE_ROUTINE_KEY);
    const current: Record<string, any> = raw ? JSON.parse(raw) : {};
    current[routineId] = { data: routineData, cachedAt: Date.now() };
    await AsyncStorage.setItem(OFFLINE_ROUTINE_KEY, JSON.stringify(current));
    setRoutines(current);

    // Download media in background — best-effort, does not block the save.
    const mediaItems = extractMediaItems(routineData);
    for (const item of mediaItems) {
      try {
        await downloadMedia(item.id, item.url);
      } catch {
        // ignore individual failures
      }
    }
  }

  async function getRoutine(routineId: string) {
    const raw = await AsyncStorage.getItem(OFFLINE_ROUTINE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    return list[routineId] ?? null;
  }

  // Legacy signatures kept only so screens/RoutineScreen.tsx (unrouted, not
  // rendered anywhere) keeps compiling. The real queue-and-retry flow now
  // lives in lib/offline-queue.ts, driven by lib/tauros-session.tsx with the
  // session token instead of an ad hoc apiClient.
  async function queueOfflineAction(action: any) {
    await queueOfflineActionShared(action);
  }

  async function flushQueueIfOnline(_apiClient: any) {
    // No-op: lib/tauros-session.tsx already flushes lib/offline-queue.ts
    // automatically on login and on every foreground return.
  }

  return {
    routines,
    saveRoutineForOffline,
    getRoutine,
    queueOfflineAction,
    flushQueueIfOnline,
  };
}
