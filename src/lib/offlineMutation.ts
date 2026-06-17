import { supabase } from './supabase';
import { queueForSync } from './offlineDb';

export type OfflineOperation = 'create' | 'update' | 'delete';

export interface PersistResult<T = any> {
  /** True when the change was stored locally because the device is offline. */
  queued: boolean;
  /** A real (non-network) error such as a validation failure, otherwise null. */
  error: Error | null;
  /** The resulting row when available (online creates/updates). */
  data: T | null;
}

function looksLikeNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  const msg = (err as { message?: string })?.message?.toLowerCase() || '';
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('fetch')
  );
}

/** Exported for unit testing. */
export const __looksLikeNetworkError = looksLikeNetworkError;

/**
 * Run a Supabase write that survives offline use.
 *
 * When the device is offline (or the request fails for network reasons) the
 * change is appended to the IndexedDB sync queue and replayed automatically by
 * `useOfflineSync` once connectivity returns. For `update`/`delete` the `data`
 * object MUST contain the row `id`.
 */
export async function persist<T = any>(
  collection: string,
  operation: OfflineOperation,
  data: Record<string, any>
): Promise<PersistResult<T>> {
  if (!navigator.onLine) {
    await queueForSync(collection, data, operation);
    return { queued: true, error: null, data: null };
  }

  try {
    const table = supabase.from(collection);
    let error: { message: string } | null = null;
    let result: T | null = null;

    if (operation === 'create') {
      const resp = await table.insert(data).select().maybeSingle();
      error = resp.error;
      result = resp.data as T;
    } else if (operation === 'update') {
      const resp = await table.update(data).eq('id', data.id).select().maybeSingle();
      error = resp.error;
      result = resp.data as T;
    } else {
      const resp = await table.delete().eq('id', data.id);
      error = resp.error;
    }

    if (error) throw error;
    return { queued: false, error: null, data: result };
  } catch (err) {
    if (looksLikeNetworkError(err)) {
      await queueForSync(collection, data, operation);
      return { queued: true, error: null, data: null };
    }
    return { queued: false, error: err as Error, data: null };
  }
}
