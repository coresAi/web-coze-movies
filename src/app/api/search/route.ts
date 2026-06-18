import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getOrCreateDeviceId } from '@/lib/device';
import type { MediaItem, MediaType } from '@/lib/media-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOUBAN_SEARCH_URL = 'https://movie.douban.com/j/subject_suggest';
// 真实可用的豆瓣请求头（维持登录态 + UA + Referer）
const DOUBAN_HEADERS: Record<string, string> = {
  accept: '*/*',
  'accept-language': 'zh-CN,zh;q=0.9',
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
  referer: 'https://movie.douban.com/',
};

type MediaResult = MediaItem & { favorite_status?: string | null };

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
 * 把豆瓣数据 upsert 到 media_items（以 douban_id 作为 conflict 键）
 * 保留 DB 已有的 description/actors/director/rating（如已通过详情页或 seed 写入）
 */
async function upsertDoubanItems(
  supabase: ReturnType<typeof getSupabaseClient>,
  items: DoubanSuggestItem[],
): Promise<MediaItem[]> {
  // 仅保留有 douban_id 的有效条目
  const valid = items.filter((it) => !!it.id);
  if (valid.length === 0) return [];

  const rows = valid.map((it) => {
    // 豆瓣语义：title 是 subject 的主标题（subject 详情页 v:itemReviewed 也是它），
    // sub_title 是原名/别名/补充。当两者不同，sub_title 当作 original_title。
    const main = (it.title || '').trim();
    const sub = (it.sub_title || '').trim();
    return {
      douban_id: it.id!,
      title: main || sub || '(无标题)',
      original_title: sub && sub !== main ? sub : null,
      type: normalizeType(it.type),
      year: it.year ? Number(it.year) : null,
      poster_url: it.img ?? null,
    };
  });

  // 冲突时只刷新可能被豆瓣更新的字段（title / year / type / poster_url / original_title），
  // 保留 description/actors/director/rating 等人工/详情写入的字段
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
    // 1) 调豆瓣
    const doubanList = await fetchDoubanSuggest(q);
    if (doubanList.length === 0) {
      return NextResponse.json({ results: [], source: 'douban' });
    }

    // 2) upsert 到 supabase（缓存）
    const persisted = await upsertDoubanItems(supabase, doubanList);
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
    const results: MediaResult[] = persisted
      .slice(0, 20)
      .map((m) => ({ ...m, favorite_status: favoritesByMedia[m.id] ?? null }));

    return NextResponse.json({ results, source: 'douban' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败';
    console.error('[search] douban error', message);
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
