import { useState, useMemo } from 'react';

interface Technician {
  id: string;
  full_name: string;
}

interface BulkInspection {
  id: string;
  inspection_type: string;
  asset_name: string;
  scheduled_date: string;
  status: string;
}

interface BulkRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicianName: string;
  technicians: Technician[];
  allInspections: BulkInspection[];
  onConfirm: (payload: {
    inspectionIds: string[];
    action: 'reassign' | 'reschedule' | 'both';
    newTechnicianId?: string;
    newDate?: string;
  }) => Promise<void>;
}

export default function BulkRescheduleModal({
  isOpen,
  onClose,
  technicianName,
  technicians,
  allInspections,
  onConfirm,
}: BulkRescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [action, setAction] = useState<'reassign' | 'reschedule' | 'both'>('reschedule');
  const [newTechnicianId, setNewTechnicianId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dateInspections = useMemo(() => {
    if (!selectedDate) return [];
    return allInspections.filter((ins) => {
      const d = ins.scheduled_date.slice(0, 10);
      return d === selectedDate;
    });
  }, [allInspections, selectedDate]);

  const datesWithInspections = useMemo(() => {
    const dateSet = new Set<string>();
    allInspections.forEach((ins) => {
      dateSet.add(ins.scheduled_date.slice(0, 10));
    });
    return Array.from(dateSet).sort();
  }, [allInspections]);

  const availableTechnicians = useMemo(() => {
    return technicians.filter((t) => t.full_name !== technicianName);
  }, [technicians, technicianName]);

  const handleConfirm = async () => {
    if (dateInspections.length === 0) return;

    if (action === 'reassign' || action === 'both') {
      if (!newTechnicianId) return;
    }
    if (action === 'reschedule' || action === 'both') {
      if (!newDate) return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        inspectionIds: dateInspections.map((i) => i.id),
        action,
        newTechnicianId: action === 'reassign' || action === 'both' ? newTechnicianId : undefined,
        newDate: action === 'reschedule' || action === 'both' ? newDate : undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-brand-cyan/10 text-brand-cyan',
      overdue: 'bg-red-50 text-red-500',
      in_progress: 'bg-amber-50 text-amber-600',
      completed: 'bg-emerald-50 text-emerald-600',
    };
    return map[status] || 'bg-gray-50 text-gray-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl w-full max-w-[620px] max-h-[85vh] overflow-y-auto mx-4 shadow-lg">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-base font-bold text-gray-900">Bulk Reschedule</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Reschedule inspections for <strong>{technicianName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-gray-400"></i>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: Pick the date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Select Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-gold bg-white cursor-pointer"
            >
              {datesWithInspections.length === 0 && (
                <option value="">No inspections found</option>
              )}
              {datesWithInspections.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {' — '}
                  {allInspections.filter((i) => i.scheduled_date.slice(0, 10) === d).length} inspections
                </option>
              ))}
            </select>
          </div>

          {/* Date inspections list */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Inspections on This Date ({dateInspections.length})
            </label>
            {dateInspections.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-3">No inspections scheduled for this date.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2">
                {dateInspections.map((ins) => (
                  <div
                    key={ins.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-clipboard-line text-gray-400 text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ins.asset_name}</p>
                      <p className="text-xs text-gray-500">{ins.inspection_type}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${statusBadge(ins.status)}`}>
                      {ins.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Action */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setAction('reschedule')}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  action === 'reschedule'
                    ? 'border-brand-gold bg-brand-gold/5 text-brand-gold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className="ri-calendar-line mr-1"></i> New Date
              </button>
              <button
                onClick={() => setAction('reassign')}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  action === 'reassign'
                    ? 'border-brand-gold bg-brand-gold/5 text-brand-gold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className="ri-user-add-line mr-1"></i> New Tech
              </button>
              <button
                onClick={() => setAction('both')}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  action === 'both'
                    ? 'border-brand-gold bg-brand-gold/5 text-brand-gold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className="ri-arrow-left-right-line mr-1"></i> Both
              </button>
            </div>
          </div>

          {/* Step 3: New technician (if applicable) */}
          {(action === 'reassign' || action === 'both') && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Reassign to Technician
              </label>
              <select
                value={newTechnicianId}
                onChange={(e) => setNewTechnicianId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-gold bg-white cursor-pointer"
              >
                <option value="">Select a technician...</option>
                {availableTechnicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 4: New date (if applicable) */}
          {(action === 'reschedule' || action === 'both') && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                New Scheduled Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-gold bg-white cursor-pointer"
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              dateInspections.length === 0 ||
              submitting ||
              (action === 'reassign' && !newTechnicianId) ||
              (action === 'reschedule' && !newDate) ||
              (action === 'both' && (!newTechnicianId || !newDate))
            }
            className="px-5 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-1.5"></i> Applying...
              </>
            ) : (
              <>
                <i className="ri-check-line mr-1.5"></i> Apply Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}