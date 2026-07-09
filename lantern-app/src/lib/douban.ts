import { Vendor } from './types';

const DOUBAN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Mobile Safari/537.36',
  Accept: 'application/json',
};

export interface SuggestItem {
  id: string;
  title: string;
  img: string;
  type: 'movie' | 'tv';
  year: string;
  sub_title: string;
}

export interface MediaItem {
  id: string;
  title: string;
  original_title: string | null;
  type: 'movie' | 'tv';
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
}

export async function searchDouban(q: string): Promise<MediaItem[]> {
  const suggestUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(q)}`;
  const res = await fetch(suggestUrl, {
    headers: { ...DOUBAN_HEADERS, Referer: 'https://movie.douban.com/' },
  });

  if (!res.ok) throw new Error('搜索失败，请检查网络');

  const items: SuggestItem[] = await res.json();
  const results: MediaItem[] = [];

  for (const item of items.slice(0, 20)) {
    try {
      const detail = await fetchSubjectAbstract(item.id);
      results.push({
        id: item.id,
        title: item.title,
        original_title: item.sub_title !== item.title ? item.sub_title : null,
        type: item.type,
        year: parseInt(item.year) || null,
        director: detail.directors?.[0]?.name || null,
        actors: detail.actors?.map((a: { name: string }) => a.name) || null,
        genre: detail.genres || null,
        region: detail.countries?.[0] || null,
        description: detail.intro || null,
        poster_url: item.img || null,
        backdrop_url: null,
        rating: detail.rating?.value || null,
        douban_id: item.id,
      });
    } catch {
      results.push({
        id: item.id,
        title: item.title,
        original_title: item.sub_title !== item.title ? item.sub_title : null,
        type: item.type,
        year: parseInt(item.year) || null,
        director: null,
        actors: null,
        genre: null,
        region: null,
        description: null,
        poster_url: item.img || null,
        backdrop_url: null,
        rating: null,
        douban_id: item.id,
      });
    }
  }

  return results;
}

interface SubjectAbstract {
  rating?: { value: number };
  intro?: string;
  directors?: { name: string }[];
  actors?: { name: string }[];
  genres?: string[];
  countries?: string[];
}

async function fetchSubjectAbstract(doubanId: string): Promise<SubjectAbstract> {
  const url = `https://movie.douban.com/j/subject_abstract?subject_id=${doubanId}`;
  const res = await fetch(url, {
    headers: {
      ...DOUBAN_HEADERS,
      Referer: `https://movie.douban.com/subject/${doubanId}/`,
    },
  });
  if (!res.ok) return {};
  return res.json();
}

export async function getDoubanDetail(doubanId: string): Promise<MediaItem | null> {
  try {
    const detail = await fetchSubjectAbstract(doubanId);
    return {
      id: doubanId,
      title: '',
      original_title: null,
      type: 'movie',
      year: null,
      director: detail.directors?.[0]?.name || null,
      actors: detail.actors?.map((a: { name: string }) => a.name) || null,
      genre: detail.genres || null,
      region: detail.countries?.[0] || null,
      description: detail.intro || null,
      poster_url: null,
      backdrop_url: null,
      rating: detail.rating?.value || null,
      douban_id: doubanId,
    };
  } catch {
    return null;
  }
}

export async function getDoubanVendors(doubanId: string): Promise<Vendor[]> {
  try {
    const url = `https://m.douban.com/rexxar/api/v2/movie/${doubanId}`;
    const res = await fetch(url, {
      headers: {
        ...DOUBAN_HEADERS,
        Referer: `https://movie.douban.com/subject/${doubanId}/`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.vendors || []).map(
      (v: { title: string; is_paid: boolean; url: string }) => ({
        title: v.title,
        is_paid: v.is_paid,
        url: v.url,
      })
    );
  } catch {
    return [];
  }
}
