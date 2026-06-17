import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, queueForSync, getPendingSyncItems, markSynced } from '@/lib/offlineDb';
import { supabase } from '@/lib/supabase';

interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSync: Date | null;
  syncing: boolean;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    lastSync: null,
    syncing: false,
  });

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setState((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — non-critical
      });
    }
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      updatePendingCount();
    };
    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        updatePendingCount();
        setState((prev) => ({ ...prev, lastSync: new Date(), syncing: false }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [updatePendingCount]);

  const syncNow = useCallback(async () => {
    if (!state.isOnline) return;
    setState((prev) => ({ ...prev, syncing: true }));

    try {
      const items = await getPendingSyncItems();
      for (const item of items) {
        try {
          const table = supabase.from(item.collection);
          if (item.operation === 'create') {
            await table.insert(item.data);
          } else if (item.operation === 'update') {
            await table.update(item.data).eq('id', item.data.id);
          } else if (item.operation === 'delete') {
            await table.delete().eq('id', item.data.id);
          }
          await markSynced(item.id);
        } catch {
          // Skip failed items, will retry next sync
        }
      }
    } catch {
      // Sync failed
    } finally {
      await updatePendingCount();
      setState((prev) => ({ ...prev, syncing: false, lastSync: new Date() }));
    }
  }, [state.isOnline, updatePendingCount]);

  const queueOfflineAction = useCallback(async (
    collection: string,
    data: any,
    operation: 'create' | 'update' | 'delete'
  ) => {
    await queueForSync(collection, data, operation);
    await updatePendingCount();
  }, [updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (state.isOnline && state.pendingCount > 0 && !state.syncing) {
      syncNow();
    }
  }, [state.isOnline, state.pendingCount, state.syncing, syncNow]);

  return {
    ...state,
    syncNow,
    queueOfflineAction,
  };
}