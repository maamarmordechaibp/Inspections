interface ComplianceWidgetProps {
  categories: { name: string; rate: number; total: number }[];
}

export default function ComplianceWidget({ categories }: ComplianceWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Compliance by Category</h3>
      <div className="space-y-4">
        {categories.map((item) => (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-700">{item.name}</span>
              <span className="text-sm font-semibold text-gray-900">{item.rate}%</span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                  item.rate >= 95 ? 'bg-emerald-400' : item.rate >= 90 ? 'bg-brand-gold' : 'bg-red-400'
                }`}
                style={{ width: `${item.rate}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{item.total} assets</p>
          </div>
        ))}
      </div>
    </div>
  );
}