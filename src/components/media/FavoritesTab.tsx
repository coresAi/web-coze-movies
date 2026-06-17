'use client';

import { useEffect, useState } from 'react';
import { useDeviceId, apiFetch } from '@/lib/client';
import { STATUS_LABELS, type WatchStatus, type FavoriteWithMedia } from '@/lib/media-types';
import { Poster } from '@/components/media/Poster';
import { Loader2, Heart, Trash2 } from 'lucide-react';

const STATUSES: WatchStatus[] = ['wish', 'watching', 'watched', 'dropped'];

interface FavoritesTabProps {
  refreshKey: number;
  onSelect: (m: FavoriteWithMedia['media'], fav: FavoriteWithMedia | null) => void;
  onCountChange?: (count: number) => void;
}

export function FavoritesTab({ refreshKey, onSelect, onCountChange }: FavoritesTabProps) {
  const [active, setActive] = useState<WatchStatus>('wish');
  const [items, setItems] = useState<FavoriteWithMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<WatchStatus, number>>({ wish: 0, watching: 0, watched: 0, dropped: 0 });
  const deviceId = useDeviceId();

  // 加载当前 active 状态的列表 + 计数
  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // 并行：拉当前状态 + 拉所有状态计数
        const [listData, allData] = await Promise.all([
          apiFetch<{ results: FavoriteWithMedia[] }>(`/api/favorites?status=${active}`, { deviceId }),
          apiFetch<{ results: FavoriteWithMedia[] }>(`/api/favorites`, { deviceId }),
        ]);
        if (cancelled) return;
        setItems(listData.results);
        // 统计
        const c: Record<WatchStatus, number> = { wish: 0, watching: 0, watched: 0, dropped: 0 };
        allData.results.forEach((f) => {
          c[f.status] = (c[f.status] ?? 0) + 1;
        });
        setCounts(c);
        onCountChange?.(allData.results.length);
      } catch (e) {
        if (cancelled) return;
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId, active, refreshKey, onCountChange]);

  async function handleDelete(e: React.MouseEvent, mediaId: string) {
    e.stopPropagation();
    if (!confirm('确定要删除这个收藏吗？')) return;
    try {
      await apiFetch(`/api/favorites?media_id=${mediaId}`, { deviceId, method: 'DELETE' });
      setItems((prev) => prev.filter((p) => p.media_id !== mediaId));
      setCounts((prev) => ({ ...prev, [active]: Math.max(0, prev[active] - 1) }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Heart className="size-4 text-primary" fill="currentColor" strokeWidth={1.5} />
        <span className="font-serif text-base text-foreground">我的灯箱</span>
      </div>

      {/* 状态 tab */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {STATUSES.map((s) => {
          const isActive = active === s;
          return (
            <button
              key={s}
              onClick={() => setActive(s)}
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

      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">这里还空着</p>
          <p className="mt-1 text-xs text-muted-foreground/70">去「发现」找一部想看的吧</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pb-4">
          {items.map((f, idx) => (
            <div key={f.id} className="relative fade-up" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
              <button onClick={() => onSelect(f.media, f)} className="w-full text-left">
                <Poster item={f.media} size="sm" />
              </button>
              <button
                onClick={(e) => handleDelete(e, f.media_id)}
                className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white/80 backdrop-blur active:bg-black/80"
                aria-label="删除收藏"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
