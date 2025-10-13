import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions {
  key: string;
  data: any;
  delay?: number;
  onSave?: () => void;
  onRestore?: (data: any) => void;
  shouldSave?: (data: any) => boolean;
}

export function useAutoSave({ key, data, delay = 1500, onSave, onRestore, shouldSave }: AutoSaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const initializedRef = useRef(false);

  const saveData = useCallback(() => {
    if (shouldSave && !shouldSave(data)) {
      try { localStorage.removeItem(key); } catch {}
      lastSavedRef.current = '';
      return;
    }
    const str = JSON.stringify(data);
    if (str !== lastSavedRef.current) {
      try { localStorage.setItem(key, str); lastSavedRef.current = str; onSave?.(); } catch {}
    }
  }, [data, key, onSave, shouldSave]);

  useEffect(() => {
    if (!initializedRef.current) { initializedRef.current = true; return; }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(saveData, delay);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [data, delay, saveData]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        onRestore?.(parsed);
        lastSavedRef.current = saved;
      }
    } catch {}
  }, [key, onRestore]);

  const clearSavedData = useCallback(() => {
    try { localStorage.removeItem(key); } catch {}
    lastSavedRef.current = '';
  }, [key]);

  return { clearSavedData };
}
