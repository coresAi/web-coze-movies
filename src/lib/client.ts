'use client';

import { useEffect, useState } from 'react';

const DEVICE_KEY = 'media_device_id';

function generateUUID(): string {
  // crypto.randomUUID 在非 HTTPS 或旧移动端可能不可用
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch { /* fall through */ }
  }
  // fallback: 手动生成 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[a-zA-Z0-9_-]{6,64}$/.test(id)) {
      id = generateUUID();
      try {
        localStorage.setItem(DEVICE_KEY, id);
      } catch { /* localStorage 不可写时静默 */ }
    }
    return id;
  } catch {
    // localStorage 被禁用（如隐私模式），返回临时 ID
    return generateUUID();
  }
}

export function useDeviceId(): string {
  const [id, setId] = useState<string>('');
  useEffect(() => {
    setId(getOrCreateDeviceId());
  }, []);
  return id;
}

export async function apiFetch<T>(path: string, init?: RequestInit & { deviceId: string }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.deviceId) headers.set('x-device-id', init.deviceId);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let message = `请求失败 ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as T;
}
