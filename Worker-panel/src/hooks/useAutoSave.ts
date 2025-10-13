import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface AutoSaveOptions {
  key: string;
  data: any;
  delay?: number;
  onSave?: () => void;
  onRestore?: (data: any) => void;
  shouldSave?: (data: any) => boolean;
}

export function useAutoSave({ key, data, delay = 2000, onSave, onRestore, shouldSave }: AutoSaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  const pausedUntilRef = useRef<number>(0);
  const restoredForKeyRef = useRef<string | null>(null);

  // Auto-save functionality
  const saveData = useCallback(() => {
    // Respect a brief pause window (e.g., right after clearing)
    if (Date.now() < pausedUntilRef.current) return;

    // Optional predicate to skip saving empty/default states
    if (shouldSave && !shouldSave(data)) {
      try {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
        lastSavedRef.current = '';
      } catch (error) {
        console.error('Auto-save cleanup failed:', error);
      }
      return;
    }
    const dataString = JSON.stringify(data);
    if (dataString !== lastSavedRef.current) {
      try {
        localStorage.setItem(key, dataString);
        lastSavedRef.current = dataString;
        onSave?.();
        
        // Show subtle save indicator
        if (isInitializedRef.current) {
          toast.success('Draft saved', {
            duration: 1500,
            style: {
              fontSize: '14px',
              padding: '8px 12px',
            },
          });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [data, key, onSave, shouldSave]);

  // Debounced auto-save
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveData();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, saveData]);

  // Restore saved data on mount
  useEffect(() => {
    // Only attempt restore once per unique key
    if (restoredForKeyRef.current === key) return;
    restoredForKeyRef.current = key;

    try {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        // Avoid restoring if the current data already matches the saved draft
        const currentDataString = JSON.stringify(data);
        if (savedData !== currentDataString) {
          const parsedData = JSON.parse(savedData);
          onRestore?.(parsedData);
          lastSavedRef.current = savedData;
        } else {
          lastSavedRef.current = savedData;
        }
      }
    } catch (error) {
      console.error('Failed to restore auto-saved data:', error);
    }
  }, [key, onRestore]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {}
    lastSavedRef.current = '';
    // Pause saving briefly to avoid immediate re-save after clearing
    pausedUntilRef.current = Date.now() + Math.max(750, delay);
  }, [key, delay]);

  // Check if there's saved data
  const hasSavedData = useCallback(() => {
    return localStorage.getItem(key) !== null;
  }, [key]);

  return {
    saveData,
    clearSavedData,
    hasSavedData,
  };
}