import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadMedia } from '../lib/mediaCache';
import type { BackendPlan } from '../lib/tauros-backend';

const OFFLINE_ROUTINE_KEY = 'offline_routines';
const ACTIONS_QUEUE_KEY = 'offline_actions_queue';

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
    // Extract media items from the real BackendPlan shape and download them.
    const mediaItems = extractMediaItems(routineData);
    for (const item of mediaItems) {
      try {
        await downloadMedia(item.id, item.url);
      } catch (e) {
        // ignore individual failures — best-effort cache
      }
    }

    // Read the latest stored state directly from AsyncStorage to avoid
    // stale-closure issues when called outside the component lifecycle.
    const raw = await AsyncStorage.getItem(OFFLINE_ROUTINE_KEY);
    const current: Record<string, any> = raw ? JSON.parse(raw) : {};
    current[routineId] = { data: routineData, cachedAt: Date.now() };
    await AsyncStorage.setItem(OFFLINE_ROUTINE_KEY, JSON.stringify(current));
    setRoutines(current);
  }

  async function getRoutine(routineId: string) {
    const raw = await AsyncStorage.getItem(OFFLINE_ROUTINE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    return list[routineId] ?? null;
  }

  async function queueOfflineAction(action: any) {
    const raw = await AsyncStorage.getItem(ACTIONS_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(action);
    await AsyncStorage.setItem(ACTIONS_QUEUE_KEY, JSON.stringify(queue));
  }

  async function flushQueueIfOnline(apiClient: any) {
    const raw = await AsyncStorage.getItem(ACTIONS_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    if (!queue.length) return;
    for (const action of queue) {
      try {
        // each action should have { method, url, body }
        await apiClient[action.method](action.url, action.body);
      } catch (e) {
        // stop processing on first failure to retry later
        return;
      }
    }
    // all succeeded
    await AsyncStorage.removeItem(ACTIONS_QUEUE_KEY);
  }

  return {
    routines,
    saveRoutineForOffline,
    getRoutine,
    queueOfflineAction,
    flushQueueIfOnline,
  };
}
