'use client';

import { useEffect, useState, useMemo } from 'react';
import { type MediaItem } from '@/lib/media-types';
import { getLocalFavorites, getDefaultPlayUrl, type LocalFavorite } from '@/lib/local-favorites';
import { Poster } from '@/components/media/Poster';
import { Play, ExternalLink } from 'lucide-react';

interface WatchlistTabProps {
  onSelect: (m: MediaItem) => void;
}

export function WatchlistTab({ onSelect }: WatchlistTabProps) {
  const [wishItems, setWishItems] = useState<LocalFavorite[]>([]);

  function load() {
    const all = getLocalFavorites();
    const watching = all
      .filter((f) => f.status === 'watching')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setWishItems(watching);
  }

  useEffect(() => {
    load();
    // 监听 storage 变化（跨 tab 同步）
    const onStorage = () => load();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 每次组件挂载时刷新
  useEffect(() => {
    load();
  }, []);

  function getPlayUrl(fav: LocalFavorite): string | null {
    if (fav.custom_url) return fav.custom_url;
    return getDefaultPlayUrl() || null;
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-foreground">追剧</h2>
        <span className="text-xs text-muted-foreground">{wishItems.length} 部在看</span>
      </div>

      {wishItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card/40 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">还没有在看的影视</p>
          <p className="mt-1 text-xs text-muted-foreground/70">去「收藏」页搜索并标记为「在看」吧</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-20">
          {wishItems.map((f, idx) => {
            const playUrl = getPlayUrl(f);
            return (
              <div
                key={f.douban_id}
                className="fade-up flex gap-3 rounded-xl border border-border bg-card p-3"
                style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
              >
                {/* 海报 */}
                <button
                  onClick={() =>
                    onSelect({
                      id: f.media_id,
                      title: f.title,
                      original_title: f.original_title,
                      poster_url: f.poster_url,
                      backdrop_url: f.backdrop_url,
                      type: f.type,
                      year: f.year,
                      rating: f.rating,
                      director: f.director,
                      actors: f.actors,
                      genre: f.genre,
                      region: f.region,
                      description: f.description,
                      douban_id: f.douban_id,
                    } as MediaItem)
                  }
                  className="w-20 shrink-0 overflow-hidden rounded-lg"
                >
                  <Poster item={f} size="sm" className="!rounded-lg" />
                </button>

                {/* 信息 */}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <button
                    onClick={() =>
                      onSelect({
                        id: f.media_id,
                        title: f.title,
                        original_title: f.original_title,
                        poster_url: f.poster_url,
                        backdrop_url: f.backdrop_url,
                        type: f.type,
                        year: f.year,
                        rating: f.rating,
                        director: f.director,
                        actors: f.actors,
                        genre: f.genre,
                        region: f.region,
                        description: f.description,
                        douban_id: f.douban_id,
                      } as MediaItem)
                    }
                    className="text-left"
                  >
                    <h3 className="truncate text-sm font-medium text-foreground">{f.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {f.year && <span>{f.year}</span>}
                      {f.type === 'tv' ? ' · 电视剧' : ' · 电影'}
                      {f.rating && Number(f.rating) > 0 && (
                        <span className="ml-1 text-amber-400">★ {Number(f.rating).toFixed(1)}</span>
                      )}
                    </p>
                  </button>
                </div>

                {/* 播放按钮 */}
                {playUrl && (
                  <a
                    href={playUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center justify-center self-center rounded-full bg-primary/15 p-2.5 text-primary transition-transform active:scale-90"
                    title="一键播放"
                  >
                    <Play className="size-4" fill="currentColor" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
