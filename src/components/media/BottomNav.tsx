'use client';

import { Film, User } from 'lucide-react';

export type TabKey = 'collection' | 'profile';

interface BottomNavProps {
  active: TabKey;
  onChange: (k: TabKey) => void;
  badge?: number;
}

const TABS: { key: TabKey; label: string; icon: typeof Film }[] = [
  { key: 'collection', label: '收藏', icon: Film },
  { key: 'profile', label: '我的', icon: User },
];

export function BottomNav({ active, onChange, badge }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1.5">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className="relative flex flex-col items-center gap-0.5 px-6 py-1.5 transition-colors"
            >
              <Icon
                className={`size-5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span
                className={`text-[10px] leading-none ${
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {key === 'collection' && badge !== undefined && badge > 0 && (
                <span className="absolute -right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}