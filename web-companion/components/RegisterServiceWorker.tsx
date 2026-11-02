'use client';

import { useEffect } from 'react';

/** Registrira service worker samo v produkciji (v razvoju bi predpomnilnik motil hot reload). */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW registracija ni uspela:', e));
    }
  }, []);
  return null;
}
