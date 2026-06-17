import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getOrCreateDeviceId } from '@/lib/device';
import type { FavoriteWithMedia } from '@/lib/media-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseClient();
  const { deviceId } = getOrCreateDeviceId(request);
  const { id } = await ctx.params;

  const { data: media, error: mErr } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!media) return NextResponse.json({ error: '媒体不存在' }, { status: 404 });

  // 当前用户对该媒体的收藏信息
  const { data: favorite } = await supabase
    .from('favorites')
    .select('*')
    .eq('device_id', deviceId)
    .eq('media_id', id)
    .maybeSingle();

  return NextResponse.json({ media, favorite: favorite ?? null });
}
