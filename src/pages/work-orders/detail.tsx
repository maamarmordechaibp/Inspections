import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import type { PriceBookItem } from '@/mocks/priceBook';
import { getPriceBookItems, searchPriceBook } from '@/mocks/priceBook';
import type { WorkOrderItem } from '@/mocks/workOrders';

interface WorkOrderLineItem {
  id: string;
  price_book_id: string | null;
  description: string;
  category: 'material' | 'labor';
  quantity: number;
  unit_cost: number;
  total: number;
}

interface WorkOrderDetail extends WorkOrderItem {
  line_items: WorkOrderLineItem[];
  notes: string | null;
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);

  const [showPriceBook, setShowPriceBook] = useState(false);
  const [priceSearch, setPriceSearch] = useState('');
  const [priceCategory, setPriceCategory] = useState<'all' | 'material' | 'labor'>('all');
  const [editingLineItem, setEditingLineItem] = useState<WorkOrderLineItem | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customItem, setCustomItem] = useState({ description: '', category: 'material' as 'material' | 'labor', quantity: 1, unit_cost: 0 });
  const [techs, setTechs] = useState<{ id: string; full_name: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('work_orders')
        .select(`
          id, proposal_id, customer_id, title, description, priority, status, assigned_to,
          scheduled_date, completed_date, labor_hours, materials_cost, labor_cost, total_cost,
          notes, line_items, created_at,
          customers:customer_id (name),
          profiles:assigned_to (full_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !data) throw fetchErr || new Error('Work order not found');

      const w = data as any;
      setWorkOrder({
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
        notes: w.notes,
        line_items: (w.line_items || []) as WorkOrderLineItem[],
        created_at: w.created_at,
      });

      const { data: techData } = await supabase.from('profiles').select('id, full_name').eq('role', 'technician');
      if (techData) setTechs(techData.map((t: any) => ({ id: t.id, full_name: t.full_name })));
    } catch (err: any) {
      setError(err.message || 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPriceBook = useMemo(() => {
    let items = priceCategory === 'all' ? getPriceBookItems() : getPriceBookItems().filter((p) => p.category === priceCategory);
    if (priceSearch.trim()) {
      items = searchPriceBook(priceSearch);
      if (priceCategory !== 'all') items = items.filter((p) => p.category === priceCategory);
    }
    return items;
  }, [priceSearch, priceCategory]);

  const recalcTotals = (lineItems: WorkOrderLineItem[]) => {
    const materialsCost = lineItems.filter((li) => li.category === 'material').reduce((sum, li) => sum + li.total, 0);
    const laborCost = lineItems.filter((li) => li.category === 'labor').reduce((sum, li) => sum + li.total, 0);
    const laborHours = lineItems.filter((li) => li.category === 'labor').reduce((sum, li) => sum + li.quantity, 0);
    const total = materialsCost + laborCost;
    return { materialsCost, laborCost, laborHours, total };
  };

  const addPriceBookItem = (item: PriceBookItem) => {
    if (!workOrder) return;
    const newLine: WorkOrderLineItem = {
      id: crypto.randomUUID(),
      price_book_id: item.id,
      description: item.name,
      category: item.category,
      quantity: 1,
      unit_cost: item.unit_cost,
      total: item.unit_cost,
    };
    const updated = [...workOrder.line_items, newLine];
    const totals = recalcTotals(updated);
    setWorkOrder({
      ...workOrder,
      line_items: updated,
      materials_cost: totals.materialsCost,
      labor_cost: totals.laborCost,
      labor_hours: totals.laborHours,
      total_cost: totals.total,
    });
    setShowPriceBook(false);
    setPriceSearch('');
  };

  const addCustomItem = () => {
    if (!workOrder || !customItem.description.trim()) return;
    const newLine: WorkOrderLineItem = {
      id: crypto.randomUUID(),
      price_book_id: null,
      description: customItem.description,
      category: customItem.category,
      quantity: customItem.quantity,
      unit_cost: customItem.unit_cost,
      total: customItem.quantity * customItem.unit_cost,
    };
    const updated = [...workOrder.line_items, newLine];
    const totals = recalcTotals(updated);
    setWorkOrder({
      ...workOrder,
      line_items: updated,
      materials_cost: totals.materialsCost,
      labor_cost: totals.laborCost,
      labor_hours: totals.laborHours,
      total_cost: totals.total,
    });
    setShowAddCustom(false);
    setCustomItem({ description: '', category: 'material', quantity: 1, unit_cost: 0 });
  };

  const updateLineItem = (lineId: string, updates: Partial<WorkOrderLineItem>) => {
    if (!workOrder) return;
    const updated = workOrder.line_items.map((li) => {
      if (li.id !== lineId) return li;
      const qty = updates.quantity !== undefined ? updates.quantity : li.quantity;
      const cost = updates.unit_cost !== undefined ? updates.unit_cost : li.unit_cost;
      return { ...li, ...updates, total: qty * cost };
    });
    const totals = recalcTotals(updated);
    setWorkOrder({
      ...workOrder,
      line_items: updated,
      materials_cost: totals.materialsCost,
      labor_cost: totals.laborCost,
      labor_hours: totals.laborHours,
      total_cost: totals.total,
    });
  };

  const removeLineItem = (lineId: string) => {
    if (!workOrder) return;
    const updated = workOrder.line_items.filter((li) => li.id !== lineId);
    const totals = recalcTotals(updated);
    setWorkOrder({
      ...workOrder,
      line_items: updated,
      materials_cost: totals.materialsCost,
      labor_cost: totals.laborCost,
      labor_hours: totals.laborHours,
      total_cost: totals.total,
    });
    setEditingLineItem(null);
  };

  const handleSave = async () => {
    if (!workOrder) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error: saveErr } = await supabase.from('work_orders').update({
        line_items: workOrder.line_items,
        materials_cost: workOrder.materials_cost,
        labor_cost: workOrder.labor_cost,
        labor_hours: workOrder.labor_hours,
        total_cost: workOrder.total_cost,
        notes: workOrder.notes,
        assigned_to: workOrder.assigned_to,
        status: workOrder.status,
      }).eq('id', id);
      if (saveErr) throw saveErr;
      setSuccess('Work order updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!workOrder) return;
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') updates.completed_date = new Date().toISOString().split('T')[0];
    else updates.completed_date = null;

    try {
      const { error: upErr } = await supabase.from('work_orders').update(updates).eq('id', id);
      if (upErr) throw upErr;
      setWorkOrder({ ...workOrder, status: newStatus as any, completed_date: updates.completed_date });
    } catch (err: any) {
      setError(err.message || 'Status update failed');
    }
  };

  const handleAssign = async (techId: string | null) => {
    if (!workOrder) return;
    try {
      const { error: upErr } = await supabase.from('work_orders').update({ assigned_to: techId }).eq('id', id);
      if (upErr) throw upErr;
      const name = techId ? techs.find((t) => t.id === techId)?.full_name || 'Unknown' : null;
      setWorkOrder({ ...workOrder, assigned_to: techId, assigned_name: name });
    } catch (err: any) {
      setError(err.message || 'Assignment failed');
    }
  };

  const priorityStyles: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-amber-50 text-amber-600',
    high: 'bg-orange-50 text-orange-600',
    urgent: 'bg-red-50 text-red-600',
  };

  const statusStyles: Record<string, string> = {
    pending: 'bg-brand-cyan/10 text-brand-cyan',
    in_progress: 'bg-amber-50 text-amber-600',
    completed: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-[1100px] mx-auto flex items-center justify-center h-64">
          <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
        </div>
      </DashboardLayout>
    );
  }

  if (!workOrder) {
    return (
      <DashboardLayout>
        <div className="max-w-[1100px] mx-auto">
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="text-gray-300 mb-3"><i className="ri-tools-line text-4xl"></i></div>
            <p className="text-sm text-gray-500">Work order not found.</p>
            <button onClick={() => navigate('/work-orders')} className="mt-4 px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-medium cursor-pointer">Back to Work Orders</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const materialItems = workOrder.line_items.filter((li) => li.category === 'material');
  const laborItems = workOrder.line_items.filter((li) => li.category === 'labor');
  const canEdit = user && (user.role === 'admin' || user.role === 'manager');

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4 overflow-x-auto">
          <button onClick={() => navigate('/work-orders')} className="text-xs sm:text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1"></i>Work Orders</button>
          <span className="text-gray-300">/</span>
          <span className="text-xs sm:text-sm text-gray-900 font-medium truncate">{workOrder.title}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{workOrder.title}</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{workOrder.customer_name}<span className="mx-2 text-gray-300">|</span>{new Date(workOrder.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${priorityStyles[workOrder.priority] || 'bg-gray-50 text-gray-500'}`}>{workOrder.priority}</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[workOrder.status] || 'bg-gray-50 text-gray-500'}`}>{workOrder.status.replace('_', ' ')}</span>
              </div>
            </div>

            {workOrder.description && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{workOrder.description}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Assigned</p>
                {canEdit ? (
                  <select
                    value={workOrder.assigned_to || ''}
                    onChange={(e) => handleAssign(e.target.value || null)}
                    className="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {techs.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm font-medium text-gray-900">{workOrder.assigned_name || 'Unassigned'}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Scheduled</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString() : 'Not scheduled'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Completed</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{workOrder.completed_date ? new Date(workOrder.completed_date).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Cost</p>
                <p className="mt-1 text-sm font-bold text-brand-navy">${workOrder.total_cost.toLocaleString()}</p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {workOrder.status === 'pending' && (
                  <button onClick={() => handleStatusChange('in_progress')} className="px-4 py-2 rounded-lg bg-brand-cyan text-white text-sm font-medium hover:bg-brand-cyan/90 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-play-line mr-1"></i>Start Work</button>
                )}
                {workOrder.status === 'in_progress' && (
                  <button onClick={() => handleStatusChange('completed')} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-check-line mr-1"></i>Mark Complete</button>
                )}
                {workOrder.status !== 'cancelled' && (
                  <button onClick={() => handleStatusChange('cancelled')} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-close-line mr-1"></i>Cancel</button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line"></i></span></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-4">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-check-line"></i></span>
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer"><span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line"></i></span></button>
          </div>
        )}

        {/* Cost Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Materials</p>
            <p className="text-lg font-bold text-gray-900 mt-1">${workOrder.materials_cost.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{materialItems.length} items</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Labor</p>
            <p className="text-lg font-bold text-gray-900 mt-1">${workOrder.labor_cost.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{workOrder.labor_hours ?? 0} hrs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Line Items</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{workOrder.line_items.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">material + labor</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-brand-gold mt-1">${workOrder.total_cost.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">incl. all costs</p>
          </div>
        </div>

        {/* Time & Materials */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><i className="ri-hammer-line text-brand-gold"></i>Time & Materials</h3>
            {canEdit && (
              <div className="flex gap-2">
                <button onClick={() => setShowPriceBook(true)} className="px-3 py-2 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1"></i>Add from Price Book</button>
                <button onClick={() => setShowAddCustom(true)} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1"></i>Custom</button>
              </div>
            )}
          </div>

          {workOrder.line_items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-200 mb-2"><i className="ri-hammer-line text-3xl"></i></div>
              <p className="text-sm text-gray-400">No line items yet. Add from the price book or create a custom entry.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Materials Section */}
              {materialItems.length > 0 && (
                <div>
                  <div className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><i className="ri-box-3-line text-gray-400"></i>Materials</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {materialItems.map((li) => (
                      <div key={li.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{li.description}</p>
                          <p className="text-xs text-gray-400">${li.unit_cost.toFixed(2)} / {li.category === 'material' ? 'ea' : 'hr'}</p>
                        </div>
                        {canEdit ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateLineItem(li.id, { quantity: Math.max(0, li.quantity - 1) })} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"><i className="ri-subtract-line text-xs"></i></button>
                            <span className="w-10 text-center text-sm font-medium text-gray-900">{li.quantity}</span>
                            <button onClick={() => updateLineItem(li.id, { quantity: li.quantity + 1 })} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"><i className="ri-add-line text-xs"></i></button>
                            <span className="w-20 text-right text-sm font-semibold text-gray-900">${li.total.toFixed(2)}</span>
                            <button onClick={() => removeLineItem(li.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"><i className="ri-delete-bin-line text-xs"></i></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">Qty: {li.quantity}</span>
                            <span className="text-sm font-semibold text-gray-900">${li.total.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labor Section */}
              {laborItems.length > 0 && (
                <div>
                  <div className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><i className="ri-time-line text-gray-400"></i>Labor</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {laborItems.map((li) => (
                      <div key={li.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{li.description}</p>
                          <p className="text-xs text-gray-400">${li.unit_cost.toFixed(2)} / hr</p>
                        </div>
                        {canEdit ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateLineItem(li.id, { quantity: Math.max(0, li.quantity - 0.5) })} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"><i className="ri-subtract-line text-xs"></i></button>
                            <span className="w-10 text-center text-sm font-medium text-gray-900">{li.quantity}</span>
                            <button onClick={() => updateLineItem(li.id, { quantity: li.quantity + 0.5 })} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"><i className="ri-add-line text-xs"></i></button>
                            <span className="w-20 text-right text-sm font-semibold text-gray-900">${li.total.toFixed(2)}</span>
                            <button onClick={() => removeLineItem(li.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"><i className="ri-delete-bin-line text-xs"></i></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{li.quantity} hrs</span>
                            <span className="text-sm font-semibold text-gray-900">${li.total.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Totals row */}
          {workOrder.line_items.length > 0 && (
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
              <span className="text-base font-bold text-brand-navy">${workOrder.total_cost.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 mb-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Notes</h3>
          {canEdit ? (
            <textarea
              value={workOrder.notes || ''}
              onChange={(e) => setWorkOrder({ ...workOrder, notes: e.target.value })}
              placeholder="Add work order notes, technician observations, or customer communication..."
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold resize-none"
            />
          ) : (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 min-h-[80px]">{workOrder.notes || 'No notes.'}</p>
          )}
        </div>

        {/* Save */}
        {canEdit && (
          <div className="flex gap-3 pb-8">
            <button onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
              {saving ? (<span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Saving...</span>) : (<span className="flex items-center gap-2"><i className="ri-save-line"></i>Save Changes</span>)}
            </button>
            <button onClick={() => navigate('/work-orders')} className="px-6 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
          </div>
        )}
      </div>

      {/* Price Book Modal */}
      {showPriceBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-bold text-gray-900">Price Book</h3>
              <button onClick={() => { setShowPriceBook(false); setPriceSearch(''); }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"><i className="ri-close-line"></i></button>
            </div>
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  value={priceSearch}
                  onChange={(e) => setPriceSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {(['all', 'material', 'labor'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPriceCategory(cat)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${priceCategory === cat ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {cat === 'all' ? 'All' : cat === 'material' ? 'Materials' : 'Labor'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              <div className="divide-y divide-gray-50">
                {filteredPriceBook.map((item) => (
                  <button key={item.id} onClick={() => addPriceBookItem(item)} className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${item.category === 'material' ? 'bg-brand-cyan/10 text-brand-cyan' : 'bg-brand-gold/15 text-brand-gold'}`}>
                      <i className={item.category === 'material' ? 'ri-box-3-line' : 'ri-time-line'}></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400 truncate">{item.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">${item.unit_cost.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{item.unit}</p>
                    </div>
                    <span className="w-7 h-7 flex items-center justify-center text-brand-navy flex-shrink-0"><i className="ri-add-circle-line text-lg"></i></span>
                  </button>
                ))}
                {filteredPriceBook.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-gray-400">No items match your search.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Item Modal */}
      {showAddCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Add Custom Item</h3>
              <button onClick={() => setShowAddCustom(false)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"><i className="ri-close-line"></i></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <input
                  value={customItem.description}
                  onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })}
                  placeholder="e.g., Misc. fittings, travel time..."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
                  <select
                    value={customItem.category}
                    onChange={(e) => setCustomItem({ ...customItem, category: e.target.value as 'material' | 'labor' })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="material">Material</option>
                    <option value="labor">Labor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customItem.unit_cost}
                    onChange={(e) => setCustomItem({ ...customItem, unit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step={customItem.category === 'labor' ? '0.5' : '1'}
                  value={customItem.quantity}
                  onChange={(e) => setCustomItem({ ...customItem, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setShowAddCustom(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
                <button onClick={addCustomItem} disabled={!customItem.description.trim()} className="ml-auto px-5 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors cursor-pointer disabled:opacity-50">Add Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}