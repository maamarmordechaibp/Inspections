import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InspectionChartProps {
  data: { month: string; completed: number; scheduled: number }[];
}

export default function InspectionChart({ data }: InspectionChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-900">Monthly Inspection Overview</h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
          <span className="text-xs text-gray-400">Scheduled</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 ml-2"></span>
          <span className="text-xs text-gray-400">Completed</span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                fontSize: '13px',
              }}
            />
            <Bar dataKey="scheduled" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}