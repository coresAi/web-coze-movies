import { NextRequest, NextResponse } from 'next/server';
import type { MediaItem, MediaType } from '@/lib/media-types';

export const runtime = 'edge';

const DOUBAN_SEARCH_URL = 'https://movie.douban.com/j/subject_suggest';
const DOUBAN_ABSTRACT_URL = 'https://movie.douban.com/j/subject_abstract';
const DOUBAN_HEADERS: Record<string, string> = {
  accept: '*/*',
  'accept-language': 'zh-CN,zh;q=0.9',
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
  referer: 'https://movie.douban.com/',
  cookie: 'bid=Nu5NUcFsKtM; ll="118318"',
};

type DoubanSuggestItem = {
  episode?: string;
  img?: string;
  title: string;
  url?: string;
  type?: string;
  year?: string;
  sub_title?: string;
  id?: string;
};

type DoubanAbstractSubject = {
  rate?: string;
  star?: number;
  directors?: string[];
  actors?: string[];
  types?: string[];
  region?: string;
  duration?: string;
  release_year?: string;
  episodes_count?: string;
  subtype?: string;
  is_tv?: boolean;
  title?: string;
};

type DoubanAbstractResponse = {
  r: number;
  subject?: DoubanAbstractSubject;
};

function normalizeType(raw: string | undefined): MediaType {
  if (raw === 'tv' || raw === 'movie') return raw;
  return 'movie';
}

async function fetchDoubanSuggest(q: string): Promise<DoubanSuggestItem[]> {
  const url = `${DOUBAN_SEARCH_URL}?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: DOUBAN_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`豆瓣搜索失败: HTTP ${res.status}`);
  }
  const data = (await res.json()) as DoubanSuggestItem[];
  return Array.isArray(data) ? data : [];
}

async function fetchDoubanAbstracts(
  items: DoubanSuggestItem[],
): Promise<Map<string, DoubanAbstractSubject>> {
  const map = new Map<string, DoubanAbstractSubject>();
  await Promise.allSettled(
    items.map(async (it) => {
      if (!it.id) return;
      const url = `${DOUBAN_ABSTRACT_URL}?subject_id=${it.id}`;
      const res = await fetch(url, { headers: DOUBAN_HEADERS, cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as DoubanAbstractResponse;
      if (data.r === 0 && data.subject) {
        map.set(it.id!, data.subject);
      }
    }),
  );
  return map;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ results: [], source: 'empty' });
  }

  try {
    const doubanList = await fetchDoubanSuggest(q);
    if (doubanList.length === 0) {
      return NextResponse.json({ results: [], source: 'douban' });
    }

    const abstracts = await fetchDoubanAbstracts(doubanList);

    const results: MediaItem[] = doubanList.slice(0, 20).map((it) => {
      const main = (it.title || '').trim();
      const sub = (it.sub_title || '').trim();
      const abs = abstracts.get(it.id!);
      const doubanId = it.id ?? '';

      return {
        id: doubanId,
        title: main || sub || '(无标题)',
        original_title: sub && sub !== main ? sub : null,
        type: normalizeType(it.type),
        year: abs?.release_year ? Number(abs.release_year) : it.year ? Number(it.year) : null,
        poster_url: it.img ?? null,
        backdrop_url: null,
        director: abs?.directors?.length ? abs.directors[0] : null,
        actors: abs?.actors?.length ? abs.actors : null,
        genre: abs?.types?.length ? abs.types : null,
        region: abs?.region ?? null,
        description: null,
        rating: abs?.rate ? Number(abs.rate) : null,
        douban_id: doubanId,
        favorite_status: null,
        created_at: new Date().toISOString(),
      };
    });

    return NextResponse.json({ results, source: 'douban' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败';
    console.error('[search] douban error', message);
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
