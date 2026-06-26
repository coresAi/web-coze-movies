'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDeviceId, apiFetch } from '@/lib/client';
import {
  STATUS_LABELS,
  type WatchStatus,
  type MediaItem,
} from '@/lib/media-types';
import {
  getLocalFavorites,
  addSearchResultAsFavorite,
  removeSearchResultFavorite,
  type LocalFavorite,
} from '@/lib/local-favorites';
import { Poster } from '@/components/media/Poster';
import { Search, X, Loader2, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUSES: WatchStatus[] = ['wish', 'watching', 'watched', 'dropped'];
const HOT_KEYWORDS = ['肖申克的救赎', '盗梦空间', '琅琊榜', '流浪地球', '隐秘的角落', '千与千寻', '让子弹飞', '黑镜'];

interface CollectionTabProps {
  onSelect: (m: MediaItem) => void;
}

export function CollectionTab({ onSelect }: CollectionTabProps) {
  const deviceId = useDeviceId();

  // —— 搜索状态 ——
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [source, setSource] = useState<'local' | 'douban' | 'empty' | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [favLoading, setFavLoading] = useState<Set<string>>(new Set());

  // —— 分类筛选 ——
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);

  const TYPE_CHIPS = [
    { value: 'all' as const, label: '全部' },
    { value: 'movie' as const, label: '电影' },
    { value: 'tv' as const, label: '电视剧' },
  ];
  const GENRE_CHIPS = ['恐怖', '悬疑', '喜剧', '科幻', '动作', '爱情', '动画', '剧情'];

  // 根据分类筛选结果
  function filterByCategory<T extends { type?: string; genre?: string[] | null }>(items: T[], typeFilter: 'all' | 'movie' | 'tv', genreFilter: string | null): T[] {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (genreFilter && (!item.genre || !item.genre.includes(genreFilter))) return false;
      return true;
    });
  }

  // —— 本地收藏状态 ——
  const [statusFilter, setStatusFilter] = useState<WatchStatus>('wish');
  const [favItems, setFavItems] = useState<LocalFavorite[]>([]);
  const [localRefresh, setLocalRefresh] = useState(0); // 手动触发收藏列表刷新
  const [unfavTarget, setUnfavTarget] = useState<LocalFavorite | null>(null);

  // 从 localStorage 读取收藏列表
  function loadFavorites() {
    const all = getLocalFavorites();
    const byStatus = all.filter((f) => f.status === statusFilter);
    const filtered = filterByCategory(byStatus, typeFilter, 'all');
    // 按 updated_at 降序
    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setFavItems(filtered);
  }

  // 收藏状态变化后刷新
  useEffect(() => {
    loadFavorites();
  }, [statusFilter, typeFilter, localRefresh]);

  // 搜索
  async function runSearch(query: string) {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await apiFetch<{ results: MediaItem[]; source: 'local' | 'douban' | 'empty' }>(
        `/api/search?q=${encodeURIComponent(query)}`,
        { deviceId }
      );
      // 合并本地收藏状态
      const localFavs = getLocalFavorites();
      const merged = data.results.map((m) => ({
        ...m,
        favorite_status: (localFavs.find((f) => f.media_id === m.id || f.douban_id === m.douban_id)?.status ?? null) as WatchStatus | null,
      }));
      setResults(merged);
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
    setSource(null);
    setGenreFilter(null);
  }

  // 收藏 / 取消收藏（搜索结果卡片）
  function toggleFav(m: MediaItem) {
    const mid = m.id;
    setFavLoading((prev) => new Set(prev).add(mid));
    try {
      if (m.favorite_status) {
        // 已收藏 → 取消
        removeSearchResultFavorite(m);
        setResults((prev) => prev.map((r) => (r.id === mid ? { ...r, favorite_status: null } : r)));
      } else {
        // 未收藏 → 添加
        addSearchResultAsFavorite(m);
        setResults((prev) => prev.map((r) => (r.id === mid ? { ...r, favorite_status: 'wish' as WatchStatus } : r)));
      }
      setLocalRefresh((n) => n + 1);
    } finally {
      setFavLoading((prev) => {
        const next = new Set(prev);
        next.delete(mid);
        return next;
      });
    }
  }

  // 确认取消收藏（收藏列表中）
  function handleConfirmUnfav() {
    if (!unfavTarget) return;
    removeSearchResultFavorite(unfavTarget);
    setUnfavTarget(null);
    setLocalRefresh((n) => n + 1);
  }

  const isSearching = q.trim() !== '';

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      {/* 搜索框（一直显示） */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 pb-2 pt-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); if (!e.target.value.trim()) clearSearch(); }}
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
      {isSearching && (
        <>
          {/* 分类筛选芯片 */}
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {TYPE_CHIPS.map((t) => (
              <button
                key={t.value}
                onClick={() => { setTypeFilter(t.value); setGenreFilter(null); }}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  typeFilter === t.value && !genreFilter
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
            <span className="mx-1 self-center text-muted-foreground/30">|</span>
            {GENRE_CHIPS.map((g) => (
              <button
                key={g}
                onClick={() => { setGenreFilter(genreFilter === g ? null : g); setTypeFilter('all'); }}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  genreFilter === g
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

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
                  {(() => { const filtered = filterByCategory(results, typeFilter, genreFilter); return `共 ${results.length} 部${filtered.length < results.length ? ` · 筛选 ${filtered.length} 部` : ''}`; })()} ·{' '}
                  <span className="text-foreground/70">{source === 'douban' ? '豆瓣数据' : '本地资料库'}</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pb-4">
                {filterByCategory(results, typeFilter, genreFilter).map((m, idx) => (
                  <div key={m.id} className="relative fade-up" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                    <button onClick={() => onSelect(m)} className="w-full text-left">
                      <Poster item={m} size="sm" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(m);
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
      {!isSearching && (
        <>
          {/* 分类筛选芯片 */}
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {TYPE_CHIPS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  typeFilter === t.value
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 状态 tab */}
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {STATUSES.map((s) => {
              const isActive = statusFilter === s;
              const count = getLocalFavorites().filter((f) => f.status === s).length;
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
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-medium ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {favItems.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">这里还空着</p>
              <p className="mt-1 text-xs text-muted-foreground/70">在搜索框找一部想看的吧</p>
            </div>
          )}

          {favItems.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pb-4">
              {favItems.map((f, idx) => (
                <div key={f.douban_id} className="relative fade-up" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                  <button onClick={() => onSelect({ id: f.media_id, title: f.title, original_title: f.original_title, poster_url: f.poster_url, type: f.type, year: f.year, rating: f.rating, director: f.director, douban_id: f.douban_id } as MediaItem)} className="w-full text-left">
                    <Poster item={f} size="sm" />
                  </button>
                  {/* 收藏状态星星 —— 点击取消收藏 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setUnfavTarget(f); }}
                    className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform active:scale-90"
                  >
                    <Star className="size-3.5 fill-amber-400 text-amber-400" strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 收藏为空时展示猜你想看 */}
          {favItems.length === 0 && (
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
        </>
      )}

      {/* 取消收藏确认弹窗 */}
      <AlertDialog open={!!unfavTarget} onOpenChange={(o) => !o && setUnfavTarget(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>取消收藏</AlertDialogTitle>
            <AlertDialogDescription>
              确定取消收藏《{unfavTarget?.title}》吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>再想想</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnfav} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确定取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}