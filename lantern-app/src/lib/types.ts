export type MediaType = 'movie' | 'tv';
export type WatchStatus = 'wish' | 'watching' | 'watched' | 'dropped';

export const STATUS_LABELS: Record<WatchStatus, string> = {
  wish: '想看',
  watching: '在看',
  watched: '看过',
  dropped: '弃剧',
};

export const STATUS_COLORS: Record<WatchStatus, string> = {
  wish: '#E8A33D',
  watching: '#6B8E5A',
  watched: '#C03B2D',
  dropped: '#9A9088',
};

export interface LocalFavorite {
  douban_id: string;
  media_id: string;
  title: string;
  original_title: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  type: MediaType;
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

export interface Vendor {
  title: string;
  is_paid: boolean;
  url: string;
}
