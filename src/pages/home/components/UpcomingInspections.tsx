const priorityColors = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-brand-gold/15 text-brand-gold border-brand-gold/20',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

interface UpcomingInspectionsProps {
  inspections: {
    id: string;
    asset: string;
    location: string;
    type: string;
    date: string;
    assignee: string;
    priority: string;
  }[];
}

export default function UpcomingInspections({ inspections }: UpcomingInspectionsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Inspections</h3>
        <a href="/inspections" className="text-xs text-brand-gold hover:text-brand-gold font-medium whitespace-nowrap">
          View all
          <i className="ri-arrow-right-line ml-1"></i>
        </a>
      </div>
      <div className="space-y-2">
        {inspections.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No upcoming inspections</p>
        )}
        {inspections.map((inspection) => (
          <a
            key={inspection.id}
            href={`/inspections/${inspection.id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              inspection.priority === 'high' ? 'bg-red-400' : inspection.priority === 'medium' ? 'bg-brand-gold/40' : 'bg-emerald-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{inspection.asset}</p>
              <p className="text-xs text-gray-400 truncate">{inspection.location} · {inspection.type}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-medium text-gray-900 whitespace-nowrap">
                {new Date(inspection.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${priorityColors[inspection.priority as keyof typeof priorityColors]}`}>
                {inspection.priority}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}