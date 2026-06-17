import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

interface QuickAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  nextDue: string;
  selected: boolean;
  dueStatus: 'overdue' | 'due_soon' | 'upcoming' | 'ok';
  interval: string;
  inspectionType: string;
}

const assetTypeIcons: Record<string, string> = {
  Extinguisher: 'ri-fire-fill',
  Sprinkler: 'ri-drop-fill',
  Alarm: 'ri-alert-fill',
  Hydrant: 'ri-water-flash-fill',
  Hose: 'ri-bring-to-front',
  'Backflow Preventer': 'ri-contrast-drop-line',
  'Fire Pump': 'ri-speed-up-fill',
  'Kitchen Suppression': 'ri-fire-fill',
  'Emergency Lighting': 'ri-lightbulb-flash-line',
  'Smoke Control': 'ri-windy-line',
  'Elevator Recall': 'ri-arrow-up-down-line',
  'Monitoring System': 'ri-signal-tower-line',
};

const assetTypeColors: Record<string, string> = {
  Extinguisher: 'bg-red-50 text-red-500',
  Sprinkler: 'bg-sky-50 text-sky-600',
  Alarm: 'bg-amber-50 text-amber-600',
  Hydrant: 'bg-blue-50 text-blue-600',
  Hose: 'bg-fuchsia-50 text-fuchsia-600',
  'Backflow Preventer': 'bg-teal-50 text-teal-600',
  'Fire Pump': 'bg-orange-50 text-orange-600',
  'Kitchen Suppression': 'bg-rose-50 text-rose-600',
  'Emergency Lighting': 'bg-green-50 text-green-600',
  'Smoke Control': 'bg-sky-50 text-sky-600',
  'Elevator Recall': 'bg-violet-50 text-violet-600',
  'Monitoring System': 'bg-slate-100 text-slate-600',
};

