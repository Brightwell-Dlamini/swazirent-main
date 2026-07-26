// src/components/OfflineBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Thin bar when the browser reports offline — no heavy polling */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-16 z-40 bg-amber-500 text-amber-950 text-sm px-4 py-2 flex items-center justify-center gap-2 shadow-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You’re offline. Some actions won’t work until you’re back online.</span>
    </div>
  );
}
