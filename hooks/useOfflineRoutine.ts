import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadMedia, getLocalPath, isDownloaded } from '../lib/mediaCache';

const OFFLINE_ROUTINE_KEY = 'offline_routines';
const ACTIONS_QUEUE_KEY = 'offline_actions_queue';

export function useOfflineRoutine() {
  const [routines, setRoutines] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(OFFLINE_ROUTINE_KEY);
      if (raw) setRoutines(JSON.parse(raw));
    })();
  }, []);

  async function saveRoutineForOffline(routineId: string, routineData: any) {
    // routineData should include media items with {id, url}
    // Download media and update local paths
    for (const item of routineData.media || []) {
      try {
        const localPath = await downloadMedia(item.id, item.url);
        item.localPath = localPath;
      } catch (e) {
        // ignore individual failures
      }
    }

    const copy = { ...(routines as any) };
    copy[routineId] = { data: routineData, cachedAt: Date.now() };
    await AsyncStorage.setItem(OFFLINE_ROUTINE_KEY, JSON.stringify(copy));
    setRoutines(copy);
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
