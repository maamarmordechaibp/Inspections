import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import type { WorkOrderItem } from '@/mocks/workOrders';
import { mockWorkOrders, priorityStyles, statusStyles } from '@/mocks/workOrders';

const statusFilters = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'];
const priorityFilters = ['All', 'Low', 'Medium', 'High', 'Urgent'];

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id, proposal_id, customer_id, title, description, priority, status, assigned_to,
          scheduled_date, completed_date, labor_hours, materials_cost, labor_cost, total_cost,
          created_at,
          customers:customer_id (name),
          profiles:assigned_to (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: WorkOrderItem[] = (data || []).map((w: any) => ({
        id: w.id,
        proposal_id: w.proposal_id,
        customer_id: w.customer_id,
        customer_name: w.customers?.name || 'Unknown',
        title: w.title,
        description: w.description,
        priority: w.priority,
        status: w.status,
        assigned_to: w.assigned_to,
        assigned_name: w.profiles?.full_name || null,
        scheduled_date: w.scheduled_date,
        completed_date: w.completed_date,
        labor_hours: w.labor_hours,
        materials_cost: w.materials_cost,
        labor_cost: w.labor_cost,
        total_cost: w.total_cost,
        created_at: w.created_at,
      }));

      setWorkOrders(mapped);
    } catch {
      setWorkOrders(mockWorkOrders);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const filtered = useMemo(() => {
    return workOrders.filter((w) => {
      const matchSearch =
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        (w.assigned_name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || w.status === statusFilter.toLowerCase().replace(' ', '_');
      const matchPriority = priorityFilter === 'All' || w.priority === priorityFilter.toLowerCase();
      return matchSearch && matchStatus && matchPriority;
    });
  }, [workOrders, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: workOrders.length };
    statusFilters.slice(1).forEach((s) => {
      const key = s.toLowerCase().replace(' ', '_');
      c[s] = workOrders.filter((w) => w.status === key).length;
    });
    return c;
  }, [workOrders]);

  const stats = useMemo(() => {
    return {
      total: workOrders.length,
      pending: workOrders.filter((w) => w.status === 'pending').length,
      inProgress: workOrders.filter((w) => w.status === 'in_progress').length,
      completed: workOrders.filter((w) => w.status === 'completed').length,
      revenue: workOrders.filter((w) => w.status === 'completed').reduce((sum, w) => sum + w.total_cost, 0),
    };
  }, [workOrders]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString().split('T')[0];
      } else {
        updates.completed_date = null;
      }
      const { error } = await supabase.from('work_orders').update(updates).eq('id', id);
      if (error) throw error;
      setWorkOrders((prev) => prev.map((w) => (w.id === id ? { ...w, status: newStatus as any, completed_date: updates.completed_date } : w)));
    } catch {
      setWorkOrders((prev) => prev.map((w) => (w.id === id ? { ...w, status: newStatus as any } : w)));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Work Orders</h2>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} work order{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-brand-cyan mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Completed Revenue</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${stats.revenue.toLocaleString()}</p>
          </div>
        </div>

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
                  placeholder="Search by title, customer, or technician..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                />
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
              >
                {priorityFilters.map((p) => (
                  <option key={p} value={p}>{p}</option>
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
              <table className="w-full text-left min-w-[950px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w) => (
                    <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <Link to={`/customers/${w.customer_id}`} className="text-xs md:text-sm text-gray-900 hover:text-brand-navy hover:underline transition-colors">{w.customer_name}</Link>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 max-w-xs">
                        <Link to={`/work-orders/${w.id}`} className="text-xs md:text-sm text-gray-900 hover:text-brand-navy font-medium truncate" title={w.title}>{w.title}</Link>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${priorityStyles[w.priority] || 'bg-gray-50 text-gray-500'}`}>
                          {w.priority}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusStyles[w.status] || 'bg-gray-50 text-gray-500'}`}>
                          {w.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{w.assigned_name || 'Unassigned'}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-900 font-medium">${w.total_cost.toLocaleString()}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <div className="flex items-center gap-1">
                          {user && (user.role === 'admin' || user.role === 'manager') && (
                            <>
                              {w.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusChange(w.id, 'in_progress')}
                                  className="text-brand-cyan hover:bg-brand-cyan/10 rounded-md transition-colors cursor-pointer"
                                  title="Start Work"
                                >
                                  <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-play-line text-sm"></i></span>
                                </button>
                              )}
                              {w.status === 'in_progress' && (
                                <button
                                  onClick={() => handleStatusChange(w.id, 'completed')}
                                  className="text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                  title="Mark Complete"
                                >
                                  <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="text-gray-300 mb-2"><i className="ri-search-line text-3xl"></i></div>
                        <p className="text-sm text-gray-500">No work orders match your filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}