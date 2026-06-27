'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('[PWA] SW registered'))
        .catch((e) => console.warn('[PWA] SW register failed:', e));
    }
  }, []);

  return null;
}