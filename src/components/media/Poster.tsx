'use client';

import { useState } from 'react';
import type { MediaItem } from '@/lib/media-types';

interface PosterProps {
  item: MediaItem;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 解析 poster_url，支持 "gradient:hex1/hex2" 协议
function parsePosterStyle(posterUrl: string | null): { background: string; isGradient: boolean } {
  if (!posterUrl) return { background: 'linear-gradient(135deg, #2A2420, #1C1814)', isGradient: true };
  if (posterUrl.startsWith('gradient:')) {
    const [, colors] = posterUrl.split(':');
    const [c1, c2] = colors.split('/');
    if (c1 && c2) {
      return {
        background: `linear-gradient(135deg, #${c1} 0%, #${c2} 100%)`,
        isGradient: true,
      };
    }
  }
  if (posterUrl.startsWith('http')) {
    return { background: `url(${posterUrl}) center/cover`, isGradient: false };
  }
  return { background: 'linear-gradient(135deg, #2A2420, #1C1814)', isGradient: true };
}

const sizeMap = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

export function Poster({ item, size = 'md', className = '' }: PosterProps) {
  const [errored, setErrored] = useState(false);
  const { background, isGradient } = parsePosterStyle(item.poster_url);

  const showImage = !isGradient && !errored;

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-md poster-glow ${className}`}
      style={{ background }}
    >
      {showImage && (
        <img
          src={item.poster_url!}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setErrored(true)}
          loading="lazy"
        />
      )}

      {/* 海报上的文字：标题 + 年份 + 类型 chip */}
      <div className="absolute inset-0 flex flex-col justify-between p-2">
        <div className="flex justify-end">
          {item.type === 'tv' ? (
            <span className="rounded-sm bg-black/50 px-1 py-0.5 text-[9px] font-medium tracking-wider text-amber-200/90 backdrop-blur">
              剧
            </span>
          ) : (
            <span className="rounded-sm bg-black/50 px-1 py-0.5 text-[9px] font-medium tracking-wider text-amber-200/90 backdrop-blur">
              影
            </span>
          )}
        </div>

        {/* 标题在底部，加阴影提高可读性 */}
        <div>
          {item.rating && Number(item.rating) > 0 && (
            <div className="mb-1 flex items-center gap-1 text-amber-300">
              <span className={`font-serif font-semibold ${size === 'lg' ? 'text-base' : 'text-xs'}`}>
                {Number(item.rating).toFixed(1)}
              </span>
              <span className="text-[9px] opacity-70">/ 10</span>
            </div>
          )}
          <h3
            className={`font-serif font-semibold leading-tight text-white drop-shadow-md ${sizeMap[size]}`}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.3)' }}
          >
            {item.title}
          </h3>
          {item.year && (
            <p
              className="mt-0.5 text-[10px] text-white/70"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              {item.year}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
