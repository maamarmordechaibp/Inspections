interface PriorityAssetsProps {
  assets: {
    id: string;
    name: string;
    type: string;
    location: string;
    status: string;
    daysOverdue: number;
  }[];
}

export default function PriorityAssets({ assets }: PriorityAssetsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Assets Needing Attention</h3>
        <a href="/assets" className="text-xs text-brand-gold hover:text-brand-gold font-medium whitespace-nowrap">
          View all
          <i className="ri-arrow-right-line ml-1"></i>
        </a>
      </div>
      <div className="space-y-2">
        {assets.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">All assets up to date</p>
        )}
        {assets.map((asset) => (
          <a
            key={asset.id}
            href={`/assets/${asset.id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
              <p className="text-xs text-gray-400 truncate">{asset.location}</p>
            </div>
            <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
              asset.status === 'Overdue'
                ? 'bg-red-50 text-red-700'
                : asset.status === 'Due Soon'
                ? 'bg-brand-gold/15 text-brand-gold'
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              {asset.status === 'Overdue' ? `${asset.daysOverdue}d overdue` : asset.status}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}