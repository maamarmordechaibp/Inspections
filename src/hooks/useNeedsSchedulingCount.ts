import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

export function useNeedsSchedulingCount(): { count: number; loading: boolean } {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only relevant for admin and manager roles
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      setCount(0);
      setLoading(false);
      return;
    }

    async function fetchCount() {
      try {
        // Get all assets with approaching next_due dates
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString();
        const { data: assets, error: assetsErr } = await supabase
          .from('assets')
          .select('id, next_due')
          .not('next_due', 'is', null)
          .lte('next_due', thirtyDaysFromNow);

        if (assetsErr) throw assetsErr;

        if (!assets || assets.length === 0) {
          setCount(0);
          setLoading(false);
          return;
        }

        // Get asset IDs that already have active inspections
        const assetIds = assets.map((a: any) => a.id);
        const { data: activeInspections, error: inspErr } = await supabase
          .from('inspections')
          .select('asset_id')
          .in('asset_id', assetIds)
          .in('status', ['scheduled', 'in_progress']);

        if (inspErr) throw inspErr;

        // Count assets that DON'T have an active inspection
        const activeAssetIds = new Set((activeInspections || []).map((i: any) => i.asset_id));
        const needsCount = assets.filter((a: any) => !activeAssetIds.has(a.id)).length;

        setCount(needsCount);
      } catch {
        // Fall back to mock data
        try {
          const { needsScheduling } = await import('@/mocks/dashboard');
          setCount(needsScheduling.length);
        } catch {
          setCount(0);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCount();
  }, [user]);

  return { count, loading };
}