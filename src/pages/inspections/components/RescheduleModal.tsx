import { useState, useEffect } from 'react';

interface Technician {
  id: string;
  full_name: string;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId: string;
  assetName: string;
  currentDate: string;
  currentInspectorId: string;
  currentInspectorName: string;
  technicians: Technician[];
  onConfirm: (payload: {
    newDate: string;
    newTechnicianId?: string;
  }) => Promise<void>;
}

export default function RescheduleModal({
  isOpen,
  onClose,
  inspectionId,
  assetName,
  currentDate,
  currentInspectorId,
  currentInspectorName,
  technicians,
  onConfirm,
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState(currentDate.slice(0, 10));
  const [newTechnicianId, setNewTechnicianId] = useState(currentInspectorId);
  const [changeTech, setChangeTech] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewDate(currentDate.slice(0, 10));
      setNewTechnicianId(currentInspectorId);
      setChangeTech(false);
    }
  }, [isOpen, currentDate, currentInspectorId]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        newDate,
        newTechnicianId: changeTech ? newTechnicianId : undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasChanged = newDate !== currentDate.slice(0, 10) || (changeTech && newTechnicianId !== currentInspectorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl w-full max-w-[440px] mx-4 shadow-lg">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Reschedule Inspection</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">{assetName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-gray-400"></i>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              New Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-gold bg-white cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setChangeTech(!changeTech)}
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                changeTech ? 'bg-brand-gold border-brand-gold' : 'border-gray-300'
              }`}
            >
              {changeTech && <i className="ri-check-line text-white text-[10px]"></i>}
            </button>
            <span className="text-xs text-gray-600 cursor-pointer" onClick={() => setChangeTech(!changeTech)}>
              Also reassign to a different technician
            </span>
          </div>

          {changeTech && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                New Technician
              </label>
              <select
                value={newTechnicianId}
                onChange={(e) => setNewTechnicianId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-gold bg-white cursor-pointer"
              >
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} {t.id === currentInspectorId ? '(current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasChanged || submitting}
            className="px-5 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-1.5"></i> Saving...
              </>
            ) : (
              <>
                <i className="ri-check-line mr-1.5"></i> Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}