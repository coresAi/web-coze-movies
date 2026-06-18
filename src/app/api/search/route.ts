import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getOrCreateDeviceId } from '@/lib/device';
import type { MediaItem, MediaType, WatchStatus } from '@/lib/media-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOUBAN_SEARCH_URL = 'https://movie.douban.com/j/subject_suggest';
const DOUBAN_ABSTRACT_URL = 'https://movie.douban.com/j/subject_abstract';
// 真实可用的豆瓣请求头（维持登录态 + UA + Referer）
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

/**
 * 调用豆瓣 subject_suggest 拿真实数据
 * 返回豆瓣返回的原始列表（每项含 id/title/sub_title/year/img/type）
 */
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

/**
 * 调豆瓣 subject_abstract 获取评分/演员/导演/类型/地区
 * 每个 item 并行请求，失败时静默兜底
 */
async function fetchDoubanAbstracts(
  items: DoubanSuggestItem[],
): Promise<Map<string, DoubanAbstractSubject>> {
  const map = new Map<string, DoubanAbstractSubject>();
  const results = await Promise.allSettled(
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
  // 静默忽略失败的请求
  return map;
}

/**
 * 把豆瓣数据 upsert 到 media_items（以 douban_id 作为 conflict 键）
 * 用 subject_abstract 补全评分/演员/导演/类型/地区
 */
async function upsertDoubanItems(
  supabase: ReturnType<typeof getSupabaseClient>,
  items: DoubanSuggestItem[],
  abstracts: Map<string, DoubanAbstractSubject>,
): Promise<MediaItem[]> {
  // 仅保留有 douban_id 的有效条目
  const valid = items.filter((it) => !!it.id);
  if (valid.length === 0) return [];

  const rows = valid.map((it) => {
    const main = (it.title || '').trim();
    const sub = (it.sub_title || '').trim();
    const abs = abstracts.get(it.id!);

    return {
      douban_id: it.id!,
      title: main || sub || '(无标题)',
      original_title: sub && sub !== main ? sub : null,
      type: normalizeType(it.type),
      year: abs?.release_year ? Number(abs.release_year) : it.year ? Number(it.year) : null,
      poster_url: it.img ?? null,
      director: abs?.directors?.length ? abs.directors[0] : null,
      actors: abs?.actors?.length ? abs.actors : null,
      genre: abs?.types?.length ? abs.types : null,
      region: abs?.region ?? null,
      rating: abs?.rate ? Number(abs.rate) : null,
    };
  });

  const { data, error } = await supabase
    .from('media_items')
    .upsert(rows, {
      onConflict: 'douban_id',
      ignoreDuplicates: false,
    })
    .select('*');
  if (error) throw new Error(`写入媒体库失败: ${error.message}`);
  return (data ?? []) as MediaItem[];
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ results: [], source: 'empty' });
  }

  const supabase = getSupabaseClient();
  const { deviceId } = getOrCreateDeviceId(request);

  try {
    // 1) 调豆瓣搜索
    const doubanList = await fetchDoubanSuggest(q);
    if (doubanList.length === 0) {
      return NextResponse.json({ results: [], source: 'douban' });
    }

    // 1.5) 并行获取每部影视的详情（评分/演员/导演/类型/地区）
    const abstracts = await fetchDoubanAbstracts(doubanList);

    // 2) upsert 到 supabase（缓存）
    const persisted = await upsertDoubanItems(supabase, doubanList, abstracts);
    if (persisted.length === 0) {
      return NextResponse.json({ results: [], source: 'douban' });
    }

    // 3) 关联当前设备的 favorite 状态
    const ids = persisted.map((m) => m.id);
    let favoritesByMedia: Record<string, string> = {};
    if (deviceId) {
      const { data: favs } = await supabase
        .from('favorites')
        .select('media_id, status')
        .eq('device_id', deviceId)
        .in('media_id', ids);
      favoritesByMedia = Object.fromEntries(((favs ?? []) as { media_id: string; status: string }[]).map((f) => [f.media_id, f.status]));
    }

    // 4) 按 douban 返回顺序（豆瓣默认按相关度），最多 20
    const results: MediaItem[] = persisted
      .slice(0, 20)
      .map((m) => ({ ...m, favorite_status: (favoritesByMedia[m.id] as WatchStatus | null) ?? null }));

    return NextResponse.json({ results, source: 'douban' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败';
    console.error('[search] douban error', message);
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
