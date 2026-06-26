'use client';

import type { WatchStatus, ExportItem } from './media-types';

const STORAGE_KEY = 'local_favorites';

export interface LocalFavorite {
  douban_id: string;
  media_id: string;
  title: string;
  original_title: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  type: 'movie' | 'tv';
  year: number | null;
  rating: number | null;
  director: string | null;
  actors: string[] | null;
  genre: string[] | null;
  region: string | null;
  description: string | null;
  status: WatchStatus;
  personal_rating: number | null;
  note: string | null;
  progress: number | null;
  created_at: string;
  updated_at: string;
}

export function getLocalFavorites(): LocalFavorite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLocalFavorite(doubanId: string): LocalFavorite | null {
  return getLocalFavorites().find((f) => f.douban_id === doubanId) ?? null;
}

export function getLocalFavoriteByMediaId(mediaId: string): LocalFavorite | null {
  return getLocalFavorites().find((f) => f.media_id === mediaId) ?? null;
}

export function upsertLocalFavorite(fav: Omit<LocalFavorite, 'created_at' | 'updated_at'> & { created_at?: string }): LocalFavorite {
  const list = getLocalFavorites();
  const idx = list.findIndex((f) => f.douban_id === fav.douban_id);
  const now = new Date().toISOString();
  let result: LocalFavorite;
  if (idx >= 0) {
    result = { ...list[idx], ...fav, updated_at: now };
    list[idx] = result;
  } else {
    result = { ...fav, created_at: fav.created_at ?? now, updated_at: now } as LocalFavorite;
    list.push(result);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return result;
}

export function removeLocalFavorite(doubanId: string): void {
  const list = getLocalFavorites().filter((f) => f.douban_id !== doubanId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function setLocalFavorites(items: LocalFavorite[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addSearchResultAsFavorite(
  item: { id: string; douban_id: string | null; title: string; poster_url: string | null; backdrop_url?: string | null; type: string; year: number | null; rating: number | null; director: string | null; actors?: string[] | null; genre?: string[] | null; region?: string | null; description?: string | null; original_title?: string | null },
  status: WatchStatus = 'wish',
): LocalFavorite {
  return upsertLocalFavorite({
    douban_id: item.douban_id ?? '',
    media_id: item.id,
    title: item.title,
    original_title: item.original_title ?? null,
    poster_url: item.poster_url ?? null,
    backdrop_url: item.backdrop_url ?? null,
    type: item.type === 'tv' ? 'tv' : 'movie',
    year: item.year ?? null,
    rating: item.rating ?? null,
    director: item.director ?? null,
    actors: item.actors ?? null,
    genre: item.genre ?? null,
    region: item.region ?? null,
    description: item.description ?? null,
    status,
    personal_rating: null,
    note: null,
    progress: 0,
    created_at: new Date().toISOString(),
  });
}

export function removeSearchResultFavorite(item: { douban_id: string | null }): void {
  if (item.douban_id) {
    removeLocalFavorite(item.douban_id);
  }
}