import { NextRequest } from 'next/server';

export const runtime = 'edge';

const DOUBAN_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const DOUBAN_REFERER = 'https://movie.douban.com/';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return Response.json({ error: '缺少 url 参数' }, { status: 400 });

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': DOUBAN_UA,
        Referer: DOUBAN_REFERER,
        Accept: 'image/avif,image/webp,*/*',
      },
    });

    if (!resp.ok) {
      return new Response('图片获取失败', { status: 502 });
    }

    const buffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') || 'image/jpeg';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('图片代理错误', { status: 502 });
  }
}