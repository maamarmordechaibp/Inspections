import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface Customer {
  id: string;
  name: string;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  sip_uri: string | null;
  email: string | null;
  contact_name: string | null;
  notes: string | null;
  created_at: string;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [openInspectionCounts, setOpenInspectionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [callingCustomerId, setCallingCustomerId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form state
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setCustomers(data);
      } else {
        // Fallback to mock data
        const { mockCustomers } = await import('@/mocks/customers');
        setCustomers(mockCustomers);
      }
    } catch {
      const { mockCustomers } = await import('@/mocks/customers');
      setCustomers(mockCustomers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchOpenInspectionCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCustomers]);

  const fetchOpenInspectionCounts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('inspections')
        .select('customer_id')
        .in('status', ['scheduled', 'in_progress', 'overdue']);
      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        data.forEach((i: any) => {
          if (i.customer_id) {
            counts[i.customer_id] = (counts[i.customer_id] || 0) + 1;
          }
        });
        setOpenInspectionCounts(counts);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const { containerRef, indicator, refreshing: pullRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchCustomers();
    },
    disabled: loading,
  });

  const resetForm = () => {
    setFormName('');
    setFormCompany('');
    setFormAddress('');
    setFormCity('');
    setFormState('');
    setFormZip('');
    setFormPhone('');
    setFormEmail('');
    setFormContactName('');
    setFormNotes('');
  };

  const bridgeCallCustomer = async (cust: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cust.phone && !cust.sip_uri) return;
    setCallingCustomerId(cust.id);
    try {
      // Fetch current user's phone/SIP from profiles
      let officePhone = '';
      let officeSipUri = '';
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('phone, sip_uri')
          .eq('id', user?.id)
          .maybeSingle();
        if (prof) {
          officePhone = prof.phone || '';
          officeSipUri = prof.sip_uri || '';
        }
      } catch { /* non-critical */ }

      const { data, error } = await supabase.functions.invoke('signalwire-call', {
        body: {
          action: 'bridge',
          inspectorId: user?.id,
          inspectorName: user?.fullName || 'Office',
          inspectorNumber: officePhone || undefined,
          inspectorSip: officeSipUri || undefined,
          customerId: cust.id,
          customerName: cust.name,
          customerNumber: cust.phone || undefined,
          customerSip: cust.sip_uri || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const method = data?.usingSip ? 'SIP' : 'phone';
        setSuccessMsg(`Call initiated via ${method}! Your phone will ring first, then connect you to ${cust.name}.`);
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg('Call failed: ' + (data?.error || 'Unknown error'));
      }
    } catch {
      // Fallback: native dialer
      if (cust.phone) {
        window.location.href = `tel:${cust.phone}`;
      } else {
        setErrorMsg('Call failed. No fallback for SIP-only customers.');
      }
    } finally {
      setCallingCustomerId(null);
    }
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormCompany(c.company || '');
    setFormAddress(c.address || '');
    setFormCity(c.city || '');
    setFormState(c.state || '');
    setFormZip(c.zip || '');
    setFormPhone(c.phone || '');
    setFormEmail(c.email || '');
    setFormContactName(c.contact_name || '');
    setFormNotes(c.notes || '');
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    setActionLoading(true);

    const payload = {
      name: formName.trim(),
      company: formCompany.trim() || null,
      address: formAddress.trim() || null,
      city: formCity.trim() || null,
      state: formState.trim() || null,
      zip: formZip.trim() || null,
      phone: formPhone.trim() || null,
      email: formEmail.trim() || null,
      contact_name: formContactName.trim() || null,
      notes: formNotes.trim() || null,
    };

    try {
      const { error } = await supabase.from('customers').insert(payload);
      if (error) throw error;
      setSuccessMsg('Customer created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create customer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formName.trim() || !editingCustomer) return;
    setActionLoading(true);

    const payload = {
      name: formName.trim(),
      company: formCompany.trim() || null,
      address: formAddress.trim() || null,
      city: formCity.trim() || null,
      state: formState.trim() || null,
      zip: formZip.trim() || null,
      phone: formPhone.trim() || null,
      email: formEmail.trim() || null,
      contact_name: formContactName.trim() || null,
      notes: formNotes.trim() || null,
    };

    try {
      const { error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id);
      if (error) throw error;
      setSuccessMsg('Customer updated successfully!');
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update customer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg('');
    setActionLoading(true);
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg('Customer deleted.');
      setDeleteConfirm(null);
      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete customer');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      (c.company && c.company.toLowerCase().includes(s)) ||
      (c.city && c.city.toLowerCase().includes(s)) ||
      (c.email && c.email.toLowerCase().includes(s))
    );
  });

  const CustomerForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => Promise<void>; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            placeholder="Building or business name"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input
            type="text"
            value={formCompany}
            onChange={(e) => setFormCompany(e.target.value)}
            placeholder="Property group / owner"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input
            type="text"
            value={formContactName}
            onChange={(e) => setFormContactName(e.target.value)}
            placeholder="Primary contact"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="contact@example.com"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            placeholder="Street address"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={formCity}
            onChange={(e) => setFormCity(e.target.value)}
            placeholder="City"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={formState}
              onChange={(e) => setFormState(e.target.value)}
              placeholder="State"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              type="text"
              value={formZip}
              onChange={(e) => setFormZip(e.target.value)}
              placeholder="ZIP code"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            rows={3}
            placeholder="Access instructions, contract details, special requirements..."
            maxLength={500}
            className="w-full px-3 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{formNotes.length}/500</p>
        </div>
      </div>

      {errorMsg && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={actionLoading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          {actionLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Manage building owners, property managers, and inspection sites</p>
          </div>
          {user && user.role !== 'technician' && (
          <button
            onClick={() => { resetForm(); setErrorMsg(''); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-brand-navy text-white rounded-lg text-xs md:text-sm font-medium hover:bg-brand-navy/90 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
              <i className="ri-building-2-line"></i>
            </span>
            Add Customer
          </button>
          )}
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line"></i>
            </span>
            {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-close-line"></i>
              </span>
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-line"></i>
            </span>
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-close-line"></i>
              </span>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
          <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-100">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">Total Customers</p>
            <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-1">{customers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-100">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">With Phone</p>
            <p className="text-lg md:text-2xl font-bold text-brand-gold mt-0.5 md:mt-1">{customers.filter((c) => c.phone).length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-100">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">With Email</p>
            <p className="text-lg md:text-2xl font-bold text-brand-cyan mt-0.5 md:mt-1">{customers.filter((c) => c.email).length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-100">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">Open Inspections</p>
            <p className="text-lg md:text-2xl font-bold text-amber-600 mt-0.5 md:mt-1">
              {Object.values(openInspectionCounts).reduce((sum, n) => sum + n, 0)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="text"
            placeholder="Search by name, company, city, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
          />
        </div>

        {/* Table */}
        <div ref={containerRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 360px)', WebkitOverflowScrolling: 'touch' }}>
          {indicator}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-brand-navy rounded-full animate-spin"></div>
                <span className="text-sm">Loading customers...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="w-12 h-12 flex items-center justify-center mb-3">
                <i className="ri-building-4-line text-3xl"></i>
              </span>
              <p className="text-sm">No customers found</p>
            </div>
          ) : (
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 md:px-5 py-3 text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-3 md:px-5 py-3 text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="text-left px-3 md:px-5 py-3 text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="text-left px-3 md:px-5 py-3 text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Phone / Email</th>
                    <th className="text-right px-3 md:px-5 py-3 text-[10px] md:text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                      <td className="px-3 md:px-5 py-3">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                            <i className="ri-building-2-line text-sm"></i>
                          </div>
                          <div className="min-w-0">
                            <Link to={`/customers/${c.id}`} onClick={(e) => e.stopPropagation()} className="text-xs md:text-sm font-medium text-gray-900 hover:text-brand-navy transition-colors whitespace-nowrap">{c.name}</Link>
                            {c.company && <p className="text-[10px] md:text-xs text-gray-400 truncate">{c.company}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-5 py-3">
                        <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
                          {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                        </span>
                      </td>
                      <td className="px-3 md:px-5 py-3">
                        <span className="text-xs md:text-sm text-gray-600">{c.contact_name || '—'}</span>
                      </td>
                      <td className="px-3 md:px-5 py-3">
                        <div className="space-y-0.5">
                          {c.phone && (
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center text-gray-400">
                                <i className="ri-phone-line text-[10px] md:text-xs"></i>
                              </span>
                              <span className="text-xs md:text-sm text-gray-600">{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center text-gray-400">
                                <i className="ri-mail-line text-[10px] md:text-xs"></i>
                              </span>
                              <span className="text-xs md:text-sm text-gray-600 truncate max-w-[140px] md:max-w-none">{c.email}</span>
                            </div>
                          )}
                          {!c.phone && !c.email && <span className="text-xs md:text-sm text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-3 md:px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 md:gap-1">
                          {c.phone && (
                            <button
                              onClick={(e) => bridgeCallCustomer(c, e)}
                              disabled={callingCustomerId === c.id}
                              className="inline-flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-md text-[10px] md:text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                              title="Call customer (your phone rings first)"
                            >
                              {callingCustomerId === c.id ? (
                                <span className="w-3 h-3 md:w-3 md:h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></span>
                              ) : (
                                <span className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                                  <i className="ri-phone-line"></i>
                                </span>
                              )}
                            </button>
                          )}
                          {user && user.role !== 'technician' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                                className="inline-flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-md text-[10px] md:text-xs font-medium text-gray-500 hover:text-brand-navy hover:bg-gray-100 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <span className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                                  <i className="ri-edit-line"></i>
                                </span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                                className="inline-flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-md text-[10px] md:text-xs font-medium text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <span className="w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                                  <i className="ri-delete-bin-line"></i>
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add New Customer</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-lg text-gray-400"></i>
              </button>
            </div>
            <CustomerForm onSubmit={handleCreate} submitLabel="Create Customer" />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit Customer</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-lg text-gray-400"></i>
              </button>
            </div>
            <CustomerForm onSubmit={handleEdit} submitLabel="Save Changes" />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Customer?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently remove this customer and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}