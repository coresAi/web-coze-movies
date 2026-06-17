// 影视相关类型
export type MediaType = 'movie' | 'tv';

export type WatchStatus = 'wish' | 'watching' | 'watched' | 'dropped';

export const STATUS_LABELS: Record<WatchStatus, string> = {
  wish: '想看',
  watching: '在看',
  watched: '看过',
  dropped: '弃剧',
};

export const STATUS_COLORS: Record<WatchStatus, string> = {
  wish: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  watching: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  watched: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  dropped: 'text-zinc-400 border-zinc-500/40 bg-zinc-500/10',
};

export interface MediaItem {
  id: string;
  title: string;
  original_title: string | null;
  type: MediaType;
  year: number | null;
  director: string | null;
  actors: string[] | null;
  genre: string[] | null;
  region: string | null;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  douban_id: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  device_id: string;
  media_id: string;
  status: WatchStatus;
  personal_rating: number | null;
  note: string | null;
  progress: number | null;
  created_at: string;
  updated_at: string;
}

export interface FavoriteWithMedia extends Favorite {
  media: MediaItem;
}
