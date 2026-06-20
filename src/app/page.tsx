'use client';

import { useState, useCallback } from 'react';
import { CollectionTab } from '@/components/media/CollectionTab';
import { ProfileTab } from '@/components/media/ProfileTab';
import { DetailSheet } from '@/components/media/DetailSheet';
import { BottomNav, type TabKey } from '@/components/media/BottomNav';
import type { MediaItem, FavoriteWithMedia } from '@/lib/media-types';

export default function Home() {
  const [tab, setTab] = useState<TabKey>('collection');
  const [favCount, setFavCount] = useState(0);
  const [selMedia, setSelMedia] = useState<MediaItem | null>(null);
  const [selFav, setSelFav] = useState<FavoriteWithMedia | null>(null);

  // 用于触发收藏列表刷新的 key
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  function handleSelect(m: MediaItem, fav?: FavoriteWithMedia | null) {
    setSelMedia(m);
    setSelFav(fav ?? null);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background pb-16">
      {/* 页面内容 */}
      {tab === 'collection' && (
        <CollectionTab refreshKey={refreshKey} onSelect={handleSelect} onRefresh={refresh} />
      )}
      {tab === 'profile' && <ProfileTab refreshKey={refreshKey} onImportDone={refresh} />}

      {/* 底部导航 */}
      <BottomNav active={tab} onChange={setTab} badge={favCount} />

      {/* 详情弹窗 */}
      {selMedia && (
        <DetailSheet
          item={selMedia}
          initialFavorite={selFav}
          onClose={() => setSelMedia(null)}
          onChange={refresh}
        />
      )}
    </div>
  );
}