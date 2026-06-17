'use client';

import { useEffect, useState } from 'react';

const DEVICE_KEY = 'media_device_id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id || !/^[a-zA-Z0-9_-]{6,64}$/.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
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
