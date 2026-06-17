import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/base/Logo';

interface PortalCustomer {
  id: string;
  name: string;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
}

interface PortalInspection {
  id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  inspection_type: string;
  rating: string | null;
  asset_name: string;
  asset_type: string;
  findings: string | null;
}

interface PortalInvoice {
  id: string;
  invoice_number: string;
  title: string;
  total: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
}

interface PortalPayment {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  invoice_id: string | null;
  invoice_number?: string | null;
  invoice_title?: string | null;
  stripe_payment_intent_id: string | null;
}

type PortalTab = 'dashboard' | 'inspections' | 'invoices' | 'payments' | 'request';

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');
  const [inspections, setInspections] = useState<PortalInspection[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [requestForm, setRequestForm] = useState({ title: '', description: '', request_type: 'inspection', priority: 'medium', preferred_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadCustomerData = useCallback(async (customerId: string) => {
    try {
      const { data: cust } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
      if (cust) setCustomer(cust as PortalCustomer);

      const { data: inspData } = await supabase
        .from('inspections')
        .select('id, scheduled_date, completed_date, status, inspection_type, rating, findings, assets:asset_id (name, type)')
        .eq('customer_id', customerId)
        .order('scheduled_date', { ascending: false });
      if (inspData) {
        setInspections(inspData.map((i: any) => ({
          id: i.id,
          scheduled_date: i.scheduled_date,
          completed_date: i.completed_date,
          status: i.status,
          inspection_type: i.inspection_type,
          rating: i.rating,
          asset_name: i.assets?.name || 'Unknown',
          asset_type: i.assets?.type || '',
          findings: i.findings,
        })));
      }

      const { data: invData } = await supabase
        .from('invoices')
        .select('id, invoice_number, title, total, status, due_date, paid_at, line_items')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (invData) {
        setInvoices(invData.map((i: any) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          title: i.title,
          total: i.total,
          status: i.status,
          due_date: i.due_date,
          paid_at: i.paid_at,
          line_items: i.line_items || [],
        })));
      }

      const { data: payData } = await supabase
        .from('payments')
        .select('id, amount, status, description, created_at, invoice_id, stripe_payment_intent_id, invoices:invoice_id (invoice_number, title)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (payData) {
        setPayments(payData.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          description: p.description,
          created_at: p.created_at,
          invoice_id: p.invoice_id,
          invoice_number: p.invoices?.invoice_number || null,
          invoice_title: p.invoices?.title || null,
          stripe_payment_intent_id: p.stripe_payment_intent_id,
        })));
      }
    } catch {
      // silent fail
    }
  }, []);

  // Try to restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('portal_customer_id');
    if (saved) loadCustomerData(saved);
  }, [loadCustomerData]);

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase.from('customers').select('id, name, company, address, city, state, zip, phone, email, contact_name').ilike('email', email.trim()).maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!data) { setError('No customer account found with that email. Please contact your fire protection provider.'); setLoading(false); return; }
      setCustomer(data as PortalCustomer);
      localStorage.setItem('portal_customer_id', data.id);
      loadCustomerData(data.id);
    } catch {
      setError('Unable to access portal. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCustomer(null);
    setInspections([]);
    setInvoices([]);
    setPayments([]);
    localStorage.removeItem('portal_customer_id');
  };

  const handleRequestSubmit = async () => {
    if (!customer || !requestForm.title.trim()) return;
    setSubmitting(true);
    setSubmitSuccess('');
    try {
      const { error: reqErr } = await supabase.from('service_requests').insert({
        customer_id: customer.id,
        title: requestForm.title,
        description: requestForm.description || null,
        request_type: requestForm.request_type,
        priority: requestForm.priority,
        preferred_date: requestForm.preferred_date || null,
      });
      if (reqErr) throw reqErr;
      setSubmitSuccess('Service request submitted successfully! We will contact you shortly.');
      setRequestForm({ title: '', description: '', request_type: 'inspection', priority: 'medium', preferred_date: '' });
    } catch {
      setSubmitSuccess('');
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (inv: PortalInvoice) => {
    if (inv.status === 'paid' || inv.status === 'cancelled' || !inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  };

  const stats = useMemo(() => {
    const completed = inspections.filter((i) => i.status === 'completed').length;
    const upcoming = inspections.filter((i) => i.status === 'scheduled' || i.status === 'in_progress').length;
    const totalInvoices = invoices.length;
    const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').length;
    const totalDue = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const totalPaid = payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0);
    return { completed, upcoming, totalInvoices, outstanding, totalDue, totalPaid };
  }, [inspections, invoices, payments]);

  // ─── LOGIN SCREEN ───
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <Logo variant="full" className="h-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
            <p className="text-sm text-gray-500 mt-1">View your inspection reports, invoices, and request service.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="your@company.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Accessing Portal...
                  </span>
                ) : (
                  'Access My Portal'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">Enter the email address on file with your fire protection provider.</p>
          </div>
          <div className="text-center mt-6">
            <button onClick={() => navigate('/login')} className="text-sm text-brand-navy hover:underline cursor-pointer">Technician / Staff Login</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PORTAL DASHBOARD ───
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="icon" className="h-7" />
            <span className="text-sm font-bold text-gray-900 hidden sm:inline">Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{customer.name}</p>
              <p className="text-xs text-gray-400">{customer.company || customer.email || ''}</p>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Welcome back, {customer.contact_name || customer.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customer.address}{customer.city ? `, ${customer.city}` : ''}{customer.state ? ` ${customer.state}` : ''}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
            { key: 'inspections', label: 'Inspections', icon: 'ri-clipboard-line' },
            { key: 'invoices', label: 'Invoices', icon: 'ri-bill-line' },
            { key: 'payments', label: 'Payments', icon: 'ri-bank-card-line' },
            { key: 'request', label: 'Request Service', icon: 'ri-customer-service-line' },
          ] as { key: PortalTab; label: string; icon: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.key ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={t.icon}></i>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Completed Inspections</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Upcoming</p>
                <p className="text-2xl font-bold text-brand-cyan mt-1">{stats.upcoming}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalInvoices}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Outstanding</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.outstanding}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Amount Due</p>
                <p className="text-2xl font-bold text-brand-gold mt-1">${stats.totalDue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">${stats.totalPaid.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recent Inspections */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Recent Inspections</h3>
                  <button onClick={() => setActiveTab('inspections')} className="text-xs text-brand-navy hover:underline cursor-pointer">View All</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {inspections.slice(0, 5).map((i) => (
                    <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{i.asset_name} — {i.inspection_type}</p>
                        <p className="text-xs text-gray-400">{i.status === 'completed' && i.completed_date ? new Date(i.completed_date).toLocaleDateString() : i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : 'No date'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        i.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        i.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                        'bg-brand-cyan/10 text-brand-cyan'
                      }`}>
                        {i.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {inspections.length === 0 && (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-gray-400">No inspections on record.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Recent Payments</h3>
                  <button onClick={() => setActiveTab('payments')} className="text-xs text-brand-navy hover:underline cursor-pointer">View All</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {payments.slice(0, 5).map((p) => (
                    <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {p.invoice_number ? `${p.invoice_number} — ${p.invoice_title || 'Invoice'}` : (p.description || 'Payment')}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">${p.amount.toLocaleString()}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          p.status === 'succeeded' ? 'bg-emerald-50 text-emerald-600' :
                          p.status === 'failed' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-gray-400">No payments on record yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── INSPECTIONS TAB ── */}
        {activeTab === 'inspections' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Inspection History</h2>
              <p className="text-sm text-gray-500 mt-0.5">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''}</p>
            </div>
            {inspections.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-200 mb-2"><i className="ri-clipboard-line text-3xl"></i></div>
                <p className="text-sm text-gray-400">No inspections on record yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Asset</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-24">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map((i) => (
                      <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">
                            {i.completed_date ? new Date(i.completed_date).toLocaleDateString() : i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 font-medium">{i.asset_name}</p>
                          <p className="text-xs text-gray-400">{i.asset_type}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{i.inspection_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            i.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            i.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                            'bg-brand-cyan/10 text-brand-cyan'
                          }`}>
                            {i.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            i.rating === 'pass' ? 'bg-emerald-50 text-emerald-600' :
                            i.rating === 'fail' ? 'bg-red-50 text-red-600' :
                            i.rating === 'needs_attention' ? 'bg-amber-50 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {i.rating || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {i.status === 'completed' && i.findings && (
                            <button
                              onClick={() => {
                                const blob = new Blob([i.findings || ''], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Inspection_Report_${i.asset_name.replace(/\s+/g, '_')}_${i.id.slice(0, 8)}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="text-xs text-brand-navy hover:underline cursor-pointer whitespace-nowrap"
                            >
                              Download
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── INVOICES TAB ── */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold text-brand-navy">{inv.invoice_number}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                        inv.status === 'overdue' || isOverdue(inv) ? 'bg-red-50 text-red-600' :
                        'bg-brand-cyan/10 text-brand-cyan'
                      }`}>
                        {inv.status}{isOverdue(inv) && ' (overdue)'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{inv.title}</p>
                    <p className="text-xs text-gray-400">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-gray-900">${inv.total.toLocaleString()}</p>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <Link
                        to={`/payments?invoice=${inv.id}&customer=${customer.id}`}
                        className="mt-1 px-4 py-2 rounded-lg bg-brand-gold text-white text-xs font-semibold hover:bg-brand-gold/90 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center"
                      >
                        Pay Now
                      </Link>
                    )}
                  </div>
                </div>
                {inv.line_items && inv.line_items.length > 0 && (
                  <div className="border-t border-gray-50 px-5 py-3">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="py-1.5 text-[10px] font-semibold text-gray-400 uppercase">Description</th>
                          <th className="py-1.5 text-[10px] font-semibold text-gray-400 uppercase text-right">Qty</th>
                          <th className="py-1.5 text-[10px] font-semibold text-gray-400 uppercase text-right">Price</th>
                          <th className="py-1.5 text-[10px] font-semibold text-gray-400 uppercase text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.line_items.map((li, idx) => (
                          <tr key={idx} className="border-b border-gray-50 last:border-b-0">
                            <td className="py-1.5 text-xs text-gray-700">{li.description}</td>
                            <td className="py-1.5 text-xs text-gray-500 text-right">{li.quantity}</td>
                            <td className="py-1.5 text-xs text-gray-500 text-right">${li.unit_price.toFixed(2)}</td>
                            <td className="py-1.5 text-xs text-gray-900 text-right font-medium">${li.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <div className="text-gray-200 mb-2"><i className="ri-bill-line text-3xl"></i></div>
                <p className="text-sm text-gray-400">No invoices on record.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Payment History</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{payments.length} payment{payments.length !== 1 ? 's' : ''} on record</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-600">${stats.totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <div className="text-gray-200 mb-3"><i className="ri-bank-card-line text-4xl"></i></div>
                <p className="text-sm text-gray-400 mb-1">No payments on record yet.</p>
                <p className="text-xs text-gray-300">Payments will appear here after you complete a checkout.</p>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="mt-4 px-4 py-2 rounded-lg bg-brand-gold text-white text-xs font-semibold hover:bg-brand-gold/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  View Outstanding Invoices
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-24">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{new Date(p.created_at).toLocaleDateString()}</span>
                            <p className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-4 py-3">
                            {p.invoice_number ? (
                              <div>
                                <p className="text-sm font-mono font-medium text-brand-navy">{p.invoice_number}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[180px]" title={p.invoice_title || ''}>{p.invoice_title || 'Invoice'}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-700 truncate max-w-[200px]" title={p.description || ''}>{p.description || 'Payment'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900">${p.amount.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              p.status === 'succeeded' ? 'bg-emerald-50 text-emerald-600' :
                              p.status === 'failed' ? 'bg-red-50 text-red-600' :
                              p.status === 'refunded' ? 'bg-purple-50 text-purple-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.status === 'succeeded' && (
                              <button
                                onClick={() => {
                                  const receipt = [
                                    'DouseFire Payment Receipt',
                                    '--------------------------------',
                                    `Receipt ID: ${p.id}`,
                                    `Transaction ID: ${p.stripe_payment_intent_id || 'N/A'}`,
                                    `Date: ${new Date(p.created_at).toLocaleString()}`,
                                    `Amount: $${p.amount.toLocaleString()}`,
                                    `Description: ${p.description || 'Payment'}`,
                                    `Status: ${p.status}`,
                                    `Invoice: ${p.invoice_number || 'N/A'}`,
                                    '',
                                    'Thank you for your business!',
                                    'For questions, contact your fire protection provider.',
                                  ].join('\n');
                                  const blob = new Blob([receipt], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Receipt_${p.id.slice(0, 8)}.txt`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="text-xs text-brand-navy hover:underline cursor-pointer whitespace-nowrap"
                              >
                                Download
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REQUEST SERVICE TAB ── */}
        {activeTab === 'request' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">Request Service</h2>
              <p className="text-sm text-gray-500 mb-5">Submit a service request and we will respond within one business day.</p>

              {submitSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-4">
                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-check-line"></i></span>
                  {submitSuccess}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Request Type</label>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                    {(['inspection', 'repair', 'emergency', 'other'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setRequestForm({ ...requestForm, request_type: type })}
                        className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${
                          requestForm.request_type === type ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Title</label>
                  <input
                    value={requestForm.title}
                    onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                    placeholder="e.g., Annual sprinkler inspection"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Description</label>
                  <textarea
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    placeholder="Describe the service you need..."
                    rows={4}
                    maxLength={500}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-0.5 text-right">{requestForm.description.length}/500</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Priority</label>
                    <select
                      value={requestForm.priority}
                      onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold cursor-pointer"
                    >
                      <option value="low">Low — Within 2 weeks</option>
                      <option value="medium">Medium — Within 1 week</option>
                      <option value="high">High — Within 48 hours</option>
                      <option value="urgent">Urgent — Same day</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Preferred Date</label>
                    <input
                      type="date"
                      value={requestForm.preferred_date}
                      onChange={(e) => setRequestForm({ ...requestForm, preferred_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold"
                    />
                  </div>
                </div>
                <button
                  onClick={handleRequestSubmit}
                  disabled={submitting || !requestForm.title.trim()}
                  className="w-full px-4 py-3 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Service Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-8 py-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-gray-400">DouseFire Customer Portal — For questions, call {customer.phone || 'your fire protection provider'}</p>
        </div>
      </footer>
    </div>
  );
}