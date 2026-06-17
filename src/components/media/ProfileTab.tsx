'use client';

import { useEffect, useState } from 'react';
import { useDeviceId, apiFetch } from '@/lib/client';
import { Heart, Film, Tv, Bookmark, Search } from 'lucide-react';
import type { FavoriteWithMedia } from '@/lib/media-types';

interface ProfileTabProps {
  refreshKey: number;
}

interface Stats {
  total: number;
  wish: number;
  watching: number;
  watched: number;
  dropped: number;
}

const TIPS = [
  '今天又是为别人的故事流泪的一天。',
  '好片不在多，在心头那几部。',
  '别忘了给自己留一集下周看的。',
  '深夜适合看慢节奏的影片。',
  '据说周末补片效率最高。',
];

export function ProfileTab({ refreshKey }: ProfileTabProps) {
  const deviceId = useDeviceId();
  const [stats, setStats] = useState<Stats>({ total: 0, wish: 0, watching: 0, watched: 0, dropped: 0 });
  const [tip, setTip] = useState('');

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<{ results: FavoriteWithMedia[] }>(`/api/favorites`, { deviceId });
        if (cancelled) return;
        const s: Stats = { total: 0, wish: 0, watching: 0, watched: 0, dropped: 0 };
        data.results.forEach((f) => {
          s.total++;
          s[f.status]++;
        });
        setStats(s);
      } catch {
        if (!cancelled) setStats({ total: 0, wish: 0, watching: 0, watched: 0, dropped: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId, refreshKey]);

  useEffect(() => {
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }, []);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <div className="rounded-md border border-border bg-card px-5 py-4">
        <p className="font-serif text-lg text-foreground">灯箱</p>
        <p className="mt-0.5 text-xs text-muted-foreground">私人影单 · 记录观影</p>
        <p className="mt-3 text-xs italic text-muted-foreground/80">「{tip}」</p>
      </div>

      {/* 统计 */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">影库概览</p>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard icon={Heart} label="总收藏" value={stats.total} accent="text-primary" />
          <StatCard icon={Bookmark} label="想看" value={stats.wish} accent="text-amber-300" />
          <StatCard icon={Film} label="在看" value={stats.watching} accent="text-emerald-300" />
          <StatCard icon={Tv} label="看过" value={stats.watched} accent="text-rose-300" />
        </div>
        {stats.dropped > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground/70">另有 {stats.dropped} 部已弃剧</p>
        )}
      </div>

      {/* 使用说明 */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">使用说明</p>
        <div className="space-y-2 rounded-md border border-border bg-card p-4 text-xs text-foreground/80">
          <Row icon={Search}>在「发现」里搜索电影或电视剧</Row>
          <Row icon={Bookmark}>点击海报打开详情，标记「想看 / 在看 / 看过 / 弃剧」</Row>
          <Row icon={Heart}>给喜欢的作品打 1-5 星，写几句备注</Row>
          <Row icon={Film}>所有数据保存在本机，换设备会看不到哦</Row>
        </div>
      </div>

      <p className="pb-2 text-center text-[11px] text-muted-foreground/60">
        本机设备 ID：{deviceId ? deviceId.slice(0, 8) + '…' : '生成中'}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${accent}`} strokeWidth={1.6} />
      </div>
      <p className="mt-1.5 font-serif text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2} />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
