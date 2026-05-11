import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

type Meta = {
  id: string;
  url: string;
  path: string;
  size: number;
  lastAccessed: number;
};

const META_KEY = 'media-cache-meta';
const CACHE_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}tauros_media/`;

async function loadMeta(): Promise<Meta[]> {
  const raw = await AsyncStorage.getItem(META_KEY);
  return raw ? JSON.parse(raw) as Meta[] : [];
}

async function saveMeta(list: Meta[]) {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(list));
}

export async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

export async function getLocalPath(id: string) {
  return `${CACHE_DIR}${id}`;
}

export async function isDownloaded(id: string) {
  const meta = await loadMeta();
  return meta.find(m => m.id === id) !== undefined;
}

export async function downloadMedia(id: string, url: string) {
  await ensureCacheDir();
  const path = await getLocalPath(id);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    const meta = await loadMeta();
    const item = meta.find(m => m.id === id);
    if (item) {
      item.lastAccessed = Date.now();
      await saveMeta(meta);
    }
    return path;
  }

  const download = FileSystem.createDownloadResumable(url, path);
  const res = await download.downloadAsync();
  const finalPath = res?.uri ?? path;

  const stat = await FileSystem.getInfoAsync(finalPath);
  const size = stat.exists && typeof stat.size === 'number' ? stat.size : 0;

  const meta = await loadMeta();
  meta.push({ id, url, path: finalPath, size, lastAccessed: Date.now() });
  await saveMeta(meta);

  await enforceQuota(300 * 1024 * 1024);

  return path;
}

export async function enforceQuota(maxBytes: number) {
  const meta = await loadMeta();
  let total = meta.reduce((s, m) => s + (m.size || 0), 0);
  if (total <= maxBytes) return;

  // Sort by lastAccessed ascending (least recently used first)
  const sorted = meta.sort((a, b) => a.lastAccessed - b.lastAccessed);
  while (total > maxBytes && sorted.length) {
    const item = sorted.shift();
    if (!item) break;
    try {
      await FileSystem.deleteAsync(item.path, { idempotent: true });
      total -= item.size || 0;
      const idx = meta.findIndex(m => m.id === item.id);
      if (idx >= 0) meta.splice(idx, 1);
    } catch (e) {
      // ignore and continue
      const idx = meta.findIndex(m => m.id === item.id);
      if (idx >= 0) meta.splice(idx, 1);
    }
  }

  await saveMeta(meta);
}

export async function clearCache() {
  const meta = await loadMeta();
  for (const item of meta) {
    try {
      await FileSystem.deleteAsync(item.path, { idempotent: true });
    } catch (e) {}
  }
  await saveMeta([]);
}

export async function getCachedItems() {
  return loadMeta();
}
