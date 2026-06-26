'use client';

import { useState, useEffect } from 'react';
import { STATUS_LABELS, type MediaItem, type WatchStatus, type Vendor } from '@/lib/media-types';
import { Poster } from '@/components/media/Poster';
import { X, Star, Check, Loader2, ExternalLink, Play } from 'lucide-react';
import { useDeviceId, apiFetch } from '@/lib/client';
import { getLocalFavorite, upsertLocalFavorite, removeLocalFavorite } from '@/lib/local-favorites';

interface DetailSheetProps {
  item: MediaItem;
  onClose: () => void;
}

const STATUS_BUTTONS: WatchStatus[] = ['wish', 'watching', 'watched', 'dropped'];

export function DetailSheet({ item, onClose }: DetailSheetProps) {
  const deviceId = useDeviceId();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localVersion, setLocalVersion] = useState(0); // 触发重读

  // 从 localStorage 读取当前收藏状态
  function readLocal() {
    const doubanId = item.douban_id ?? '';
    if (!doubanId) return null;
    return getLocalFavorite(doubanId);
  }

  const localFav = readLocal();
  const [note, setNote] = useState(localFav?.note ?? '');

  // 同步 note 当 localFav 变化时
  useEffect(() => {
    setNote(localFav?.note ?? '');
  }, [localVersion]);

  // 获取播放源
  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    (async () => {
      setVendorsLoading(true);
      try {
        const data = await apiFetch<{ media: any; vendors: Vendor[] }>(`/api/media/${item.id}`, { deviceId });
        if (!cancelled && data.vendors) setVendors(data.vendors);
      } catch (_) { /* ignore */ }
      if (!cancelled) setVendorsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [deviceId, item.id]);

  function setStatus(status: WatchStatus) {
    const doubanId = item.douban_id ?? '';
    if (!doubanId) return;
    setSaving(true);
    try {
      upsertLocalFavorite({
        douban_id: doubanId,
        media_id: item.id,
        title: item.title,
        original_title: item.original_title ?? null,
        poster_url: item.poster_url ?? null,
        type: item.type,
        year: item.year ?? null,
        rating: item.rating ?? null,
        director: item.director ?? null,
        genre: localFav?.genre ?? null,
        status,
        personal_rating: localFav?.personal_rating ?? null,
        note: note || null,
        progress: localFav?.progress ?? 0,
      });
      setLocalVersion((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  function setRating(rating: number) {
    const doubanId = item.douban_id ?? '';
    if (!doubanId) return;
    setSaving(true);
    try {
      const current = readLocal();
      const newRating = (current?.personal_rating === rating ? 0 : rating) as 0 | 1 | 2 | 3 | 4 | 5;
      upsertLocalFavorite({
        douban_id: doubanId,
        media_id: item.id,
        title: item.title,
        original_title: item.original_title ?? null,
        poster_url: item.poster_url ?? null,
        type: item.type,
        year: item.year ?? null,
        rating: item.rating ?? null,
        director: item.director ?? null,
        genre: current?.genre ?? null,
        status: current?.status ?? 'wish',
        personal_rating: newRating || null,
        note: note || null,
        progress: current?.progress ?? 0,
      });
      setLocalVersion((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  function saveNote() {
    const doubanId = item.douban_id ?? '';
    if (!doubanId || !localFav) return;
    setSaving(true);
    try {
      upsertLocalFavorite({
        douban_id: doubanId,
        media_id: item.id,
        title: item.title,
        original_title: item.original_title ?? null,
        poster_url: item.poster_url ?? null,
        type: item.type,
        year: item.year ?? null,
        rating: item.rating ?? null,
        director: item.director ?? null,
        genre: localFav.genre ?? null,
        status: localFav.status,
        personal_rating: localFav.personal_rating,
        note,
        progress: localFav.progress ?? 0,
      });
      setLocalVersion((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  const currentStatus = localFav?.status;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部海报背景 */}
        <div className="relative h-44 shrink-0">
          <Poster item={item} size="lg" className="h-full !rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/40 to-card" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/55 p-1.5 text-white backdrop-blur"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 内容滚动区 */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
          <h1 className="font-serif text-2xl font-semibold leading-tight text-foreground">{item.title}</h1>
          {item.original_title && (
            <p className="mt-1 text-sm text-muted-foreground">{item.original_title}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {item.year && <span>{item.year}</span>}
            {item.region && <span>· {item.region}</span>}
            <span>· {item.type === 'tv' ? '电视剧' : '电影'}</span>
            {item.rating && Number(item.rating) > 0 && (
              <span className="ml-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-300">
                ★ {Number(item.rating).toFixed(1)}
              </span>
            )}
          </div>

          {/* 类型标签 */}
          {item.genre && item.genre.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.genre.slice(0, 5).map((g) => (
                <span key={g} className="rounded-full border border-border bg-background/50 px-2.5 py-0.5 text-[11px] text-foreground/80">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* 简介 */}
          {item.description ? (
            <div className="mt-4">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">简介</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{item.description}</p>
            </div>
          ) : (
            item.douban_id && (
              <a
                href={`https://movie.douban.com/subject/${item.douban_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-3 py-2.5 text-xs text-foreground/80 transition-colors active:bg-accent"
              >
                在豆瓣查看完整简介、演员表
                <ExternalLink className="size-3" />
              </a>
            )
          )}

          {/* 导演 / 演员 */}
          <div className="mt-4 space-y-1.5 text-xs">
            {item.director && (
              <p>
                <span className="text-muted-foreground">导演：</span>
                <span className="text-foreground/90">{item.director}</span>
              </p>
            )}
            {item.actors && item.actors.length > 0 && (
              <p>
                <span className="text-muted-foreground">主演：</span>
                <span className="text-foreground/90">{item.actors.slice(0, 6).join('、')}</span>
              </p>
            )}
          </div>

          {/* 播放平台 */}
          {vendors && vendors.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                播放平台
              </h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {vendors.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => window.open(v.url, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-3 py-1.5 text-xs text-foreground/90 transition-colors hover:bg-accent active:scale-[0.97]"
                  >
                    <Play className="size-3.5" />
                    {v.title}
                    {v.is_paid && (
                      <span className="text-[10px] text-amber-500/80">付费</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 状态选择 */}
          <div className="mt-5 border-t border-border pt-4">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">我的状态</h2>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {STATUS_BUTTONS.map((s) => {
                const isActive = currentStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    disabled={saving}
                    className={`flex items-center justify-center gap-1 rounded-md border py-2 text-xs transition-colors ${
                      isActive
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-border bg-background/50 text-foreground/80 active:bg-accent'
                    }`}
                  >
                    {isActive && <Check className="size-3" />}
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 个人评分 */}
          <div className="mt-4">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">我的评分</h2>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (localFav?.personal_rating ?? 0) >= n;
                return (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    disabled={saving}
                    className="p-1 active:scale-95"
                  >
                    <Star
                      className={`size-6 ${filled ? 'text-amber-300' : 'text-muted-foreground/30'}`}
                      fill={filled ? 'currentColor' : 'none'}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 备注 */}
          {localFav && (
            <div className="mt-4">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">备注</h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
                rows={3}
                placeholder="写几句给自己的话..."
                className="mt-2 w-full resize-none rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
              />
            </div>
          )}

          {!localFav && saving && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> 保存中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}