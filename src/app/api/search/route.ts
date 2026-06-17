import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { MediaItem, MediaType } from '@/lib/media-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MediaResult = MediaItem & { poster_primary?: string; poster_secondary?: string };

function parsePosterColors(posterUrl: string | null | undefined): { primary?: string; secondary?: string } {
  if (!posterUrl) return {};
  if (posterUrl.startsWith('gradient:')) {
    const body = posterUrl.slice('gradient:'.length);
    const [primary, secondary] = body.split('/');
    return {
      primary: primary ? `#${primary}` : undefined,
      secondary: secondary ? `#${secondary}` : undefined,
    };
  }
  return {};
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ results: [], source: 'empty' });
  }

  const supabase = getSupabaseClient();

  try {
    const escaped = q.replace(/[%_]/g, '\\$&');
    const pattern = `%${escaped}%`;
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .or(`title.ilike.${pattern},original_title.ilike.${pattern},director.ilike.${pattern},actors.cs.{${q}}`)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(20);
    if (error) throw new Error(`搜索失败: ${error.message}`);

    const results: MediaResult[] = ((data ?? []) as MediaItem[]).map((m) => ({
      ...m,
      ...parsePosterColors(m.poster_url ?? null),
    }));

    return NextResponse.json({ results, source: 'local' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败';
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
