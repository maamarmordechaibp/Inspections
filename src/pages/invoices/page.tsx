import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import type { InvoiceItem } from '@/mocks/invoices';
import { mockInvoices, statusStyles } from '@/mocks/invoices';

const statusFilters = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Payment link modal
  const [paymentLinkModal, setPaymentLinkModal] = useState<{ invoiceId: string; customerId: string; customerName: string; customerEmail: string; invoiceNumber: string; total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, customer_id, title, description, line_items, subtotal, tax_rate, tax_amount, total,
          status, sent_at, paid_at, due_date, created_at,
          customers:customer_id (name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: InvoiceItem[] = (data || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
        customer_name: inv.customers?.name || 'Unknown',
        customer_email: inv.customers?.email || '',
        title: inv.title,
        description: inv.description,
        line_items: inv.line_items || [],
        subtotal: inv.subtotal,
        tax_rate: inv.tax_rate,
        tax_amount: inv.tax_amount,
        total: inv.total,
        status: inv.status,
        sent_at: inv.sent_at,
        paid_at: inv.paid_at,
        due_date: inv.due_date,
        created_at: inv.created_at,
      }));

      setInvoices(mapped);
    } catch {
      setInvoices(mockInvoices);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.title.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || inv.status === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: invoices.length };
    statusFilters.slice(1).forEach((s) => {
      c[s] = invoices.filter((inv) => inv.status === s.toLowerCase()).length;
    });
    return c;
  }, [invoices]);

  const stats = useMemo(() => {
    return {
      total: invoices.length,
      paid: invoices.filter((inv) => inv.status === 'paid').length,
      outstanding: invoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue').length,
      revenue: invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
      outstandingAmount: invoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0),
    };
  }, [invoices]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'sent' && !invoices.find((inv) => inv.id === id)?.sent_at) {
        updates.sent_at = new Date().toISOString();
      }
      if (newStatus === 'paid') {
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase.from('invoices').update(updates).eq('id', id);
      if (error) throw error;
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus as any, sent_at: updates.sent_at || inv.sent_at, paid_at: updates.paid_at || inv.paid_at } : inv)));
    } catch {
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus as any } : inv)));
    }
  };

  const openPaymentLinkModal = (inv: InvoiceItem & { customer_email?: string }) => {
    setPaymentLinkModal({
      invoiceId: inv.id,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      customerEmail: (inv as any).customer_email || '',
      invoiceNumber: inv.invoice_number,
      total: inv.total,
    });
    setCopied(false);
    setEmailSent(false);
    setEmailError('');
  };

  const getPaymentLink = () => {
    if (!paymentLinkModal) return '';
    return `${window.location.origin}${__BASE_PATH__}/payments?invoice=${paymentLinkModal.invoiceId}&customer=${paymentLinkModal.customerId}`;
  };

  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(getPaymentLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = getPaymentLink();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const sendPaymentLinkEmail = async () => {
    if (!paymentLinkModal) return;
    setEmailSending(true);
    setEmailError('');
    try {
      const { error } = await supabase.functions.invoke('send-payment-link', {
        body: {
          invoice_id: paymentLinkModal.invoiceId,
          customer_id: paymentLinkModal.customerId,
          customer_email: paymentLinkModal.customerEmail,
          customer_name: paymentLinkModal.customerName,
          invoice_number: paymentLinkModal.invoiceNumber,
          total: paymentLinkModal.total,
          payment_url: getPaymentLink(),
        },
      });
      if (error) throw error;
      setEmailSent(true);
    } catch (err: any) {
      setEmailError(err?.message || 'Failed to send email. Please copy the link and send it manually.');
    } finally {
      setEmailSending(false);
    }
  };

  const isOverdue = (inv: InvoiceItem) => {
    if (inv.status === 'paid' || inv.status === 'cancelled' || !inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Paid</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Outstanding</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.outstanding}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Collected</p>
            <p className="text-2xl font-bold text-brand-gold mt-1">${stats.revenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Outstanding $</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">${stats.outstandingAmount.toLocaleString()}</p>
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
                  placeholder="Search by invoice #, title, or customer..."
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
              <table className="w-full text-left min-w-[950px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm font-mono text-brand-navy font-medium">{inv.invoice_number}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-600">{new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <Link to={`/customers/${inv.customer_id}`} className="text-xs md:text-sm text-gray-900 hover:text-brand-navy hover:underline transition-colors">{inv.customer_name}</Link>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3 max-w-xs">
                        <p className="text-xs md:text-sm text-gray-900 font-medium truncate" title={inv.title}>{inv.title}</p>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className="text-xs md:text-sm text-gray-900 font-medium">${inv.total.toLocaleString()}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusStyles[inv.status] || 'bg-gray-50 text-gray-500'}`}>
                          {inv.status}
                          {isOverdue(inv) && ' (overdue)'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <span className={`text-xs md:text-sm ${isOverdue(inv) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 md:py-3">
                        <div className="flex items-center gap-1">
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <>
                              <button
                                onClick={() => openPaymentLinkModal(inv)}
                                className="text-brand-cyan hover:bg-brand-cyan/10 rounded-md transition-colors cursor-pointer"
                                title="Send Payment Link"
                              >
                                <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-mail-send-line text-sm"></i></span>
                              </button>
                              <Link
                                to={`/payments?invoice=${inv.id}&customer=${inv.customer_id}`}
                                className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-gold text-white text-[10px] md:text-xs font-medium hover:bg-brand-gold/90 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Pay Now
                              </Link>
                            </>
                          )}
                          {user && (user.role === 'admin' || user.role === 'manager') && (
                            <>
                              {inv.status === 'draft' && (
                                <button
                                  onClick={() => handleStatusChange(inv.id, 'sent')}
                                  className="text-brand-cyan hover:bg-brand-cyan/10 rounded-md transition-colors cursor-pointer"
                                  title="Send Invoice"
                                >
                                  <span className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"><i className="ri-send-plane-line text-sm"></i></span>
                                </button>
                              )}
                              {(inv.status === 'sent' || inv.status === 'overdue') && (
                                <button
                                  onClick={() => handleStatusChange(inv.id, 'paid')}
                                  className="text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                  title="Mark Paid"
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
                        <p className="text-sm text-gray-500">No invoices match your filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Link Modal */}
        {paymentLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setPaymentLinkModal(null)}></div>
            <div className="relative bg-white rounded-2xl border border-gray-100 w-full max-w-md p-6 shadow-sm">
              <button
                onClick={() => setPaymentLinkModal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
              </button>

              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-10 rounded-full bg-brand-cyan/10 flex items-center justify-center">
                  <i className="ri-link-m text-lg text-brand-cyan w-5 h-5 flex items-center justify-center"></i>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Send Payment Link</h3>
                  <p className="text-xs text-gray-500">{paymentLinkModal.invoiceNumber} — ${paymentLinkModal.total.toLocaleString()}</p>
                </div>
              </div>

              {/* Recipient info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Recipient</p>
                <p className="text-sm font-medium text-gray-900">{paymentLinkModal.customerName}</p>
                {paymentLinkModal.customerEmail && (
                  <p className="text-xs text-gray-500 mt-0.5">{paymentLinkModal.customerEmail}</p>
                )}
              </div>

              {/* Payment URL */}
              <div className="mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Payment Link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPaymentLink()}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 font-mono truncate"
                  />
                  <button
                    onClick={copyPaymentLink}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                      copied
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-brand-gold text-white hover:bg-brand-gold/90'
                    }`}
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'}></i>
                    </span>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Email section */}
              <div className="border-t border-gray-100 pt-4">
                {emailSent ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-check-double-line"></i></span>
                    <span>Payment link emailed to {paymentLinkModal.customerEmail || 'customer'}!</span>
                  </div>
                ) : emailError ? (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 mb-2">
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
                      <span>{emailError}</span>
                    </div>
                    <button
                      onClick={sendPaymentLinkEmail}
                      disabled={emailSending}
                      className="w-full py-2.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={sendPaymentLinkEmail}
                    disabled={emailSending}
                    className="w-full py-2.5 rounded-lg bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {emailSending ? (
                      <>
                        <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                        Sending email...
                      </>
                    ) : (
                      <>
                        <i className="ri-mail-send-line w-5 h-5 flex items-center justify-center"></i>
                        Email Payment Link to Customer
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                The customer will receive a secure link to view and pay this invoice online.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}