import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getOrCreateDeviceId } from '@/lib/device';
import type { WatchStatus, FavoriteWithMedia, MediaItem } from '@/lib/media-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUS: WatchStatus[] = ['wish', 'watching', 'watched', 'dropped'];

function isValidStatus(s: string): s is WatchStatus {
  return ALLOWED_STATUS.includes(s as WatchStatus);
}

// GET /api/favorites?status=watching  列出当前设备的收藏
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { deviceId } = getOrCreateDeviceId(request);

  const status = request.nextUrl.searchParams.get('status');

  let query = supabase
    .from('favorites')
    .select('*, media:media_items(*)')
    .eq('device_id', deviceId)
    .order('updated_at', { ascending: false });

  if (status && isValidStatus(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `查询失败: ${error.message}` }, { status: 500 });
  }

  const list = (data ?? []) as FavoriteWithMedia[];
  return NextResponse.json({ results: list, deviceId });
}

// POST /api/favorites  body: { media_id, status, personal_rating?, note?, progress? }
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { deviceId, setCookie } = getOrCreateDeviceId(request);

  let body: {
    media_id?: string;
    status?: string;
    personal_rating?: number | null;
    note?: string | null;
    progress?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const mediaId = body.media_id;
  const status = body.status;
  if (!mediaId || typeof mediaId !== 'string') {
    return NextResponse.json({ error: '缺少 media_id' }, { status: 400 });
  }
  if (!status || !isValidStatus(status)) {
    return NextResponse.json({ error: '缺少或非法的 status' }, { status: 400 });
  }

  // 确认 media 存在
  const { data: media, error: mErr } = await supabase
    .from('media_items')
    .select('id')
    .eq('id', mediaId)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: `查询媒体失败: ${mErr.message}` }, { status: 500 });
  if (!media) return NextResponse.json({ error: '媒体不存在' }, { status: 404 });

  // 查询已存在记录，做 partial update
  const { data: existing } = await supabase
    .from('favorites')
    .select('*')
    .eq('device_id', deviceId)
    .eq('media_id', mediaId)
    .maybeSingle();

  const merged = {
    device_id: deviceId,
    media_id: mediaId,
    status,
    personal_rating:
      body.personal_rating === undefined
        ? existing?.personal_rating ?? null
        : body.personal_rating,
    note: body.note === undefined ? existing?.note ?? null : body.note,
    progress:
      body.progress === undefined ? existing?.progress ?? 0 : body.progress,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('favorites')
    .upsert(merged, { onConflict: 'device_id,media_id' })
    .select('*, media:media_items(*)')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `保存失败: ${error.message}` }, { status: 500 });
  }

  const res = NextResponse.json({ result: data, deviceId });
  if (setCookie) res.headers.set('Set-Cookie', setCookie);
  return res;
}

// DELETE /api/favorites?media_id=xxx
export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { deviceId, setCookie } = getOrCreateDeviceId(request);

  const mediaId = request.nextUrl.searchParams.get('media_id');
  if (!mediaId) {
    return NextResponse.json({ error: '缺少 media_id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('device_id', deviceId)
    .eq('media_id', mediaId);

  if (error) {
    return NextResponse.json({ error: `删除失败: ${error.message}` }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  if (setCookie) res.headers.set('Set-Cookie', setCookie);
  return res;
}
