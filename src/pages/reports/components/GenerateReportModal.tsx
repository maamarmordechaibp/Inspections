import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    name: string;
    description: string;
  } | null;
  onGenerated: () => void;
}

export default function GenerateReportModal({ isOpen, onClose, template, onGenerated }: GenerateReportModalProps) {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [format, setFormat] = useState('PDF');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !template) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    setDateFrom('');
    setDateTo('');
    setFormat('PDF');
    onClose();
  };

  const handleGenerate = async () => {
    setError('');
    setSuccess('');

    if (!user) {
      setError('You must be logged in to generate a report.');
      return;
    }

    setGenerating(true);

    const sizeEstimate = `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 9)} MB`;

    const payload = {
      name: template.name,
      report_type: template.id,
      generated_by: user.id,
      format,
      size: sizeEstimate,
      data: {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        generatedAt: new Date().toISOString(),
      },
    };

    try {
      const { error: insertErr } = await supabase.from('reports').insert(payload);

      if (insertErr) throw insertErr;

      setSuccess('Report generated successfully!');

      setTimeout(() => {
        handleClose();
        onGenerated();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl w-full max-w-md mx-3 md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900">Generate Report</h3>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">{template.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 md:w-8 md:h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
            disabled={generating}
          >
            <i className="ri-close-line text-gray-400 text-base md:text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
          {/* Template Description */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <span className="w-9 h-9 rounded-lg bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
              <i className="ri-file-text-line text-brand-gold text-sm"></i>
            </span>
            <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                />
              </div>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <div className="flex gap-2">
              {['PDF', 'CSV'].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    format === fmt
                      ? 'border-brand-gold bg-brand-gold/5 text-brand-gold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className={`w-4 h-4 flex items-center justify-center ${fmt === 'PDF' ? 'text-red-500' : 'text-emerald-500'}`}>
                      <i className={fmt === 'PDF' ? 'ri-file-pdf-2-line text-xs' : 'ri-file-excel-2-line text-xs'}></i>
                    </span>
                    {fmt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className="ri-error-warning-line text-xs"></i>
              </span>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className="ri-check-line text-xs"></i>
              </span>
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={generating}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 px-4 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <i className="ri-flashlight-line text-sm"></i>
                Generate Report
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}