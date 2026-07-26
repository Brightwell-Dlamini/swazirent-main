// src/hooks/useLocalDraft.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const KEY = 'ekhaya_listing_draft_v1';

/**
 * Autosave form state to localStorage every `intervalMs`.
 * Survives refresh; cleared after successful publish/draft-to-server.
 * Zero network cost — feels inevitable on flaky connections.
 */
export function useLocalDraft<T extends object>(
  data: T,
  opts?: { intervalMs?: number; enabled?: boolean }
) {
  const intervalMs = opts?.intervalMs ?? 30000;
  const enabled = opts?.enabled !== false;
  const [restored, setRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const load = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
      setHasDraft(false);
    } catch {
      /* ignore */
    }
  }, []);

  const saveNow = useCallback(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(dataRef.current));
      setHasDraft(true);
    } catch {
      /* quota */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const existing = load();
    setHasDraft(!!existing);
    setRestored(true);
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(saveNow, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, saveNow]);

  // Save on page hide (mobile tab switch)
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', saveNow);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', saveNow);
    };
  }, [enabled, saveNow]);

  return { load, clear, saveNow, hasDraft, restored };
}
