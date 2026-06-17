import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }: UsePullToRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || refreshing) return;
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [disabled, refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || disabled || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff <= 0) {
      setPullDistance(0);
      setPhase('idle');
      return;
    }
    const damped = Math.min(diff * 0.4, 160);
    setPullDistance(damped);
    setPhase(damped >= threshold ? 'ready' : 'pulling');
  }, [disabled, refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled || refreshing) {
      isPulling.current = false;
      return;
    }
    isPulling.current = false;

    if (phase === 'ready') {
      setPhase('refreshing');
      setPullDistance(60);
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPhase('idle');
        setPullDistance(0);
      }
    } else {
      setPhase('idle');
      setPullDistance(0);
    }
  }, [phase, disabled, refreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const indicator = (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: `${pullDistance}px`, opacity: pullDistance > 0 ? 1 : 0 }}
    >
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {phase === 'refreshing' ? (
          <>
            <span className="w-4 h-4 border-2 border-gray-300 border-t-brand-gold rounded-full animate-spin"></span>
            <span>Refreshing...</span>
          </>
        ) : phase === 'ready' ? (
          <>
            <i className="ri-arrow-down-line"></i>
            <span className="text-brand-gold font-medium">Release to refresh</span>
          </>
        ) : phase === 'pulling' ? (
          <>
            <i className="ri-arrow-down-line"></i>
            <span>Pull to refresh</span>
          </>
        ) : null}
      </div>
    </div>
  );

  return { containerRef, indicator, refreshing };
}