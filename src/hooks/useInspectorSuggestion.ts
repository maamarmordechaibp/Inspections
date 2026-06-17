import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Suggestion {
  inspectorId: string;
  inspectorName: string;
  count: number;
  lastDate: string;
  reason: string;
}

export function useInspectorSuggestion(assetId: string | null) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestion = useCallback(async () => {
    if (!assetId) {
      setSuggestion(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('inspector_id, scheduled_date, profiles:inspector_id (full_name)')
        .eq('asset_id', assetId)
        .not('inspector_id', 'is', null)
        .order('scheduled_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) {
        setSuggestion(null);
        return;
      }

      // Count inspections per inspector
      const counts: Record<string, { count: number; name: string; lastDate: string }> = {};
      data.forEach((row: any) => {
        const id = row.inspector_id;
        if (!counts[id]) {
          counts[id] = {
            count: 0,
            name: row.profiles?.full_name || 'Unknown',
            lastDate: row.scheduled_date,
          };
        }
        counts[id].count++;
        // Keep the most recent date
        if (row.scheduled_date > counts[id].lastDate) {
          counts[id].lastDate = row.scheduled_date;
        }
      });

      // Find the inspector with the most inspections
      let bestId = '';
      let bestCount = 0;
      let bestName = '';
      let bestLastDate = '';

      Object.entries(counts).forEach(([id, info]) => {
        if (info.count > bestCount) {
          bestId = id;
          bestCount = info.count;
          bestName = info.name;
          bestLastDate = info.lastDate;
        }
      });

      if (bestCount > 0) {
        const lastFormatted = new Date(bestLastDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        setSuggestion({
          inspectorId: bestId,
          inspectorName: bestName,
          count: bestCount,
          lastDate: bestLastDate,
          reason: `${bestName} has done ${bestCount} inspection${bestCount > 1 ? 's' : ''} on this asset, most recently on ${lastFormatted}`,
        });
      } else {
        setSuggestion(null);
      }
    } catch {
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchSuggestion();
  }, [fetchSuggestion]);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  return { suggestion, loading, clearSuggestion };
}