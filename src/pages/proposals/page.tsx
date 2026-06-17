import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import type { ProposalItem } from '@/mocks/proposals';
import { mockProposals, statusStyles } from '@/mocks/proposals';

const statusFilters = ['All', 'Draft', 'Sent', 'Approved', 'Rejected', 'Expired'];

interface ProposalTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  tax_rate: number;
}

const defaultTemplates: ProposalTemplate[] = [
  {
    id: 'tpl-fire-alarm',
    name: 'Fire Alarm Annual Inspection',
    title: 'Annual Fire Alarm System Inspection & Certification',
    description: 'Comprehensive NFPA 72 inspection of fire alarm system including control panel, detection devices, notification appliances, and monitoring station verification.',
    line_items: [
      { description: 'FACP Inspection & Testing', quantity: 1, unit_price: 450, total: 450 },
      { description: 'Smoke Detector Sensitivity Testing (per 25 units)', quantity: 1, unit_price: 375, total: 375 },
      { description: 'Notification Appliance Verification', quantity: 1, unit_price: 200, total: 200 },
      { description: 'Central Station Signal Test', quantity: 1, unit_price: 125, total: 125 },
      { description: 'NFPA 72 Compliance Report', quantity: 1, unit_price: 150, total: 150 },
    ],
    tax_rate: 0,
  },
  {
    id: 'tpl-sprinkler-repair',
    name: 'Sprinkler Deficiency Repair',
    title: 'Fire Sprinkler System Deficiency Repair',
    description: 'Repair of identified deficiencies during NFPA 25 inspection including head replacement, valve repair, and pipe leak fixes.',
    line_items: [
      { description: 'Sprinkler Head Replacement (ea)', quantity: 3, unit_price: 85, total: 255 },
      { description: 'Control Valve Repair / Rebuild', quantity: 1, unit_price: 420, total: 420 },
      { description: 'Pipe Leak Repair — Labor', quantity: 1, unit_price: 350, total: 350 },
      { description: 'System Hydrostatic Test', quantity: 1, unit_price: 275, total: 275 },
    ],
    tax_rate: 0,
  },
  {
    id: 'tpl-extinguisher',
    name: 'Extinguisher Service',
    title: 'Fire Extinguisher Maintenance & Hydrostatic Testing',
    description: 'Annual maintenance, 6-year internal examination, and 12-year hydrostatic testing per NFPA 10 requirements.',
    line_items: [
      { description: 'Annual Maintenance (per unit)', quantity: 10, unit_price: 25, total: 250 },
      { description: '6-Year Internal Exam (per unit)', quantity: 3, unit_price: 45, total: 135 },
      { description: '12-Year Hydrostatic Test (per unit)', quantity: 2, unit_price: 75, total: 150 },
      { description: 'Replacement Extinguisher (5 lb ABC)', quantity: 1, unit_price: 65, total: 65 },
    ],
    tax_rate: 0,
  },
  {
    id: 'tpl-kitchen-hood',
    name: 'Kitchen Hood Suppression',
    title: 'Kitchen Hood Fire Suppression System — Semi-Annual Service',
    description: 'NFPA 17A semi-annual inspection and maintenance of kitchen hood suppression system including nozzle cleaning, link replacement, and agent verification.',
    line_items: [
      { description: 'System Inspection & Nozzle Cleaning', quantity: 1, unit_price: 350, total: 350 },
      { description: 'Fusible Link Replacement (all)', quantity: 1, unit_price: 120, total: 120 },
      { description: 'Agent Cylinder Weight Verification', quantity: 1, unit_price: 75, total: 75 },
      { description: 'Gas Valve Interlock Test', quantity: 1, unit_price: 150, total: 150 },
      { description: 'NFPA 17A Compliance Certificate', quantity: 1, unit_price: 100, total: 100 },
    ],
    tax_rate: 0,
  },
];

