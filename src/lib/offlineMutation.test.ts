import { describe, it, expect, beforeEach, vi } from 'vitest';

// Ensure import.meta.env access in supabase.ts does not crash and that the
// online flag is deterministic before importing the module under test.
vi.stubGlobal('navigator', { onLine: true });

import { __looksLikeNetworkError } from '@/lib/offlineMutation';

describe('looksLikeNetworkError', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('treats an offline navigator as a network error regardless of message', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(__looksLikeNetworkError(new Error('anything'))).toBe(true);
  });

  it('matches common fetch/network failure messages', () => {
    expect(__looksLikeNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(__looksLikeNetworkError(new Error('NetworkError when attempting'))).toBe(true);
    expect(__looksLikeNetworkError(new Error('Load failed'))).toBe(true);
    expect(__looksLikeNetworkError(new Error('Request timeout'))).toBe(true);
  });

  it('does not flag genuine validation / DB errors as network errors', () => {
    expect(__looksLikeNetworkError(new Error('duplicate key value violates unique constraint'))).toBe(false);
    expect(__looksLikeNetworkError(new Error('new row violates row-level security policy'))).toBe(false);
    expect(__looksLikeNetworkError({ message: 'column does not exist' })).toBe(false);
  });

  it('handles null / undefined errors gracefully', () => {
    expect(__looksLikeNetworkError(null)).toBe(false);
    expect(__looksLikeNetworkError(undefined)).toBe(false);
  });
});
