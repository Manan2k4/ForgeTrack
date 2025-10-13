import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 100, 
  disabled = false 
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const startTouchRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;
    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        isAtTop = true;
        startY = e.touches[0].clientY;
        startTouchRef.current = startY;
      } else {
        isAtTop = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0 && container.scrollTop === 0) {
        e.preventDefault();
        const distance = Math.min(diff, threshold * 1.5);
        setPullDistance(distance);
        setIsPulling(true);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      setIsPulling(false);
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isRefreshing, isPulling, onRefresh, pullDistance, threshold]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling,
  };
}