const assetTypeInterval: Record<string, { label: string; inspectionType: string }> = {
  Extinguisher: { label: 'Monthly', inspectionType: 'Monthly Check' },
  'Fire Pump': { label: 'Monthly', inspectionType: 'Monthly Check' },
  'Emergency Lighting': { label: 'Monthly', inspectionType: 'Monthly Check' },
  Sprinkler: { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  Hydrant: { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  'Kitchen Suppression': { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  'Smoke Control': { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  Alarm: { label: 'Annual', inspectionType: 'Annual Inspection' },
  Hose: { label: 'Annual', inspectionType: 'Annual Inspection' },
  'Backflow Preventer': { label: 'Annual', inspectionType: 'Annual Inspection' },
  'Elevator Recall': { label: 'Annual', inspectionType: 'Annual Inspection' },
  'Monitoring System': { label: 'Annual', inspectionType: 'Annual Inspection' },
};

function getDueStatus(nextDue: string): QuickAsset['dueStatus'] {
  if (!nextDue) return 'ok';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'due_soon';
  if (diffDays <= 90) return 'upcoming';
  return 'ok';
}

const SKIPPED_STORAGE_KEY_PREFIX = 'dousefire_skipped_';

function loadSkippedIds(customerId: string): string[] {
  try {
    const raw = localStorage.getItem(SKIPPED_STORAGE_KEY_PREFIX + customerId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSkippedIds(customerId: string, ids: string[]) {
  localStorage.setItem(SKIPPED_STORAGE_KEY_PREFIX + customerId, JSON.stringify(ids));
}

interface QuickScheduleProps {
  customerId: string;
  onScheduled?: () => void;
}

export default function QuickSchedule({ customerId, onScheduled }: QuickScheduleProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assets, setAssets] = useState<QuickAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load assets for this customer
  const loadAssets = useCallback(async () => {
    setLoading(true);
    const skippedIds = loadSkippedIds(customerId);
    const rawAssets: Array<{ id: string; name: string; type: string; location: string; nextDue: string }> = [];

    try {
      const { data } = await supabase
        .from('assets')
        .select('id, name, type, location, next_due')
        .eq('customer_id', customerId)
        .order('type')
        .order('name');

      if (data && data.length > 0) {
        data.forEach((a: any) => {
          rawAssets.push({
            id: a.id,
            name: a.name,
            type: a.type,
            location: a.location || '',
            nextDue: a.next_due || '',
          });
        });
      }
    } catch {
      // fallback to mock
    }

    if (rawAssets.length === 0) {
      try {
        const { mockAssets } = await import('@/mocks/assets');
        mockAssets
          .filter((a: any) => a.customerId === customerId)
          .forEach((a: any) => {
            rawAssets.push({
              id: a.id,
              name: a.name,
              type: a.type,
              location: a.location,
              nextDue: a.nextDue || '',
            });
          });
      } catch {
        // no-op
      }
    }

    const mapped: QuickAsset[] = rawAssets.map((a) => {
      const interval = assetTypeInterval[a.type];
      const dueStatus = getDueStatus(a.nextDue);
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        location: a.location,
        nextDue: a.nextDue,
        selected: !skippedIds.includes(a.id),
        dueStatus,
        interval: interval?.label || 'N/A',
        inspectionType: interval?.inspectionType || 'Annual Inspection',
      };
    });

    setAssets(mapped);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    if (expanded && assets.length === 0) {
      loadAssets();
    }
  }, [expanded, assets.length, loadAssets]);

  const toggleAsset = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== assetId) return a;
        const newSelected = !a.selected;
        // Update skipped preferences immediately
        const skippedIds = loadSkippedIds(customerId);
        if (newSelected) {
          const idx = skippedIds.indexOf(assetId);
          if (idx >= 0) skippedIds.splice(idx, 1);
        } else {
          if (!skippedIds.includes(assetId)) skippedIds.push(assetId);
        }
        saveSkippedIds(customerId, skippedIds);
        return { ...a, selected: newSelected };
      })
    );
  };

  const selectAll = () => {
    setAssets((prev) => {
      const updated = prev.map((a) => ({ ...a, selected: true }));
      // Clear all skipped for this customer
      saveSkippedIds(customerId, []);
      return updated;
    });
  };

  const deselectAll = () => {
    setAssets((prev) => {
      const updated = prev.map((a) => ({ ...a, selected: false }));
      // Add all to skipped
      saveSkippedIds(customerId, prev.map((a) => a.id));
      return updated;
    });
  };

  const selectedAssets = assets.filter((a) => a.selected);
  const selectedCount = selectedAssets.length;

  // Detect auto-suggested inspection type from selected assets
  const suggestedType = (() => {
    if (selectedAssets.length === 0) return '';
    const typeCounts: Record<string, number> = {};
    selectedAssets.forEach((a) => {
      const it = a.inspectionType;
      typeCounts[it] = (typeCounts[it] || 0) + 1;
    });
    let best = '';
    let bestCount = 0;
    for (const [t, c] of Object.entries(typeCounts)) {
      if (c > bestCount) { best = t; bestCount = c; }
    }
    return best;
  })();

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (selectedAssets.length === 0) {
      setError('No assets selected. Check at least one.');
      return;
    }
    if (!scheduledDate) {
      setError('Please pick a scheduled date.');
      return;
    }

    setSubmitting(true);
    const batchId = crypto.randomUUID();

    try {
      for (const asset of selectedAssets) {
        const payload: Record<string, any> = {
          asset_id: asset.id,
          customer_id: customerId,
          inspector_id: user?.id || null,
          scheduled_date: new Date(scheduledDate).toISOString(),
          status: 'scheduled',
          inspection_type: asset.inspectionType,
          batch_id: batchId,
        };

        const { error: insertErr } = await supabase.from('inspections').insert(payload);
        if (insertErr) throw insertErr;
      }

      setSuccess(`Scheduled ${selectedCount} inspection${selectedCount !== 1 ? 's' : ''}!`);
      if (onScheduled) {
        setTimeout(() => onScheduled(), 1200);
      } else {
        setTimeout(() => navigate(`/customers/${customerId}`), 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create inspections.');
    } finally {
      setSubmitting(false);
    }
  };

  // Group by type for display
  const grouped: Record<string, QuickAsset[]> = {};
  assets.forEach((a) => {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  });

  const typeEntries = Object.entries(grouped);
  const totalSkipped = assets.filter((a) => !a.selected).length;

  const dueBadge = (status: QuickAsset['dueStatus']) => {
    switch (status) {
      case 'overdue':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 flex-shrink-0">Overdue</span>;
      case 'due_soon':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 flex-shrink-0">Due soon</span>;
      case 'upcoming':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-600 flex-shrink-0">Upcoming</span>;
      default:
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 flex-shrink-0">OK</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
            <i className="ri-flashlight-line"></i>
          </span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">Quick Schedule</h3>
            <p className="text-xs text-gray-400">
              {loading ? 'Loading...' : `${assets.length} asset${assets.length !== 1 ? 's' : ''} · ${selectedCount} selected`}
              {totalSkipped > 0 && <span className="text-amber-500 ml-1">· {totalSkipped} skipped</span>}
            </p>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <i className="ri-arrow-down-s-line"></i>
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <i className="ri-loader-4-line animate-spin text-brand-gold text-xl"></i>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <span className="w-10 h-10 flex items-center justify-center mx-auto mb-2 text-gray-300">
                <i className="ri-tools-line text-2xl"></i>
              </span>
              <p className="text-sm text-gray-500">No assets linked to this customer yet.</p>
              <button
                onClick={() => navigate(`/customers/${customerId}/schedule`)}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line"></i> Add assets & schedule
              </button>
            </div>
          ) : (
            <>
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Skip All
                  </button>
                </div>

                <div className="flex items-center gap-3 ml-auto flex-wrap">
                  {suggestedType && selectedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <i className="ri-lightbulb-line text-brand-gold"></i>
                      <span className="font-medium">{suggestedType}</span>
                      <span className="text-gray-300">for {selectedCount} item{selectedCount !== 1 ? 's' : ''}</span>
                    </span>
                  )}
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || selectedCount === 0}
                    className="px-4 py-1.5 rounded-lg bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Scheduling...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <i className="ri-calendar-check-line"></i>
                        Schedule {selectedCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                  <i className="ri-error-warning-line"></i> {error}
                  <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 mb-3">
                  <i className="ri-check-line"></i> {success}
                </div>
              )}

              {/* Asset type groups */}
              <div className="space-y-3 mt-1">
                {typeEntries.map(([type, typeAssets]) => (
                  <div key={type} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50/70 border-b border-gray-50 flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${assetTypeColors[type] || 'bg-gray-100 text-gray-500'}`}>
                        <i className={`${assetTypeIcons[type] || 'ri-tools-line'} text-[11px]`}></i>
                      </span>
                      <span className="text-xs font-semibold text-gray-700">{type}</span>
                      <span className="text-[10px] text-gray-400">{typeAssets.length} asset{typeAssets.length !== 1 ? 's' : ''}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        {assetTypeInterval[type]?.label || 'N/A'}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {typeAssets.map((asset) => (
                        <label
                          key={asset.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-gray-50/50 ${
                            asset.selected ? '' : 'opacity-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={asset.selected}
                            onChange={() => toggleAsset(asset.id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-brand-gold focus:ring-brand-gold/20 cursor-pointer flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="text-sm text-gray-900 truncate">{asset.name}</span>
                            <span className="text-xs text-gray-400 truncate hidden sm:inline">{asset.location}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {asset.nextDue && (
                              <span className={`text-[10px] font-medium ${
                                asset.dueStatus === 'overdue' ? 'text-red-600' :
                                asset.dueStatus === 'due_soon' ? 'text-amber-600' :
                                'text-gray-400'
                              } hidden sm:inline`}>
                                {new Date(asset.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {dueBadge(asset.dueStatus)}
                            {!asset.selected && (
                              <span className="text-[10px] text-amber-500 italic flex-shrink-0">skipped</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip */}
              {totalSkipped > 0 && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  <i className="ri-information-line mr-1"></i>
                  {totalSkipped} asset{totalSkipped !== 1 ? 's are' : ' is'} being skipped. Unchecking saves your preference — these won&apos;t be pre-selected next time.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}