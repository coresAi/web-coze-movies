import { NextRequest, NextResponse } from 'next/server';
import type { Vendor } from '@/lib/media-types';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let vendors: Vendor[] = [];

  try {
    const doubanRes = await fetch(
      `https://m.douban.com/rexxar/api/v2/movie/${encodeURIComponent(id)}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          Referer: `https://m.douban.com/movie/${encodeURIComponent(id)}/`,
        },
      }
    );
    if (doubanRes.ok) {
      const doubanData = await doubanRes.json();
      vendors = doubanData.vendors || [];
    }
  } catch {
    // 豆瓣不可用时不阻塞
  }

  return NextResponse.json({ vendors });
}
