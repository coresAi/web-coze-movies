import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalFavorite, WatchStatus } from './types';

const STORAGE_KEY = '@lantern/favorites';

// Re-export types & constants
export { LocalFavorite, WatchStatus } from './types';
export { STATUS_LABELS, STATUS_COLORS } from './types';

export const STATUSES: WatchStatus[] = ['wish', 'watching', 'watched', 'dropped'];
export const FAV_GENRES: string[] = [];

// ---- In-memory cache ----
let _cache: LocalFavorite[] | null = null;

function setCache(val: LocalFavorite[]) {
  _cache = val;
}

async function persist(list: LocalFavorite[]) {
  setCache(list);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Call once at app startup to load cache */
export async function initStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : [];
  } catch {
    _cache = [];
  }
}

/** Sync read from cache. Returns empty array if cache not yet loaded. */
export function getFavorites(): LocalFavorite[] {
  return _cache ?? [];
}

export function getFavorite(doubanId: string): LocalFavorite | null {
  return (_cache ?? []).find((f) => f.douban_id === doubanId) ?? null;
}

export async function upsertFavorite(
  fav: Omit<LocalFavorite, 'created_at' | 'updated_at'> & { created_at?: string }
): Promise<LocalFavorite> {
  const list = [...(_cache ?? [])];
  const idx = list.findIndex((f) => f.douban_id === fav.douban_id);
  const now = new Date().toISOString();

  let result: LocalFavorite;
  if (idx >= 0) {
    result = { ...list[idx], ...fav, updated_at: now };
    list[idx] = result;
  } else {
    result = { ...fav, created_at: now, updated_at: now } as LocalFavorite;
    list.push(result);
  }

  await persist(list);
  return result;
}

export async function removeFavorite(doubanId: string): Promise<void> {
  const list = (_cache ?? []).filter((f) => f.douban_id !== doubanId);
  await persist(list);
}

export async function setFavorites(items: LocalFavorite[]): Promise<void> {
  await persist(items);
}

export function importFavorites(data: any[]): number {
  const now = new Date().toISOString();
  const list = [...(_cache ?? [])];
  const existingIds = new Set(list.map((f) => f.douban_id));
  let added = 0;

  for (const item of data) {
    const doubanId = item.douban_id;
    if (!doubanId) continue;
    if (existingIds.has(doubanId)) continue;

    list.push({
      douban_id: doubanId,
      media_id: item.media_id || doubanId,
      title: item.title || '',
      original_title: item.original_title || null,
      poster_url: item.poster_url || null,
      backdrop_url: item.backdrop_url || null,
      type: item.type === 'tv' ? 'tv' : 'movie',
      year: item.year || null,
      rating: item.rating || null,
      director: item.director || null,
      actors: item.actors || null,
      genre: item.genre || null,
      region: item.region || null,
      description: item.description || null,
      status: item.status || 'wish',
      personal_rating: item.personal_rating || null,
      note: item.note || null,
      progress: item.progress || null,
      created_at: now,
      updated_at: now,
    });
    existingIds.add(doubanId);
    added++;
  }

  setCache(list);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return added;
}

export function getStats(): {
  total: number;
  withRating: number;
  avgRating: number;
  statusBreakdown: Record<string, number>;
} {
  const list = _cache ?? [];
  const rated = list.filter((f) => f.personal_rating != null);
  const breakdown: Record<string, number> = {};
  STATUSES.forEach((s) => {
    breakdown[s] = list.filter((f) => f.status === s).length;
  });
  return {
    total: list.length,
    withRating: rated.length,
    avgRating: rated.length > 0 ? rated.reduce((a, b) => a + (b.personal_rating ?? 0), 0) / rated.length : 0,
    statusBreakdown: breakdown,
  };
}

export function addSearchResultAsFavorite(
  item: { id: string; title: string; original_title?: string | null; poster_url?: string | null; backdrop_url?: string | null; type: string; year?: number | null; rating?: number | null; director?: string | null; actors?: string[] | null; genre?: string[] | null; region?: string | null; description?: string | null; douban_id?: string | null }
): Omit<LocalFavorite, 'created_at' | 'updated_at'> {
  return {
    douban_id: item.douban_id || '',
    media_id: item.id,
    title: item.title,
    original_title: item.original_title ?? null,
    poster_url: item.poster_url ?? null,
    backdrop_url: item.backdrop_url ?? null,
    type: (item.type === 'tv' ? 'tv' : 'movie') as LocalFavorite['type'],
    year: item.year ?? null,
    rating: item.rating ?? null,
    director: item.director ?? null,
    actors: item.actors ?? null,
    genre: item.genre ?? null,
    region: item.region ?? null,
    description: item.description ?? null,
    status: 'wish' as WatchStatus,
    personal_rating: null,
    note: null,
    progress: null,
  };
}
