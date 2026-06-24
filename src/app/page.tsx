'use client';

import { useState, useCallback } from 'react';
import { CollectionTab } from '@/components/media/CollectionTab';
import { ProfileTab } from '@/components/media/ProfileTab';
import { BottomNav } from '@/components/media/BottomNav';
import { DetailSheet } from '@/components/media/DetailSheet';
import type { MediaItem } from '@/lib/media-types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'collection' | 'profile'>('collection');
  const [selMedia, setSelMedia] = useState<MediaItem | null>(null);
  const [impKey, setImpKey] = useState(0);

  const handleSelect = useCallback((media: MediaItem) => {
    setSelMedia(media);
  }, []);

  const handleImportDone = useCallback(() => {
    if (activeTab !== 'collection') setActiveTab('collection');
    else setImpKey((n) => n + 1);
  }, [activeTab]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'collection' ? (
          <CollectionTab
            key={impKey}
            onSelect={handleSelect}
          />
        ) : (
          <ProfileTab onImportDone={handleImportDone} />
        )}
      </div>
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {selMedia && (
        <DetailSheet
          item={selMedia}
          onClose={() => setSelMedia(null)}
        />
      )}
    </div>
  );
}