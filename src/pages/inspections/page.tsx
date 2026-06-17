import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const statusFilters = ['All', 'Scheduled', 'In Progress', 'Completed', 'Overdue'];

const statusStyles: Record<string, string> = {
  scheduled: 'bg-brand-cyan/10 text-brand-cyan',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-500',
};

const ratingStyles: Record<string, string> = {
  pass: 'bg-emerald-50 text-emerald-600',
  fail: 'bg-red-50 text-red-500',
  needs_attention: 'bg-amber-50 text-amber-600',
};

interface Inspection {
  id: string;
  asset_name: string;
  asset_location: string;
  inspection_type: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  inspector_name: string;
  rating: string | null;
  findings: string | null;
  customer_name: string | null;
  customer_id: string | null;
  customer_phone: string | null;
  batch_id: string | null;
}

export default function InspectionsPage() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchInspections = useCallback(async () => {
    try {
      let query = supabase
        .from('inspections')
        .select(`
          id,
          scheduled_date,
          completed_date,
          status,
          inspection_type,
          rating,
          findings,
          batch_id,
          inspector_id,
          assets:asset_id (name, location),
          profiles:inspector_id (full_name),
          customers:customer_id (id, name, phone)
        `)
        .order('scheduled_date', { ascending: false });

      // Technicians only see their own assigned inspections
      if (user?.role === 'technician') {
        query = query.eq('inspector_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: Inspection[] = (data || []).map((item: any) => ({
        id: item.id,
        asset_name: item.assets?.name || 'Unknown',
        asset_location: item.assets?.location || 'Unknown',
        inspection_type: item.inspection_type,
        scheduled_date: item.scheduled_date,
        completed_date: item.completed_date,
        status: item.status,
        inspector_name: item.profiles?.full_name || 'Unassigned',
        rating: item.rating,
        findings: item.findings,
        customer_name: item.customers?.name || null,
        customer_id: item.customers?.id || null,
        customer_phone: item.customers?.phone || null,
        batch_id: item.batch_id || null,
      }));

      setInspections(mapped);
    } catch {
      const { mockInspections } = await import('@/mocks/inspections');
      const filtered = user?.role === 'technician'
        ? mockInspections.filter((i: any) => i.inspectorName === user?.fullName)
        : mockInspections;
      setInspections(filtered.map((i: any) => ({
        ...i,
        asset_name: i.assetName,
        asset_location: i.location,
        inspection_type: i.type,
        scheduled_date: i.scheduledDate,
        completed_date: i.completedDate,
        inspector_name: i.inspectorName,
        batch_id: i.batch_id || null,
      })));
    }
  }, [user]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchInspections();
      setLoading(false);
    }
    load();
  }, [fetchInspections]);

  const { containerRef, indicator, refreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchInspections();
    },
    disabled: loading,
  });

  const inspectionTypes = useMemo(() => {
    const types = new Set(inspections.map((i) => i.inspection_type));
    return ['All', ...Array.from(types)];
  }, [inspections]);

  const filtered = useMemo(() => {
    return inspections.filter((ins) => {
      const matchSearch =
        ins.asset_name.toLowerCase().includes(search.toLowerCase()) ||
        ins.asset_location.toLowerCase().includes(search.toLowerCase()) ||
        ins.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || ins.status === statusFilter.toLowerCase().replace(' ', '_');
      const matchType = typeFilter === 'All' || ins.inspection_type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [inspections, search, statusFilter, typeFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: inspections.length };
    statusFilters.slice(1).forEach((s) => {
      const key = s.toLowerCase().replace(' ', '_');
      c[s] = inspections.filter((ins) => ins.status === key).length;
    });
    return c;
  }, [inspections]);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Inspections</h2>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} inspection{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
          {user && user.role !== 'technician' && (
          <Link
            to="/inspections/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            New Inspection
          </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
          </div>
        ) : (
          <div ref={containerRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)', WebkitOverflowScrolling: 'touch' }}>
            {indicator}
            <div className="bg-white rounded-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by asset, location, or ID..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
              >
                {inspectionTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-brand-navy text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s}
                  <span className={`ml-1.5 ${statusFilter === s ? 'text-white/60' : 'text-gray-400'}`}>{counts[s] || 0}</span>
                </button>
              ))}
            </div>

            <div className="table-scroll overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Inspector</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ins) => (
                    <tr key={ins.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/inspections/${ins.id}`} className="text-xs md:text-sm font-medium text-brand-navy hover:text-brand-gold transition-colors">
                            {ins.id.slice(0, 8)}...
                          </Link>
                          {ins.batch_id && (
                            <span className="w-4 h-4 flex items-center justify-center text-amber-500" title="Batch inspection">
                              <i className="ri-stack-fill text-[10px]"></i>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <p className="text-xs md:text-sm text-gray-900">{ins.asset_name}</p>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{ins.inspection_type}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-500">{ins.asset_location}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusStyles[ins.status] || 'bg-gray-50 text-gray-500'}`}>
                          {ins.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        {ins.customer_id ? (
                          <Link to={`/customers/${ins.customer_id}`} className="text-xs md:text-sm text-gray-600 hover:text-brand-navy hover:underline transition-colors">
                            {ins.customer_name || '—'}
                          </Link>
                        ) : (
                          <span className="text-xs md:text-sm text-gray-400">{ins.customer_name || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{ins.inspector_name}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">
                          {new Date(ins.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        {ins.rating ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${ratingStyles[ins.rating] || 'bg-gray-50 text-gray-500'}`}>
                            {ins.rating.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <div className="flex items-center gap-0.5">
                          {ins.status !== 'completed' && (
                            <Link
                              to={`/inspections/${ins.id}/perform`}
                              className="text-brand-gold hover:bg-brand-gold/10 rounded-md transition-colors cursor-pointer"
                              title="Perform Inspection"
                            >
                              <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center">
                                <i className="ri-clipboard-line text-sm"></i>
                              </span>
                            </Link>
                          )}
                          <Link to={`/inspections/${ins.id}`} className="text-gray-400 hover:text-brand-navy transition-colors">
                            <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center">
                              <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
                            </span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="text-gray-300 mb-2">
                          <i className="ri-search-line text-3xl"></i>
                        </div>
                        <p className="text-sm text-gray-500">No inspections match your filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}