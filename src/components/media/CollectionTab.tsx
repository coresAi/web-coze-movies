'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDeviceId, apiFetch } from '@/lib/client';
import {
  STATUS_LABELS,
  type WatchStatus,
  type MediaItem,
  type FavoriteWithMedia,
  type FavoriteResponse,
} from '@/lib/media-types';
import { Poster } from '@/components/media/Poster';
import { Search, X, Loader2, Star } from 'lucide-react';

const STATUSES: WatchStatus[] = ['wish', 'watching', 'watched', 'dropped'];
const HOT_KEYWORDS = ['肖申克的救赎', '盗梦空间', '琅琊榜', '流浪地球', '隐秘的角落', '千与千寻', '让子弹飞', '黑镜'];

interface CollectionTabProps {
  refreshKey: number;
  onSelect: (m: MediaItem, fav?: FavoriteWithMedia | null) => void;
  onRefresh: () => void;
}

export function CollectionTab({ refreshKey, onSelect, onRefresh }: CollectionTabProps) {
  const deviceId = useDeviceId();

  // —— 搜索状态 ——
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [source, setSource] = useState<'local' | 'douban' | 'empty' | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [favLoading, setFavLoading] = useState<Set<string>>(new Set());

  // —— 收藏状态 ——
  const [statusFilter, setStatusFilter] = useState<WatchStatus>('wish');
  const [favItems, setFavItems] = useState<FavoriteWithMedia[]>([]);
  const [favLoading2, setFavLoading2] = useState(false);
  const [counts, setCounts] = useState<Record<WatchStatus, number>>({ wish: 0, watching: 0, watched: 0, dropped: 0 });

  // 加载收藏列表（当不在搜索模式时）
  useEffect(() => {
    if (!deviceId || searched) return;
    let cancelled = false;
    setFavLoading2(true);
    void (async () => {
      try {
        const [listData, allData] = await Promise.all([
          apiFetch<{ results: FavoriteWithMedia[] }>(`/api/favorites?status=${statusFilter}`, { deviceId }),
          apiFetch<{ results: FavoriteWithMedia[] }>(`/api/favorites`, { deviceId }),
        ]);
        if (cancelled) return;
        setFavItems(listData.results);
        const c: Record<WatchStatus, number> = { wish: 0, watching: 0, watched: 0, dropped: 0 };
        allData.results.forEach((f) => {
          c[f.status] = (c[f.status] ?? 0) + 1;
        });
        setCounts(c);
      } catch {
        if (cancelled) return;
        setFavItems([]);
      } finally {
        if (!cancelled) setFavLoading2(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId, statusFilter, refreshKey, searched]);

  // 搜索
  async function runSearch(query: string) {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
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
      setSearchError(msg);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        void runSearch(q);
      }
    },
    [q]
  );

  function handleHotClick(kw: string) {
    setQ(kw);
    void runSearch(kw);
  }

  function clearSearch() {
    setQ('');
    setResults([]);
    setSearchError(null);
    setSearched(false);
    setSource(null);
  }

  // 收藏 / 取消收藏（搜索结果卡片）
  async function toggleFav(m: MediaItem) {
    if (!deviceId) return;
    const mid = m.id;
    setFavLoading((prev) => new Set(prev).add(mid));
    try {
      if (m.favorite_status) {
        await apiFetch(`/api/favorites?media_id=${mid}`, { method: 'DELETE', deviceId });
        setResults((prev) => prev.map((r) => (r.id === mid ? { ...r, favorite_status: null } : r)));
      } else {
        const data = await apiFetch<FavoriteResponse>(`/api/favorites`, {
          method: 'POST',
          body: JSON.stringify({ media_id: mid, status: 'wish' }),
          deviceId,
        });
        setResults((prev) => prev.map((r) => (r.id === mid ? { ...r, favorite_status: 'wish' } : r)));
      }
      onRefresh();
    } catch {
      // 静默
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
      {/* 搜索框（一直显示） */}
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
            <button type="button" onClick={clearSearch} className="text-muted-foreground active:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* —— 搜索模式 —— */}
      {searched && (
        <>
          {searchLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <p className="text-xs">正在为你寻片…</p>
            </div>
          )}

          {searchError && !searchLoading && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              {searchError}
            </div>
          )}

          {!searchLoading && !searchError && results.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground">没有找到相关影视</div>
          )}

          {!searchLoading && results.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  共 {results.length} 部 ·{' '}
                  <span className="text-foreground/70">{source === 'douban' ? '豆瓣数据' : '本地资料库'}</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pb-4">
                {results.map((m, idx) => (
                  <div key={m.id} className="relative fade-up" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                    <button onClick={() => onSelect(m)} className="w-full text-left">
                      <Poster item={m} size="sm" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleFav(m);
                      }}
                      disabled={favLoading.has(m.id)}
                      className="absolute right-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-110"
                    >
                      <Star
                        className={`size-3.5 transition-all duration-200 ${
                          m.favorite_status ? 'fill-amber-400 text-amber-400' : 'text-white/80'
                        } ${favLoading.has(m.id) ? 'animate-pulse' : ''}`}
                        strokeWidth={1.8}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* —— 收藏模式（默认） —— */}
      {!searched && (
        <>
          {/* 状态 tab */}
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {STATUSES.map((s) => {
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <span>{STATUS_LABELS[s]}</span>
                  {counts[s] > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-medium ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {counts[s]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {favLoading2 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!favLoading2 && favItems.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">这里还空着</p>
              <p className="mt-1 text-xs text-muted-foreground/70">在搜索框找一部想看的吧</p>
            </div>
          )}

          {!favLoading2 && favItems.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pb-4">
              {favItems.map((f, idx) => (
                <div key={f.id} className="relative fade-up" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                  <button onClick={() => onSelect(f.media, f)} className="w-full text-left">
                    <Poster item={f.media} size="sm" />
                  </button>
                  {/* 收藏状态星星 —— 仅展示已收藏 */}
                  <div className="pointer-events-none absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" strokeWidth={1.8} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 未搜索也不是空收藏 — 猜你想看 */}
      {!searched && favLoading2 && favItems.length === 0 && !favLoading2 && (
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

      {/* 收藏为空时展示猜你想看 */}
      {!searched && !favLoading2 && favItems.length === 0 && (
        <div className="flex flex-col gap-3">
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
    </div>
  );
}