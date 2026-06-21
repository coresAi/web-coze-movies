import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getOrCreateDeviceId } from '@/lib/device';
import type { ExportItem, MediaType, WatchStatus } from '@/lib/media-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUS: WatchStatus[] = ['wish', 'watching', 'watched', 'dropped'];

function normalizeType(raw: string | undefined): MediaType {
  if (raw === 'tv' || raw === 'movie') return raw;
  return 'movie';
}

function isValidStatus(s: string): s is WatchStatus {
  return ALLOWED_STATUS.includes(s as WatchStatus);
}

// POST /api/import  body: ExportItem[]
// 直接按 douban_id upsert media_items，再批量创建 favorites
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { deviceId, setCookie } = getOrCreateDeviceId(request);

  let items: ExportItem[];
  try {
    items = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: '导入列表为空' }, { status: 400 });
  }

  let imported = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      // 1. 通过 douban_id upsert media_item
      let mediaId: string | null = null;

      if (item.douban_id) {
        // 先查是否已有
        const { data: existing } = await supabase
          .from('media_items')
          .select('id')
          .eq('douban_id', item.douban_id)
          .maybeSingle();

        if (existing) {
          mediaId = existing.id;
        } else {
          // upsert by douban_id
          const { data: upserted } = await supabase
            .from('media_items')
            .upsert(
              {
                douban_id: item.douban_id,
                title: item.title || '(无标题)',
                original_title: item.original_title || null,
                type: normalizeType(item.type),
                year: item.year ?? null,
                director: item.director || null,
                actors: item.actors?.length ? item.actors : null,
                genre: item.genre?.length ? item.genre : null,
                region: item.region || null,
                poster_url: item.poster_url || null,
                rating: item.rating != null ? Number(item.rating) : null,
              },
              { onConflict: 'douban_id', ignoreDuplicates: false }
            )
            .select('id')
            .maybeSingle();

          mediaId = upserted?.id ?? null;
        }
      }

      if (!mediaId) {
        errors.push(`跳过「${item.title}」：无法确定 media`);
        continue;
      }

      // 2. upsert favorite
      const status = isValidStatus(item.status) ? item.status : 'wish';

      const { error: favErr } = await supabase
        .from('favorites')
        .upsert(
          {
            device_id: deviceId,
            media_id: mediaId,
            status,
            personal_rating: item.personal_rating ?? null,
            note: item.note ?? null,
            progress: item.progress ?? 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'device_id,media_id' }
        );

      if (favErr) {
        errors.push(`「${item.title}」收藏失败：${favErr.message}`);
        continue;
      }

      imported++;
    } catch (err) {
      errors.push(`「${item.title}」处理异常：${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  const res = NextResponse.json({
    imported,
    total: items.length,
    errors: errors.length > 0 ? errors : undefined,
  });
  if (setCookie) res.headers.set('Set-Cookie', setCookie);
  return res;
}