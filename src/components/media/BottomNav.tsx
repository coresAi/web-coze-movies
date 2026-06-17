'use client';

import { Search, Bookmark, User } from 'lucide-react';

export type TabKey = 'discover' | 'favorites' | 'profile';

interface BottomNavProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const items: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }> = [
  { key: 'discover', label: '发现', icon: Search },
  { key: 'favorites', label: '收藏', icon: Bookmark },
  { key: 'profile', label: '我的', icon: User },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((it) => {
          const isActive = active === it.key;
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              className="relative flex w-20 flex-col items-center gap-0.5 py-1.5 transition-colors"
            >
              <Icon
                className={`size-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span
                className={`text-[11px] transition-colors ${
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                }`}
              >
                {it.label}
              </span>
              {isActive && (
                <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
