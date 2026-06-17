import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import type { DeficiencyItem } from '@/mocks/deficiencies';
import { mockDeficiencies, severityStyles, statusStyles } from '@/mocks/deficiencies';
import ConvertDeficiencyModal from './components/ConvertDeficiencyModal';

const statusFilters = ['All', 'Open', 'In Progress', 'Resolved'];
const severityFilters = ['All', 'Low', 'Medium', 'High', 'Critical'];

export default function DeficienciesPage() {
  const { user } = useAuth();
  const [deficiencies, setDeficiencies] = useState<DeficiencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [convertTargets, setConvertTargets] = useState<DeficiencyItem[] | null>(null);

  const canConvert = !!user && (user.role === 'admin' || user.role === 'manager');

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('deficiencies')
        .select(`
          id, inspection_id, asset_id, customer_id, checklist_item_id, checklist_item_description,
          severity, description, corrective_action, status, estimated_cost, resolved_at, created_at,
          assets:asset_id (name),
          customers:customer_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: DeficiencyItem[] = (data || []).map((d: any) => ({
        id: d.id,
        inspection_id: d.inspection_id,
        asset_id: d.asset_id,
        customer_id: d.customer_id,
        customer_name: d.customers?.name || 'Unknown',
        asset_name: d.assets?.name || null,
        checklist_item_id: d.checklist_item_id,
        checklist_item_description: d.checklist_item_description,
        severity: d.severity,
        description: d.description,
        corrective_action: d.corrective_action,
        status: d.status,
        estimated_cost: d.estimated_cost,
        resolved_at: d.resolved_at,
        created_at: d.created_at,
      }));

      setDeficiencies(mapped);
    } catch {
      setDeficiencies(mockDeficiencies);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const filtered = useMemo(() => {
    return deficiencies.filter((d) => {
      const matchSearch =
        d.description.toLowerCase().includes(search.toLowerCase()) ||
        d.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.asset_name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || d.status === statusFilter.toLowerCase().replace(' ', '_');
      const matchSeverity = severityFilter === 'All' || d.severity === severityFilter.toLowerCase();
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [deficiencies, search, statusFilter, severityFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      All: deficiencies.length,
      Open: deficiencies.filter((d) => d.status === 'open').length,
      'In Progress': deficiencies.filter((d) => d.status === 'in_progress').length,
      Resolved: deficiencies.filter((d) => d.status === 'resolved').length,
    };
    return c;
  }, [deficiencies]);

  const stats = useMemo(() => {
    const open = deficiencies.filter((d) => d.status === 'open' || d.status === 'in_progress');
    return {
      total: deficiencies.length,
      open: open.length,
      critical: open.filter((d) => d.severity === 'critical').length,
      revenue: open.reduce((sum, d) => sum + (d.estimated_cost || 0), 0),
      resolved: deficiencies.filter((d) => d.status === 'resolved').length,
    };
  }, [deficiencies]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      } else {
        updates.resolved_at = null;
        updates.resolved_by = null;
      }
      const { error } = await supabase.from('deficiencies').update(updates).eq('id', id);
      if (error) throw error;
      setDeficiencies((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus as any, resolved_at: updates.resolved_at } : d)));
    } catch {
      // local update only
      setDeficiencies((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus as any } : d)));
    }
  };

  // ── Selection for bulk convert ──
  const selectedDeficiencies = useMemo(
    () => filtered.filter((d) => selectedIds.has(d.id)),
    [filtered, selectedIds],
  );
  // Bulk convert requires a single customer (a proposal/work order belongs to one customer).
  const selectionCustomerIds = useMemo(
    () => new Set(selectedDeficiencies.map((d) => d.customer_id)),
    [selectedDeficiencies],
  );
  const bulkConvertBlocked = selectionCustomerIds.size > 1;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConverted = (ids: string[]) => {
    if (ids.length) {
      setDeficiencies((prev) =>
        prev.map((d) => (ids.includes(d.id) ? { ...d, status: 'in_progress' as any } : d)),
      );
    }
    setSelectedIds(new Set());
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Deficiencies</h2>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} deficiency{filtered.length !== 1 ? 'ies' : 'y'} found</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Open / In Progress</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.open}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Critical</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.critical}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Est. Revenue</p>
            <p className="text-2xl font-bold text-brand-gold mt-1">${stats.revenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Bulk convert bar */}
        {canConvert && selectedIds.size > 0 && (
          <div className="sticky top-2 z-10 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-brand-navy text-white rounded-xl px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <i className="ri-checkbox-multiple-line text-brand-gold"></i>
              <span className="font-semibold">{selectedIds.size} selected</span>
              {bulkConvertBlocked && (
                <span className="text-amber-300 text-xs ml-1">· select one customer at a time to convert</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                disabled={bulkConvertBlocked}
                onClick={() => setConvertTargets(selectedDeficiencies)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-gold text-brand-navy hover:bg-brand-gold/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <i className="ri-money-dollar-circle-line"></i>
                Convert to revenue
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by description, customer, or asset..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
              >
                {severityFilters.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === s ? 'bg-brand-navy text-white' : 'text-gray-500 hover:bg-gray-50'
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
                    {canConvert && (
                      <th className="px-3 md:px-4 py-3 w-8">
                        <span className="sr-only">Select</span>
                      </th>
                    )}
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Est. Cost</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {canConvert && (
                        <td className="px-3 md:px-4 py-2.5 md:py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(d.id)}
                            onChange={() => toggleSelect(d.id)}
                            disabled={d.status === 'resolved'}
                            className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-gold cursor-pointer disabled:opacity-30"
                            aria-label={`Select deficiency: ${d.description.slice(0, 40)}`}
                          />
                        </td>
                      )}
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">
                          {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <Link to={`/customers/${d.customer_id}`} className="text-xs md:text-sm text-gray-900 hover:text-brand-navy hover:underline transition-colors">
                          {d.customer_name}
                        </Link>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{d.asset_name || '—'}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 max-w-xs">
                        <p className="text-xs md:text-sm text-gray-900 truncate" title={d.description}>{d.description}</p>
                        {d.corrective_action && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5" title={d.corrective_action}>Fix: {d.corrective_action}</p>
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${severityStyles[d.severity] || 'bg-gray-50 text-gray-500'}`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusStyles[d.status] || 'bg-gray-50 text-gray-500'}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-900 font-medium">
                          {d.estimated_cost ? `$${d.estimated_cost.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <div className="flex items-center gap-1">
                          {d.status !== 'resolved' && canConvert && (
                            <button
                              onClick={() => setConvertTargets([d])}
                              className="text-brand-gold hover:bg-brand-gold/10 rounded-md transition-colors cursor-pointer"
                              title="Convert to proposal or work order"
                            >
                              <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-money-dollar-circle-line text-sm"></i></span>
                            </button>
                          )}
                          {d.status !== 'resolved' && user && (user.role === 'admin' || user.role === 'manager') && (
                            <>
                              {d.status === 'open' && (
                                <button
                                  onClick={() => handleStatusChange(d.id, 'in_progress')}
                                  className="text-brand-cyan hover:bg-brand-cyan/10 rounded-md transition-colors cursor-pointer"
                                  title="Start Work"
                                >
                                  <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-play-line text-sm"></i></span>
                                </button>
                              )}
                              {d.status === 'in_progress' && (
                                <button
                                  onClick={() => handleStatusChange(d.id, 'resolved')}
                                  className="text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                  title="Mark Resolved"
                                >
                                  <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span>
                                </button>
                              )}
                            </>
                          )}
                          <Link to={`/inspections/${d.inspection_id}`} className="text-gray-400 hover:text-brand-navy transition-colors" title="View Inspection">
                            <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-arrow-right-s-line text-base md:text-lg"></i></span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={canConvert ? 9 : 8} className="px-4 py-12 text-center">
                        <div className="text-gray-300 mb-2"><i className="ri-search-line text-3xl"></i></div>
                        <p className="text-sm text-gray-500">No deficiencies match your filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {convertTargets && convertTargets.length > 0 && (
        <ConvertDeficiencyModal
          deficiencies={convertTargets}
          onClose={() => setConvertTargets(null)}
          onConverted={handleConverted}
        />
      )}
    </DashboardLayout>
  );
}