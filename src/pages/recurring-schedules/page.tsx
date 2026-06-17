import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

interface RecurringSchedule {
  id: string;
  asset_id: string;
  customer_id: string;
  asset_type: string;
  frequency: string;
  interval_days: number;
  start_date: string;
  last_generated_date: string | null;
  next_due_date: string | null;
  active: boolean;
  created_at: string;
  asset?: { name: string; location: string };
  customer?: { name: string };
}

const frequencyLabels: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Semi-Annual',
  annual: 'Annual',
  custom: 'Custom',
};

export default function RecurringSchedulesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error: err } = await supabase
          .from('recurring_schedules')
          .select('*, asset:assets(name, location), customer:customers(name)')
          .order('next_due_date', { ascending: true });

        if (err) throw err;
        setSchedules((data || []) as RecurringSchedule[]);
      } catch (err: any) {
        setError(err?.message || 'Failed to load schedules');
        // Fallback to mock
        const { mockAssets } = await import('@/mocks/assets');
        const { mockCustomers } = await import('@/mocks/customers');
        setSchedules([
          {
            id: 'sched-1',
            asset_id: mockAssets[0]?.id || 'a1',
            customer_id: mockCustomers[0]?.id || 'c1',
            asset_type: 'fire-alarm',
            frequency: 'quarterly',
            interval_days: 90,
            start_date: '2025-01-15',
            last_generated_date: '2025-04-15',
            next_due_date: '2025-07-15',
            active: true,
            created_at: '2025-01-15T00:00:00Z',
            asset: { name: mockAssets[0]?.name || 'FA-101', location: mockAssets[0]?.location || 'Lobby' },
            customer: { name: mockCustomers[0]?.name || 'Acme Corp' },
          },
          {
            id: 'sched-2',
            asset_id: mockAssets[1]?.id || 'a2',
            customer_id: mockCustomers[1]?.id || 'c2',
            asset_type: 'extinguisher',
            frequency: 'annual',
            interval_days: 365,
            start_date: '2025-02-01',
            last_generated_date: null,
            next_due_date: '2025-08-01',
            active: true,
            created_at: '2025-02-01T00:00:00Z',
            asset: { name: mockAssets[1]?.name || 'EXT-205', location: mockAssets[1]?.location || 'Kitchen' },
            customer: { name: mockCustomers[1]?.name || 'Beta Inc' },
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = schedules.filter((s) => {
    if (filter === 'active') return s.active;
    if (filter === 'paused') return !s.active;
    if (filter === 'overdue') return s.next_due_date && new Date(s.next_due_date) < new Date();
    return true;
  });

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from('recurring_schedules')
        .update({ active: !current, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !current } : s))
      );
    } catch {
      setError('Failed to update schedule');
    }
  };

  const handleRunGenerator = async () => {
    setRunning(true);
    setRunResult('');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/recurring-inspections`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setRunResult(`Generated ${result.generated} inspections, updated ${result.updated} schedules.`);
      } else {
        setRunResult(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch {
      setRunResult('Failed to run generator. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Recurring Schedules</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Auto-generate future inspections based on frequency rules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunGenerator}
              disabled={running}
              className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {running ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Running...
                </span>
              ) : (
                <>
                  <i className="ri-refresh-line mr-1.5"></i> Run Generator
                </>
              )}
            </button>
          </div>
        </div>

        {runResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${runResult.includes('Error') || runResult.includes('Failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {runResult}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <i className="ri-error-warning-line"></i>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 cursor-pointer">Dismiss</button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'paused', label: 'Paused' },
            { key: 'overdue', label: 'Overdue' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                filter === f.key
                  ? 'bg-brand-navy text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-sm text-gray-400 ml-2">{filtered.length} schedules</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <i className="ri-calendar-schedule-line text-4xl text-gray-300 mb-4 block"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No recurring schedules</h3>
            <p className="text-sm text-gray-500 mb-4">
              Set up recurring schedules on asset detail pages to auto-generate inspections.
            </p>
            <button
              onClick={() => navigate('/assets')}
              className="px-4 py-2 bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap"
            >
              Go to Assets
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Due</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const isOverdue = s.next_due_date && new Date(s.next_due_date) < new Date();
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <Link
                              to={`/assets/${s.asset_id}`}
                              className="text-sm font-medium text-brand-navy hover:text-brand-gold transition-colors"
                            >
                              {s.asset?.name || 'Unknown'}
                            </Link>
                            <p className="text-xs text-gray-400 mt-0.5">{s.asset?.location || '—'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.customer?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{frequencyLabels[s.frequency] || s.frequency}</span>
                          {s.frequency === 'custom' && (
                            <span className="text-xs text-gray-400 ml-1">({s.interval_days}d)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${isOverdue ? 'text-red-500' : 'text-gray-900'}`}>
                            {s.next_due_date
                              ? new Date(s.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </span>
                          {isOverdue && <span className="text-[10px] text-red-400 ml-1">overdue</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                              s.active
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                            onClick={() => handleToggle(s.id, s.active)}
                          >
                            {s.active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/assets/${s.asset_id}`)}
                            className="text-sm text-brand-navy hover:text-brand-gold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            View Asset
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}