export default function ProposalsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);
  const [showNewFromTemplate, setShowNewFromTemplate] = useState(false);
  const [newProposal, setNewProposal] = useState({
    customer_id: '',
    title: '',
    description: '',
    line_items: [] as { description: string; quantity: number; unit_price: number; total: number }[],
    tax_rate: 0,
  });
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id, customer_id, title, description, line_items, subtotal, tax_rate, tax_amount, total,
          status, sent_at, approved_at, valid_until, deficiency_ids, created_at,
          customers:customer_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ProposalItem[] = (data || []).map((p: any) => ({
        id: p.id,
        customer_id: p.customer_id,
        customer_name: p.customers?.name || 'Unknown',
        title: p.title,
        description: p.description,
        deficiency_ids: p.deficiency_ids || [],
        line_items: p.line_items || [],
        subtotal: p.subtotal,
        tax_rate: p.tax_rate,
        tax_amount: p.tax_amount,
        total: p.total,
        status: p.status,
        sent_at: p.sent_at,
        approved_at: p.approved_at,
        valid_until: p.valid_until,
        created_at: p.created_at,
      }));

      setProposals(mapped);
    } catch {
      setProposals(mockProposals);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().then(() => setLoading(false));
    // Load templates from localStorage
    const saved = localStorage.getItem('proposal_templates');
    if (saved) {
      try { setTemplates(JSON.parse(saved)); } catch { setTemplates(defaultTemplates); }
    } else {
      setTemplates(defaultTemplates);
    }
  }, [fetchData]);

  const saveTemplates = (newTemplates: ProposalTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('proposal_templates', JSON.stringify(newTemplates));
  };

  const handleApplyTemplate = (template: ProposalTemplate) => {
    setSelectedTemplate(template);
    setNewProposal({
      customer_id: '',
      title: template.title,
      description: template.description,
      line_items: template.line_items.map((li) => ({ ...li })),
      tax_rate: template.tax_rate,
    });
    setShowNewFromTemplate(true);
  };

  const handleCreateFromTemplate = async () => {
    if (!newProposal.customer_id || !newProposal.title.trim()) return;

    const subtotal = newProposal.line_items.reduce((s, li) => s + li.total, 0);
    const taxAmount = Math.round(subtotal * newProposal.tax_rate * 100) / 100;
    const total = subtotal + taxAmount;

    try {
      const { data, error } = await supabase.from('proposals').insert({
        customer_id: newProposal.customer_id,
        title: newProposal.title,
        description: newProposal.description,
        line_items: newProposal.line_items,
        subtotal,
        tax_rate: newProposal.tax_rate,
        tax_amount: taxAmount,
        total,
        status: 'draft',
      }).select().single();

      if (error) throw error;

      const customerName = customers.find((c) => c.id === newProposal.customer_id)?.name || 'Unknown';
      setProposals((prev) => [{
        id: data.id,
        customer_id: newProposal.customer_id,
        customer_name: customerName,
        title: newProposal.title,
        description: newProposal.description,
        deficiency_ids: [],
        line_items: newProposal.line_items,
        subtotal,
        tax_rate: newProposal.tax_rate,
        tax_amount: taxAmount,
        total,
        status: 'draft',
        sent_at: null,
        approved_at: null,
        valid_until: null,
        created_at: new Date().toISOString(),
      }, ...prev]);

      setShowNewFromTemplate(false);
      setNewProposal({ customer_id: '', title: '', description: '', line_items: [], tax_rate: 0 });
      setSelectedTemplate(null);
    } catch {
      // Local-only fallback
      const newId = `prop-${Date.now()}`;
      const customerName = customers.find((c) => c.id === newProposal.customer_id)?.name || 'Unknown';
      setProposals((prev) => [{
        id: newId,
        customer_id: newProposal.customer_id,
        customer_name: customerName,
        title: newProposal.title,
        description: newProposal.description,
        deficiency_ids: [],
        line_items: newProposal.line_items,
        subtotal,
        tax_rate: newProposal.tax_rate,
        tax_amount: taxAmount,
        total,
        status: 'draft',
        sent_at: null,
        approved_at: null,
        valid_until: null,
        created_at: new Date().toISOString(),
      }, ...prev]);
      setShowNewFromTemplate(false);
      setNewProposal({ customer_id: '', title: '', description: '', line_items: [], tax_rate: 0 });
      setSelectedTemplate(null);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    saveTemplates(templates.filter((t) => t.id !== templateId));
  };

  const handleSaveAsTemplate = (proposal: ProposalItem) => {
    const newTemplate: ProposalTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: proposal.title.slice(0, 40),
      title: proposal.title,
      description: proposal.description || '',
      line_items: (proposal.line_items || []).map((li: any) => ({
        description: li.description || '',
        quantity: li.quantity || 1,
        unit_price: li.unit_price || 0,
        total: li.total || 0,
      })),
      tax_rate: proposal.tax_rate || 0,
    };
    saveTemplates([...templates, newTemplate]);
  };

  // Load customers for template form
  const loadCustomers = async () => {
    try {
      const { data } = await supabase.from('customers').select('id, name').order('name');
      if (data) setCustomers(data);
    } catch { /* no-op */ }
  };

  useEffect(() => {
    if (showNewFromTemplate) loadCustomers();
  }, [showNewFromTemplate]);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.customer_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || p.status === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [proposals, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: proposals.length };
    statusFilters.slice(1).forEach((s) => {
      c[s] = proposals.filter((p) => p.status === s.toLowerCase()).length;
    });
    return c;
  }, [proposals]);

  const stats = useMemo(() => {
    return {
      total: proposals.length,
      draft: proposals.filter((p) => p.status === 'draft').length,
      sent: proposals.filter((p) => p.status === 'sent').length,
      approved: proposals.filter((p) => p.status === 'approved').length,
      revenue: proposals.filter((p) => p.status === 'approved').reduce((sum, p) => sum + p.total, 0),
    };
  }, [proposals]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'sent' && !proposals.find((p) => p.id === id)?.sent_at) {
        updates.sent_at = new Date().toISOString();
      }
      if (newStatus === 'approved') {
        updates.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('proposals').update(updates).eq('id', id);
      if (error) throw error;
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus as any, sent_at: updates.sent_at || p.sent_at, approved_at: updates.approved_at || p.approved_at } : p)));
    } catch {
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus as any } : p)));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Proposals</h2>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} proposal{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplatesPanel(!showTemplatesPanel)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                showTemplatesPanel
                  ? 'bg-brand-gold/10 border-brand-gold text-brand-gold'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <i className="ri-stack-line mr-1"></i> Templates ({templates.length})
            </button>
          </div>
        </div>

        {/* Templates Panel */}
        {showTemplatesPanel && (
          <div className="bg-white rounded-xl border border-gray-100 mb-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Proposal Templates</h3>
                <p className="text-xs text-gray-400 mt-0.5">Start a new proposal from a saved template to save time</p>
              </div>
              <button
                onClick={() => setShowTemplatesPanel(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line"></i></span>
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-brand-gold/30 transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{tpl.name}</p>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all cursor-pointer flex-shrink-0"
                      title="Delete template"
                    >
                      <span className="w-5 h-5 flex items-center justify-center"><i className="ri-delete-bin-line text-xs"></i></span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tpl.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{tpl.line_items.length} line items</span>
                    <span className="text-xs font-semibold text-brand-navy">
                      ${tpl.line_items.reduce((s, li) => s + li.total, 0).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleApplyTemplate(tpl)}
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-brand-navy text-white text-xs font-medium hover:bg-brand-navy/90 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-file-add-line mr-1"></i> Create Proposal
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full py-8 text-center">
                  <div className="text-gray-200 mb-2"><i className="ri-stack-line text-3xl"></i></div>
                  <p className="text-sm text-gray-400">No templates saved yet. Save a proposal as a template to reuse it.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Proposal from Template Modal */}
        {showNewFromTemplate && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNewFromTemplate(false)}>
            <div className="bg-white rounded-xl border border-gray-100 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">New Proposal from Template</h3>
                <button onClick={() => setShowNewFromTemplate(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line"></i></span>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Customer</label>
                  <select
                    value={newProposal.customer_id}
                    onChange={(e) => setNewProposal({ ...newProposal, customer_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Title</label>
                  <input
                    value={newProposal.title}
                    onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Description</label>
                  <textarea
                    value={newProposal.description}
                    onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Line Items</label>
                  <div className="space-y-2">
                    {newProposal.line_items.map((li, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={li.description}
                          onChange={(e) => {
                            const updated = [...newProposal.line_items];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setNewProposal({ ...newProposal, line_items: updated });
                          }}
                          className="flex-1 px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:border-brand-gold"
                          placeholder="Description"
                        />
                        <input
                          type="number"
                          value={li.quantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 0;
                            const updated = [...newProposal.line_items];
                            updated[idx] = { ...updated[idx], quantity: qty, total: qty * updated[idx].unit_price };
                            setNewProposal({ ...newProposal, line_items: updated });
                          }}
                          className="w-16 px-2 py-1.5 rounded border border-gray-200 text-xs text-center focus:outline-none focus:border-brand-gold"
                          min="1"
                        />
                        <input
                          type="number"
                          value={li.unit_price}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0;
                            const updated = [...newProposal.line_items];
                            updated[idx] = { ...updated[idx], unit_price: price, total: updated[idx].quantity * price };
                            setNewProposal({ ...newProposal, line_items: updated });
                          }}
                          className="w-20 px-2 py-1.5 rounded border border-gray-200 text-xs text-right focus:outline-none focus:border-brand-gold"
                          step="0.01"
                          min="0"
                        />
                        <span className="text-xs text-gray-400 w-16 text-right">${li.total.toFixed(2)}</span>
                        <button
                          onClick={() => {
                            setNewProposal({ ...newProposal, line_items: newProposal.line_items.filter((_, i) => i !== idx) });
                          }}
                          className="text-gray-300 hover:text-red-500 cursor-pointer"
                        >
                          <span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xs"></i></span>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setNewProposal({
                          ...newProposal,
                          line_items: [...newProposal.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }],
                        });
                      }}
                      className="text-xs text-brand-navy hover:underline cursor-pointer"
                    >
                      + Add line item
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-sm">
                    <span className="text-gray-500">Total: </span>
                    <span className="font-bold text-gray-900">
                      ${newProposal.line_items.reduce((s, li) => s + li.total, 0).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={handleCreateFromTemplate}
                    disabled={!newProposal.customer_id || !newProposal.title.trim() || newProposal.line_items.length === 0}
                    className="px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    Create Proposal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Draft</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Won Revenue</p>
            <p className="text-2xl font-bold text-brand-gold mt-1">${stats.revenue.toLocaleString()}</p>
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
                  placeholder="Search by title or customer..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                />
              </div>
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
              <table className="w-full text-left min-w-[850px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Valid Until</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <Link to={`/customers/${p.customer_id}`} className="text-xs md:text-sm text-gray-900 hover:text-brand-navy hover:underline transition-colors">{p.customer_name}</Link>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 max-w-xs">
                        <p className="text-xs md:text-sm text-gray-900 font-medium truncate" title={p.title}>{p.title}</p>
                        {p.description && <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.description}</p>}
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-900 font-medium">${p.total.toLocaleString()}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusStyles[p.status] || 'bg-gray-50 text-gray-500'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{p.valid_until ? new Date(p.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <div className="flex items-center gap-1">
                          {user && (user.role === 'admin' || user.role === 'manager') && (
                            <>
                              {p.status === 'draft' && (
                                <button
                                  onClick={() => handleStatusChange(p.id, 'sent')}
                                  className="text-brand-cyan hover:bg-brand-cyan/10 rounded-md transition-colors cursor-pointer"
                                  title="Send Proposal"
                                >
                                  <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-send-plane-line text-sm"></i></span>
                                </button>
                              )}
                              {p.status === 'sent' && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(p.id, 'approved')}
                                    className="text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                    title="Mark Approved"
                                  >
                                    <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-check-line text-sm"></i></span>
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(p.id, 'rejected')}
                                    className="text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                    title="Mark Rejected"
                                  >
                                    <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-close-line text-sm"></i></span>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleSaveAsTemplate(p)}
                                className="text-gray-400 hover:text-brand-gold rounded-md transition-colors cursor-pointer"
                                title="Save as Template"
                              >
                                <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-bookmark-line text-sm"></i></span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="text-gray-300 mb-2"><i className="ri-search-line text-3xl"></i></div>
                        <p className="text-sm text-gray-500">No proposals match your filters.</p>
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