const typeIcons: Record<string, { icon: string; bg: string }> = {
  inspection: { icon: 'ri-clipboard-line', bg: 'bg-emerald-50 text-emerald-600' },
  report: { icon: 'ri-file-chart-line', bg: 'bg-violet-50 text-violet-600' },
  asset: { icon: 'ri-tools-line', bg: 'bg-brand-gold/15 text-brand-gold' },
  issue: { icon: 'ri-error-warning-line', bg: 'bg-red-50 text-red-600' },
  schedule: { icon: 'ri-calendar-line', bg: 'bg-sky-50 text-sky-600' },
};

interface RecentActivityProps {
  activities: {
    id: string | number;
    user: string;
    action: string;
    target: string;
    time: string;
    type: string;
  }[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-0">
        {activities.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
        )}
        {activities.map((activity, idx) => {
          const typeInfo = typeIcons[activity.type] || typeIcons.inspection;
          return (
            <div key={activity.id} className={`flex items-start gap-3 py-2.5 ${idx !== activities.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <i className={`${typeInfo.icon} text-sm w-4 h-4 flex items-center justify-center`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{activity.user}</span>
                  {' '}{activity.action}{' '}
                  <span className="font-medium text-gray-800">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}