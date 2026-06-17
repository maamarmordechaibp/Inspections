interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: string;
  iconBg: string;
  iconColor: string;
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          <i className={`${icon} ${iconColor} text-lg w-5 h-5 flex items-center justify-center`}></i>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {change && (
          <span className={`text-xs font-medium flex items-center gap-0.5 mb-0.5 ${
            changeType === 'up' ? 'text-emerald-600' : changeType === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            <i className={`text-[10px] w-3 h-3 flex items-center justify-center ${changeType === 'up' ? 'ri-arrow-up-s-line' : changeType === 'down' ? 'ri-arrow-down-s-line' : ''}`}></i>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}