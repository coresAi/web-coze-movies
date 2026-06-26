'use client';

import { useEffect, useState, useRef } from 'react';
import { Heart, Film, Tv, Bookmark, Download, Upload, Loader2, Search } from 'lucide-react';
import {
  getLocalFavorites,
  setLocalFavorites,
  type LocalFavorite,
} from '@/lib/local-favorites';
import type { ExportItem } from '@/lib/media-types';

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

interface ProfileTabProps {
  onImportDone?: () => void;
}

export function ProfileTab({ onImportDone }: ProfileTabProps) {
  const [stats, setStats] = useState<Stats>({ total: 0, wish: 0, watching: 0, watched: 0, dropped: 0 });
  const [tip, setTip] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function computeStats() {
    const all = getLocalFavorites();
    const s: Stats = { total: 0, wish: 0, watching: 0, watched: 0, dropped: 0 };
    all.forEach((f) => {
      s.total++;
      s[f.status]++;
    });
    setStats(s);
  }

  useEffect(() => {
    computeStats();
  }, []);

  useEffect(() => {
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }, []);

  function handleExport() {
    setExporting(true);
    setMsg(null);
    try {
      const items: ExportItem[] = getLocalFavorites().map((f) => ({
        title: f.title,
        original_title: f.original_title,
        type: f.type,
        year: f.year,
        director: f.director,
        actors: null,
        genre: null,
        region: null,
        rating: f.rating,
        poster_url: f.poster_url,
        douban_id: f.douban_id,
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

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg(null);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const items: ExportItem[] = JSON.parse(text);
          if (!Array.isArray(items) || items.length === 0) throw new Error('无效文件');

          // 转成 LocalFavorite 格式写入 localStorage
          const imported: LocalFavorite[] = items.map((item) => ({
            douban_id: item.douban_id ?? '',
            media_id: '',
            title: item.title,
            original_title: item.original_title ?? null,
            poster_url: item.poster_url ?? null,
            type: item.type,
            year: item.year ?? null,
            rating: item.rating ?? null,
            director: item.director ?? null,
            status: item.status,
            personal_rating: item.personal_rating ?? null,
            note: item.note ?? null,
            progress: item.progress ?? 0,
            created_at: item.export_at,
            updated_at: item.export_at,
          }));

          // 合并：已有 douban_id 的覆盖更新，新增的追加
          const existing = getLocalFavorites();
          const existingMap = new Map(existing.map((f) => [f.douban_id, f]));
          for (const item of imported) {
            if (item.douban_id && existingMap.has(item.douban_id)) {
              const old = existingMap.get(item.douban_id)!;
              existingMap.set(item.douban_id, { ...old, ...item, media_id: old.media_id });
            } else if (item.douban_id) {
              existingMap.set(item.douban_id, item);
            }
          }
          setLocalFavorites(Array.from(existingMap.values()));

          computeStats();
          setMsg({ type: 'success', text: `已导入 ${imported.length} 条收藏到本地` });
          onImportDone?.();
        } catch {
          setMsg({ type: 'error', text: '导入失败，请检查文件格式' });
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = '';
        }
      };
      reader.readAsText(file);
    } catch {
      setMsg({ type: 'error', text: '导入失败，请检查文件格式' });
      setImporting(false);
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
          <Row icon={Search}>在「收藏」里搜索电影或电视剧</Row>
          <Row icon={Bookmark}>点击海报打开详情，标记「想看 / 在看 / 看过 / 弃剧」</Row>
          <Row icon={Heart}>给喜欢的作品打 1-5 星，写几句备注</Row>
          <Row icon={Film}>所有数据保存在本地浏览器，换设备记得导出导入</Row>
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
        数据仅保存在本机浏览器中，导出 JSON 文件可迁移到其他设备
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

