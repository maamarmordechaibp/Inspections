import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

interface Technician {
  id: string;
  full_name: string;
}

interface QuickScheduleSingleProps {
  assetId: string;
  assetName: string;
  assetType: string;
  customerId: string | null;
  customerName: string | null;
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

const INSPECTION_TYPES = [
  'Monthly Check',
  'Quarterly Test',
  'Semi-Annual',
  'Annual Inspection',
  'Annual Test',
];

const assetTypeDefaultInspection: Record<string, string> = {
  Extinguisher: 'Monthly Check',
  'Fire Pump': 'Monthly Check',
  'Emergency Lighting': 'Monthly Check',
  Sprinkler: 'Semi-Annual',
  Hydrant: 'Semi-Annual',
  'Kitchen Suppression': 'Semi-Annual',
  'Smoke Control': 'Semi-Annual',
  Alarm: 'Annual Inspection',
  Hose: 'Annual Inspection',
  'Backflow Preventer': 'Annual Inspection',
  'Elevator Recall': 'Annual Inspection',
  'Monitoring System': 'Annual Inspection',
};

export default function QuickScheduleSingle({
  assetId, assetName, assetType, customerId, customerName, open, onClose, onScheduled,
}: QuickScheduleSingleProps) {
  const { user } = useAuth();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inspectorId, setInspectorId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [inspectionType, setInspectionType] = useState(assetTypeDefaultInspection[assetType] || 'Annual Inspection');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showInspectorDropdown, setShowInspectorDropdown] = useState(false);

  const selectedTech = technicians.find((t) => t.id === inspectorId);

  const fetchTechnicians = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician')
        .order('full_name');
      if (data && data.length > 0) {
        setTechnicians(data);
      } else {
        setTechnicians([
          { id: 'usr-003', full_name: 'Mike Rodriguez' },
          { id: 'usr-004', full_name: 'Lisa Thompson' },
        ]);
      }
    } catch {
      setTechnicians([
        { id: 'usr-003', full_name: 'Mike Rodriguez' },
        { id: 'usr-004', full_name: 'Lisa Thompson' },
      ]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      setInspectionType(assetTypeDefaultInspection[assetType] || 'Annual Inspection');
      setInspectorId('');
      setError('');
      setShowInspectorDropdown(false);
      fetchTechnicians();
    }
  }, [open, assetType, fetchTechnicians]);

  const handleSubmit = async () => {
    setError('');
    if (!scheduledDate) { setError('Please pick a date.'); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        asset_id: assetId,
        customer_id: customerId || null,
        inspector_id: inspectorId || user?.id || null,
        scheduled_date: new Date(scheduledDate).toISOString(),
        status: 'scheduled',
        inspection_type: inspectionType,
      };

      const { error: insertErr } = await supabase.from('inspections').insert(payload);
      if (insertErr) throw insertErr;

      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl border border-gray-100 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Quick Schedule</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{assetName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Asset info pill */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
            <span className="w-8 h-8 rounded-lg bg-brand-navy/5 flex items-center justify-center flex-shrink-0">
              <i className="ri-tools-line text-brand-navy text-sm"></i>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{assetName}</p>
              <p className="text-xs text-gray-400">
                {assetType}
                {customerName && <span> · {customerName}</span>}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <i className="ri-error-warning-line flex-shrink-0"></i> {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>
          )}

          {/* Inspection Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Inspection Type</label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
            >
              {INSPECTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
            />
          </div>

          {/* Inspector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Assign Inspector</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInspectorDropdown(!showInspectorDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all cursor-pointer"
              >
                {selectedTech ? (
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-brand-navy">
                        {selectedTech.full_name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </span>
                    <span className="text-sm text-gray-900">{selectedTech.full_name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Self (you)</span>
                )}
                {inspectorId && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setInspectorId(''); }}
                    className="mr-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <i className="ri-close-line text-xs"></i>
                  </button>
                )}
                <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${showInspectorDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {showInspectorDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setInspectorId(''); setShowInspectorDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50"
                    >
                      <span className="text-sm text-gray-400 italic">Self (you)</span>
                    </button>
                    {technicians.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setInspectorId(t.id); setShowInspectorDropdown(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                          inspectorId === t.id ? 'bg-brand-gold/5' : ''
                        }`}
                      >
                        <span className="w-7 h-7 rounded-full bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-brand-navy">
                            {t.full_name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </span>
                        <span className="text-sm text-gray-900">{t.full_name}</span>
                        {inspectorId === t.id && (
                          <i className="ri-check-line text-brand-gold ml-auto"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {showInspectorDropdown && (
              <div className="fixed inset-0 z-10" onClick={() => setShowInspectorDropdown(false)}></div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {submitting ? (
              <span className="flex items-center gap-1.5 justify-center">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Scheduling...
              </span>
            ) : (
              'Schedule Inspection'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}