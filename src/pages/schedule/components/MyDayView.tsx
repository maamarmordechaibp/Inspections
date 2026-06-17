import { useState } from 'react';

interface ScheduleInspection {
  id: string;
  inspection_type: string;
  asset_name: string;
  asset_location: string;
  inspector_name: string;
  scheduled_date: string;
  status: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
}

interface MyDayViewProps {
  inspections: ScheduleInspection[];
  onCheckIn: (id: string) => Promise<void>;
  onCheckOut: (id: string) => Promise<void>;
  loading: boolean;
}

const statusBadge: Record<string, string> = {
  scheduled: 'bg-brand-cyan/10 text-brand-cyan',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-500',
  in_progress: 'bg-amber-50 text-amber-600',
};

export default function MyDayView({ inspections, onCheckIn, onCheckOut, loading }: MyDayViewProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const todayInspections = inspections.filter((ins) => {
    const insDate = ins.scheduled_date.slice(0, 10);
    return insDate === todayStr;
  });

  const handleCheckIn = async (id: string) => {
    setActionLoading(id);
    await onCheckIn(id);
    setActionLoading(null);
  };

  const handleCheckOut = async (id: string) => {
    setActionLoading(id);
    await onCheckOut(id);
    setActionLoading(null);
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
      </div>
    );
  }

  return (
    <div>
      {/* Today header */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
            <i className="ri-sun-line text-brand-gold text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">My Day</h3>
            <p className="text-sm text-gray-500">
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {todayInspections.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <i className="ri-calendar-check-line text-gray-300 text-2xl"></i>
          </div>
          <h4 className="text-base font-semibold text-gray-700">No inspections today</h4>
          <p className="text-sm text-gray-400 mt-1">
            {inspections.length > 0
              ? 'You have inspections on other days. Switch to Week view to see them.'
              : 'No inspections assigned to you yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayInspections.map((ins) => {
            const checkedIn = !!ins.checked_in_at;
            const checkedOut = !!ins.checked_out_at;

            return (
              <div
                key={ins.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors"
              >
                <a href={`/inspections/${ins.id}`} className="block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[ins.status] || 'bg-gray-50 text-gray-500'}`}>
                          {ins.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">{ins.inspection_type}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900">{ins.asset_name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <i className="ri-map-pin-line text-[10px]"></i>
                        {ins.asset_location}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-clipboard-line text-gray-400"></i>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                      <span className="text-xs text-gray-500">
                        {checkedIn ? `In: ${formatTime(ins.checked_in_at)}` : 'Not checked in'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${checkedOut ? 'bg-brand-gold' : 'bg-gray-300'}`}></span>
                      <span className="text-xs text-gray-500">
                        {checkedOut ? `Out: ${formatTime(ins.checked_out_at)}` : 'Not checked out'}
                      </span>
                    </div>
                  </div>
                </a>

                {/* Action buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  {!checkedIn && (
                    <button
                      onClick={() => handleCheckIn(ins.id)}
                      disabled={actionLoading === ins.id}
                      className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      {actionLoading === ins.id ? (
                        <i className="ri-loader-4-line animate-spin"></i>
                      ) : (
                        <>
                          <i className="ri-login-box-line mr-1"></i> Check In
                        </>
                      )}
                    </button>
                  )}
                  {checkedIn && !checkedOut && (
                    <button
                      onClick={() => handleCheckOut(ins.id)}
                      disabled={actionLoading === ins.id}
                      className="flex-1 px-3 py-2 bg-brand-gold hover:bg-brand-gold/90 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      {actionLoading === ins.id ? (
                        <i className="ri-loader-4-line animate-spin"></i>
                      ) : (
                        <>
                          <i className="ri-logout-box-line mr-1"></i> Check Out
                        </>
                      )}
                    </button>
                  )}
                  {checkedIn && checkedOut && (
                    <div className="flex-1 px-3 py-2 bg-gray-50 text-gray-400 text-xs font-medium rounded-lg text-center">
                      <i className="ri-check-double-line mr-1"></i> Completed
                    </div>
                  )}
                  <a
                    href={`/inspections/${ins.id}`}
                    className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-arrow-right-line"></i>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {todayInspections.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {todayInspections.filter((i) => !!i.checked_in_at).length} checked in
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
            {todayInspections.filter((i) => !!i.checked_out_at).length} checked out
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            {todayInspections.filter((i) => !i.checked_in_at).length} pending
          </div>
        </div>
      )}
    </div>
  );
}