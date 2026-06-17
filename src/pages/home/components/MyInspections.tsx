import { Link } from 'react-router-dom';

interface MyInspection {
  id: string;
  asset: string;
  location: string;
  type: string;
  scheduledDate: string;
  completedDate: string | null;
  status: string;
  rating: string | null;
  findings: string;
}

interface MyInspectionsProps {
  inspections: MyInspection[];
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  completed: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', label: 'Completed' },
  scheduled: { color: 'text-sky-700', bg: 'bg-sky-50 border-sky-100', label: 'Scheduled' },
  overdue: { color: 'text-red-700', bg: 'bg-red-50 border-red-100', label: 'Overdue' },
  in_progress: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', label: 'In Progress' },
};

const ratingConfig: Record<string, { icon: string; color: string; label: string }> = {
  pass: { icon: 'ri-checkbox-circle-fill', color: 'text-emerald-500', label: 'Pass' },
  needs_attention: { icon: 'ri-error-warning-fill', color: 'text-amber-500', label: 'Needs Attention' },
  fail: { icon: 'ri-close-circle-fill', color: 'text-red-500', label: 'Fail' },
};

export default function MyInspections({ inspections }: MyInspectionsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">My Inspections</h3>
        <Link to="/inspections" className="text-xs text-brand-gold hover:text-brand-gold/80 font-medium whitespace-nowrap">
          View all
          <i className="ri-arrow-right-line ml-1"></i>
        </Link>
      </div>

      {inspections.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <i className="ri-clipboard-line text-xl text-gray-300 w-6 h-6 flex items-center justify-center"></i>
          </div>
          <p className="text-sm text-gray-400">No inspections assigned to you yet</p>
        </div>
      )}

      <div className="space-y-1.5">
        {inspections.map((inspection) => {
          const status = statusConfig[inspection.status] || statusConfig.scheduled;
          const rating = inspection.rating ? ratingConfig[inspection.rating] : null;
          const isOverdue = inspection.status === 'scheduled' && new Date(inspection.scheduledDate) < new Date();

          return (
            <Link
              key={inspection.id}
              to={`/inspections/${inspection.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                inspection.status === 'completed'
                  ? 'bg-emerald-50'
                  : isOverdue
                    ? 'bg-red-50'
                    : 'bg-sky-50'
              }`}>
                <i className={`${
                  inspection.status === 'completed'
                    ? 'ri-check-line text-emerald-500'
                    : isOverdue
                      ? 'ri-alert-line text-red-500'
                      : 'ri-calendar-line text-sky-500'
                } text-lg w-5 h-5 flex items-center justify-center`}></i>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{inspection.asset}</p>
                <p className="text-xs text-gray-400 truncate">
                  {inspection.location} &middot; {inspection.type}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {rating && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${rating.color}`}>
                    <i className={`${rating.icon} text-xs w-4 h-4 flex items-center justify-center`}></i>
                    {rating.label}
                  </span>
                )}
                <div className="text-right">
                  <p className={`text-xs font-medium whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                    {new Date(inspection.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${status.color} ${status.bg}`}>
                    {isOverdue ? 'Overdue' : status.label}
                  </span>
                </div>
                <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 text-sm w-4 h-4 flex items-center justify-center transition-colors"></i>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}