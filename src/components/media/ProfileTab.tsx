'use client';

import { useEffect, useState, useRef } from 'react';
import { useDeviceId, apiFetch } from '@/lib/client';
import { Heart, Film, Tv, Bookmark, Search, Download, Upload, Loader2 } from 'lucide-react';
import type { FavoriteWithMedia, ExportItem } from '@/lib/media-types';

interface ProfileTabProps {
  refreshKey: number;
  onImportDone?: () => void;
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

export function ProfileTab({ refreshKey, onImportDone }: ProfileTabProps) {
  const deviceId = useDeviceId();
  const [stats, setStats] = useState<Stats>({ total: 0, wish: 0, watching: 0, watched: 0, dropped: 0 });
  const [tip, setTip] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function handleExport() {
    if (!deviceId) return;
    setExporting(true);
    setMsg(null);
    try {
      const data = await apiFetch<{ results: FavoriteWithMedia[] }>(`/api/favorites`, { deviceId });
      const items: ExportItem[] = data.results.map((f) => ({
        title: f.media.title,
        original_title: f.media.original_title,
        type: f.media.type,
        year: f.media.year,
        director: f.media.director,
        actors: f.media.actors,
        genre: f.media.genre,
        region: f.media.region,
        rating: f.media.rating,
        poster_url: f.media.poster_url,
        douban_id: f.media.douban_id,
        status: f.status,
        personal_rating: f.personal_rating,
        note: f.note,
        progress: f.progress,
        export_at: new Date().toISOString(),
      }));
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `灯箱收藏_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: `已导出 ${items.length} 条收藏` });
    } catch {
      setMsg({ type: 'error', text: '导出失败' });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !deviceId) return;
    setImporting(true);
    setMsg(null);
    try {
      const text = await file.text();
      const items: ExportItem[] = JSON.parse(text);
      if (!Array.isArray(items) || items.length === 0) throw new Error('无效文件');
      let success = 0;
      for (const item of items) {
        // 先确保 media 存在（用 douban_id 或 title 搜索 upsert）
        let mediaId = '';
        if (item.douban_id) {
          // 尝试通过 douban_id 查找已有记录
          const search = await fetch(`/api/search?q=${encodeURIComponent(item.title)}`).then((r) => r.json());
          const found = search.results?.find((m: { douban_id?: string }) => m.douban_id === item.douban_id);
          mediaId = found?.id || '';
        }
        if (!mediaId) {
          // 跳过找不到 media 的项
          continue;
        }
        await apiFetch(`/api/favorites`, {
          method: 'POST',
          body: JSON.stringify({
            media_id: mediaId,
            status: item.status,
            personal_rating: item.personal_rating ?? undefined,
            note: item.note ?? undefined,
            progress: item.progress ?? undefined,
          }),
          deviceId,
        });
        success++;
      }
      setMsg({ type: 'success', text: `已导入 ${success}/${items.length} 条收藏` });
      onImportDone?.();
    } catch {
      setMsg({ type: 'error', text: '导入失败，请检查文件格式' });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

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

      {/* 导入 / 导出 */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">数据管理</p>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card py-2.5 active:bg-accent disabled:opacity-50"
          >
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            <span className="text-xs">导出收藏</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card py-2.5 active:bg-accent disabled:opacity-50"
          >
            {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            <span className="text-xs">导入收藏</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
        {msg && (
          <p className={`mt-2 text-xs ${msg.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
            {msg.text}
          </p>
        )}
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
