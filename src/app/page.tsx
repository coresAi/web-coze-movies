'use client';

import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import { BottomNav, type TabKey } from '@/components/media/BottomNav';
import { SearchTab } from '@/components/media/SearchTab';
import { FavoritesTab } from '@/components/media/FavoritesTab';
import { ProfileTab } from '@/components/media/ProfileTab';
import { DetailSheet } from '@/components/media/DetailSheet';
import { useDeviceId, apiFetch } from '@/lib/client';
import type { MediaItem, FavoriteWithMedia, WatchStatus } from '@/lib/media-types';

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>('discover');
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [detailFavorite, setDetailFavorite] = useState<FavoriteWithMedia | null>(null);
  const [favoritesRefresh, setFavoritesRefresh] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const deviceId = useDeviceId();

  // 防止 hydration 不一致：仅在客户端挂载后渲染
  useEffect(() => {
    setHydrated(true);
  }, []);

  // 锁定 body 滚动（详情弹层时）
  useEffect(() => {
    if (detailItem) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [detailItem]);

  async function openDetail(item: MediaItem, fav: FavoriteWithMedia | null) {
    setDetailItem(item);
    setDetailFavorite(fav);
    // 重新拉一次最新的收藏信息（避免状态过期）
    if (deviceId) {
      try {
        const data = await apiFetch<{ media: MediaItem; favorite: FavoriteWithMedia | null }>(
          `/api/media/${item.id}`,
          { deviceId }
        );
        setDetailFavorite(data.favorite);
      } catch {
        // 静默失败
      }
    }
  }

  function closeDetail() {
    setDetailItem(null);
    setDetailFavorite(null);
  }

  function onDetailChange() {
    setFavoritesRefresh((v) => v + 1);
  }

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-background px-4 text-center">
        <Film className="size-8 text-primary" strokeWidth={1.5} />
        <p className="mt-3 text-sm text-muted-foreground">灯箱点亮中…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {/* 顶部 Logo */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Film className="size-5 text-primary" strokeWidth={1.8} />
          <span className="font-serif text-lg font-semibold tracking-wide text-foreground">灯箱</span>
        </div>
        <span className="text-[11px] text-muted-foreground/80">私人影单</span>
      </header>

      <div className="flex-1 pb-20">
        {tab === 'discover' && <SearchTab onSelect={(m) => openDetail(m, null)} refreshKey={favoritesRefresh} onRefresh={() => setFavoritesRefresh((v) => v + 1)} />}
        {tab === 'favorites' && (
          <FavoritesTab
            refreshKey={favoritesRefresh}
            onSelect={(m, f) => openDetail(m, f)}
          />
        )}
        {tab === 'profile' && <ProfileTab refreshKey={favoritesRefresh} onImportDone={() => setFavoritesRefresh((v) => v + 1)} />}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      {detailItem && (
        <DetailSheet
          item={detailItem}
          initialFavorite={detailFavorite}
          onClose={closeDetail}
          onChange={onDetailChange}
        />
      )}
    </main>
  );
}
