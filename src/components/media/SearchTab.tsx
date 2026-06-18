'use client';

import { Search, X, Loader2, Heart } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useDeviceId, apiFetch } from '@/lib/client';
import { Poster } from '@/components/media/Poster';
import type { MediaItem, FavoriteResponse } from '@/lib/media-types';

const HOT_KEYWORDS = ['肖申克的救赎', '盗梦空间', '琅琊榜', '流浪地球', '隐秘的角落', '千与千寻', '让子弹飞', '黑镜'];

interface SearchTabProps {
  onSelect: (m: MediaItem) => void;
  refreshKey: number;
  onRefresh: () => void;
}

export function SearchTab({ onSelect, refreshKey, onRefresh }: SearchTabProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'local' | 'douban' | 'empty' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [favLoading, setFavLoading] = useState<Set<string>>(new Set());
  const deviceId = useDeviceId();

  async function runSearch(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await apiFetch<{ results: MediaItem[]; source: 'local' | 'douban' | 'empty' }>(
        `/api/search?q=${encodeURIComponent(query)}`,
        { deviceId }
      );
      setResults(data.results);
      setSource(data.source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '搜索失败';
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void runSearch(q);
    }
  }

  function handleHotClick(kw: string) {
    setQ(kw);
    void runSearch(kw);
  }

  function clear() {
    setQ('');
    setResults([]);
    setError(null);
    setSearched(false);
    setSource(null);
  }

  async function toggleFav(m: MediaItem) {
    if (!deviceId) return;
    const mid = m.id;
    setFavLoading((prev) => new Set(prev).add(mid));
    try {
      if (m.favorite_status) {
        // 已收藏 → 取消
        await apiFetch(`/api/favorites?media_id=${mid}`, {
          method: 'DELETE',
          deviceId,
        });
        setResults((prev) => prev.map((r) => (r.id === mid ? { ...r, favorite_status: null } : r)));
      } else {
        // 未收藏 → 以「想看」收藏
        const data = await apiFetch<FavoriteResponse>(`/api/favorites`, {
          method: 'POST',
          body: JSON.stringify({ media_id: mid, status: 'wish' }),
          deviceId,
        });
        setResults((prev) => prev.map((r) => (r.id === mid ? { ...r, favorite_status: 'wish' } : r)));
      }
      onRefresh();
    } catch {
      // 静默失败
    } finally {
      setFavLoading((prev) => {
        const next = new Set(prev);
        next.delete(mid);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      {/* 搜索框 */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 pb-2 pt-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="搜索电影、电视剧..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            inputMode="search"
            enterKeyHint="search"
          />
          {q && (
            <button type="button" onClick={clear} className="text-muted-foreground active:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {!searched && (
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">猜你想看</p>
          <div className="flex flex-wrap gap-2">
            {HOT_KEYWORDS.map((kw) => (
              <button
                key={kw}
                onClick={() => handleHotClick(kw)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 active:bg-accent"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-xs">正在为你寻片…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <div className="py-12 text-center text-xs text-muted-foreground">没有找到相关影视</div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              共 {results.length} 部 ·{' '}
              <span className="text-foreground/70">
                {source === 'douban' ? '豆瓣' : '本地资料库'}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 pb-4">
            {results.map((m, idx) => (
              <div key={m.id} className="relative fade-up" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                <button onClick={() => onSelect(m)} className="w-full text-left">
                  <Poster item={m} size="sm" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); void toggleFav(m); }}
                  disabled={favLoading.has(m.id)}
                  className="absolute right-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-110"
                >
                  <Heart
                    className={`size-3.5 transition-all duration-200 ${
                      m.favorite_status
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-white/80'
                    } ${favLoading.has(m.id) ? 'animate-pulse' : ''}`}
                    strokeWidth={1.8}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
