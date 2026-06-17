import { useState, useEffect, useCallback } from 'react';
import CustomerDocuments from '@/pages/customers/components/CustomerDocuments';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import QuickSchedule from '@/pages/customers/components/QuickSchedule';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

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

interface InspectionRecord {
  id: string;
  asset_name: string;
  inspection_type: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  rating: string | null;
  inspector_name: string;
}

interface AssetRecord {
  id: string;
  name: string;
  type: string;
  location: string;
  serial_number: string;
  status: string;
  last_inspected: string | null;
  next_due: string | null;
}

const statusStyles: Record<string, string> = {
  scheduled: 'bg-brand-cyan/10 text-brand-cyan',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-500',
};

const assetStatusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  maintenance: 'bg-amber-50 text-amber-600',
  retired: 'bg-gray-100 text-gray-500',
};

const ratingStyles: Record<string, string> = {
  pass: 'bg-emerald-50 text-emerald-600',
  fail: 'bg-red-50 text-red-500',
  needs_attention: 'bg-amber-50 text-amber-600',
};

const assetTypeIcons: Record<string, string> = {
  Extinguisher: 'ri-fire-line',
  Sprinkler: 'ri-contrast-drop-2-line',
  Alarm: 'ri-alert-line',
  Hydrant: 'ri-water-flash-line',
  Hose: 'ri-plug-line',
  'Backflow Preventer': 'ri-shut-down-line',
  'Fire Pump': 'ri-tools-line',
  'Kitchen Suppression': 'ri-knife-line',
  'Emergency Lighting': 'ri-lightbulb-flash-line',
  'Smoke Control': 'ri-windy-line',
  'Elevator Recall': 'ri-arrow-up-down-line',
  'Monitoring System': 'ri-radar-line',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingCustomer, setCallingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspections' | 'assets' | 'info' | 'documents'>('inspections');
  const [emailSending, setEmailSending] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (custErr) throw custErr;

      if (custData) {
        setCustomer(custData as Customer);
      } else {
        // Fallback mock
        const { mockCustomers } = await import('@/mocks/customers');
        const found = mockCustomers.find((c: any) => c.id === id);
        if (found) setCustomer(found as Customer);
      }

      // Fetch inspections for this customer
      const { data: inspData } = await supabase
        .from('inspections')
        .select('id, inspection_type, scheduled_date, completed_date, status, rating, asset_name:assets(name), inspector_name:profiles(full_name)')
        .eq('customer_id', id)
        .order('scheduled_date', { ascending: false });

      if (inspData && inspData.length > 0) {
        setInspections(inspData.map((i: any) => ({
          id: i.id,
          asset_name: i.asset_name?.name || 'Unknown',
          inspection_type: i.inspection_type,
          scheduled_date: i.scheduled_date,
          completed_date: i.completed_date,
          status: i.status,
          rating: i.rating,
          inspector_name: i.inspector_name?.full_name || 'Unassigned',
        })));
      } else {
        // Fallback mock
        const { mockInspections } = await import('@/mocks/inspections');
        setInspections(
          mockInspections.slice(0, 6).map((i: any) => ({
            id: i.id,
            asset_name: i.assetName,
            inspection_type: i.type,
            scheduled_date: i.scheduledDate,
            completed_date: i.completedDate,
            status: i.status,
            rating: i.rating,
            inspector_name: i.inspectorName,
          }))
        );
      }

      // Fetch assets for this customer
      const { data: assetData } = await supabase
        .from('assets')
        .select('*')
        .eq('customer_id', id)
        .order('type, name');

      if (assetData && assetData.length > 0) {
        setAssets(assetData as AssetRecord[]);
      } else {
        const { mockAssets } = await import('@/mocks/assets');
        setAssets(
          mockAssets
            .filter((a: any) => a.customerId === id)
            .map((a: any) => ({
              id: a.id, name: a.name, type: a.type, location: a.location,
              serial_number: a.serialNumber, status: a.status,
              last_inspected: a.lastInspected, next_due: a.nextDue,
            }))
        );
      }
    } catch {
      const { mockCustomers } = await import('@/mocks/customers');
      const { mockInspections } = await import('@/mocks/inspections');
      const { mockAssets: fallbackAssets } = await import('@/mocks/assets');
      const found = mockCustomers.find((c: any) => c.id === id);
      if (found) setCustomer(found as Customer);
      setInspections(
        mockInspections.slice(0, 6).map((i: any) => ({
          id: i.id,
          asset_name: i.assetName,
          inspection_type: i.type,
          scheduled_date: i.scheduledDate,
          completed_date: i.completedDate,
          status: i.status,
          rating: i.rating,
          inspector_name: i.inspectorName,
        }))
      );
      setAssets(
        fallbackAssets
          .filter((a: any) => a.customerId === id)
          .map((a: any) => ({
            id: a.id, name: a.name, type: a.type, location: a.location,
            serial_number: a.serialNumber, status: a.status,
            last_inspected: a.lastInspected, next_due: a.nextDue,
          }))
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const callCustomer = async () => {
    if (!customer?.phone && !customer?.sip_uri) return;
    setCallingCustomer(true);
    try {
      // Fetch current user's phone/SIP from profiles for bridge
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

      const dest = customer?.sip_uri || customer?.phone;
      if (!dest) {
        alert('No phone number or SIP URI on file for this customer.');
        setCallingCustomer(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('signalwire-call', {
        body: {
          action: 'bridge',
          inspectorId: user?.id,
          inspectorName: user?.fullName || 'Office',
          inspectorNumber: officePhone || undefined,
          inspectorSip: officeSipUri || undefined,
          customerId: customer?.id,
          customerName: customer?.name || 'Customer',
          customerNumber: customer?.phone || undefined,
          customerSip: customer?.sip_uri || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const method = data?.usingSip ? 'SIP' : 'phone';
        alert(`Call initiated via ${method}! Your phone will ring first, then connect you to ${customer?.name || 'the customer'}.`);
      } else {
        alert('Call failed: ' + (data?.error || 'Unknown error'));
      }
    } catch {
      // Fallback: try native dialer
      if (customer?.phone) {
        window.location.href = `tel:${customer.phone}`;
      } else {
        alert('Call failed. No fallback available for SIP-only customers.');
      }
    } finally {
      setCallingCustomer(false);
    }
  };

  const emailReportSummary = () => {
    if (!customer?.email) {
      alert('No customer email on file.');
      return;
    }
    setEmailSending(true);

    const completed = inspections.filter((i) => i.status === 'completed');
    const pending = inspections.filter((i) => i.status === 'scheduled' || i.status === 'overdue');
    const passed = completed.filter((i) => i.rating === 'pass').length;

    const subject = `DouseFire Inspection Summary — ${customer.name}`;
    const body = (
      `Dear ${customer.contact_name || 'Customer'},\n\n` +
      `Here is your fire safety inspection summary for ${customer.name}:\n\n` +
      `${'─'.repeat(40)}\n` +
      `Total Inspections: ${inspections.length}\n` +
      `Completed: ${completed.length} (${completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0}% pass rate)\n` +
      `Pending: ${pending.length}\n` +
      `${'─'.repeat(40)}\n\n` +
      `Recent Inspections:\n` +
      inspections.slice(0, 5).map((i) =>
        `• ${i.asset_name} — ${i.inspection_type} (${new Date(i.scheduled_date).toLocaleDateString()}) — ${i.status.replace('_', ' ')}${i.rating ? ' — ' + i.rating.replace('_', ' ') : ''}`
      ).join('\n') +
      `\n\n` +
      `Next scheduled inspection: ${pending.length > 0 ? new Date(pending[0].scheduled_date).toLocaleDateString() : 'None scheduled — contact us to book one.'}\n\n` +
      `Thank you for choosing DouseFire Inspection Services.\n` +
      `— The DouseFire Team`
    );

    supabase.functions.invoke('send-generic-email', {
      body: {
        to: customer.email,
        subject,
        headline: 'Inspection Summary',
        message: body,
      },
    }).then(({ error }) => {
      if (error) {
        throw error;
      }
      alert('Summary email sent successfully.');
    }).catch((err: any) => {
      alert(err?.message || 'Failed to send email.');
    }).finally(() => {
      setEmailSending(false);
    });
  };

  const openEdit = () => {
    if (!customer) return;
    setFormName(customer.name);
    setFormCompany(customer.company || '');
    setFormAddress(customer.address || '');
    setFormCity(customer.city || '');
    setFormState(customer.state || '');
    setFormZip(customer.zip || '');
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormContactName(customer.contact_name || '');
    setFormNotes(customer.notes || '');
    setEditError('');
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    if (!formName.trim() || !customer) return;
    setEditLoading(true);

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
      const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
      if (error) throw error;
      setShowEditModal(false);
      // Refresh data
      const { data: refreshed } = await supabase.from('customers').select('*').eq('id', customer.id).maybeSingle();
      if (refreshed) setCustomer(refreshed as Customer);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update customer');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto flex items-center justify-center h-64">
          <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto text-center py-20">
          <i className="ri-building-4-line text-4xl text-gray-300 mb-4 block"></i>
          <h2 className="text-lg font-semibold text-gray-900">Customer Not Found</h2>
          <p className="text-sm text-gray-500 mt-1">The customer you are looking for does not exist.</p>
          <button onClick={() => navigate('/customers')} className="mt-4 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap">
            Back to Customers
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const completedInspections = inspections.filter((i) => i.status === 'completed');
  const pendingInspections = inspections.filter((i) => i.status === 'scheduled' || i.status === 'overdue' || i.status === 'in_progress');
  const passedCount = completedInspections.filter((i) => i.rating === 'pass').length;
  const failedCount = completedInspections.filter((i) => i.rating === 'fail').length;
  const lastInspection = inspections.length > 0 ? inspections[0] : null;
  const nextInspection = pendingInspections.length > 0 ? pendingInspections[pendingInspections.length - 1] : null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/customers')} className="text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer">
            <i className="ri-arrow-left-line mr-1"></i> Customers
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">{customer.name}</span>
        </div>

        {/* Customer Header Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-brand-navy/5 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-navy text-xl font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
                {customer.company && (
                  <p className="text-sm text-gray-500 mt-0.5">{customer.company}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {customer.city && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-map-pin-line text-xs"></i>
                      </span>
                      {[customer.city, customer.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-phone-line text-xs"></i>
                      </span>
                      {customer.phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-mail-line text-xs"></i>
                      </span>
                      {customer.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user && user.role !== 'technician' && (
                <button
                  onClick={openEdit}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-edit-line"></i>
                  </span>
                  Edit Customer
                </button>
              )}
              {customer.phone && (
                <button
                  onClick={callCustomer}
                  disabled={callingCustomer}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {callingCustomer ? (
                    <>
                      <span className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></span>
                      Calling...
                    </>
                  ) : (
                    <>
                      <span className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-phone-line"></i>
                      </span>
                      Call Customer
                    </>
                  )}
                </button>
              )}
              {customer.email && (
                <button
                  onClick={emailReportSummary}
                  disabled={emailSending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-mail-send-line"></i>
                  </span>
                  Email Report
                </button>
              )}
              <Link
                to={`/customers/${customer.id}/schedule`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-add-line"></i>
                </span>
                Schedule Inspection
              </Link>
            </div>
          </div>

          {/* Portal Link */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Customer Portal</p>
                <p className="text-xs text-gray-500 mt-0.5">Share the portal link with {customer.name} to give them access to reports and invoices.</p>
              </div>
              <button
                onClick={() => {
                  const portalUrl = `${window.location.origin}/portal`;
                  navigator.clipboard.writeText(portalUrl).then(() => alert('Portal URL copied to clipboard!'));
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <i className="ri-links-line"></i>
                Copy Portal Link
              </button>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Site Notes</p>
              <p className="text-sm text-gray-600 leading-relaxed">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Inspections</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{inspections.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedInspections.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Pass Rate</p>
            <p className="text-2xl font-bold text-brand-gold mt-1">
              {completedInspections.length > 0 ? Math.round((passedCount / completedInspections.length) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingInspections.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Assets</p>
            <p className="text-2xl font-bold text-brand-navy mt-1">{assets.length}</p>
          </div>
        </div>

        {/* Quick Schedule Inline Panel */}
        <QuickSchedule customerId={customer.id} onScheduled={loadData} />

        {/* Quick Info: Last & Next Inspection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center text-emerald-500">
                <i className="ri-check-double-line"></i>
              </span>
              Last Inspection
            </h3>
            {lastInspection && lastInspection.status === 'completed' ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">{lastInspection.asset_name}</p>
                <p className="text-xs text-gray-500">{lastInspection.inspection_type}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {new Date(lastInspection.scheduled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  {lastInspection.rating && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${ratingStyles[lastInspection.rating] || 'bg-gray-50 text-gray-500'}`}>
                      {lastInspection.rating.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <Link
                  to={`/inspections/${lastInspection.id}`}
                  className="inline-flex items-center text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors"
                >
                  View details <i className="ri-arrow-right-s-line ml-1"></i>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No completed inspections yet.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center text-brand-cyan">
                <i className="ri-calendar-event-line"></i>
              </span>
              Next Inspection
            </h3>
            {nextInspection ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">{nextInspection.asset_name}</p>
                <p className="text-xs text-gray-500">{nextInspection.inspection_type}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {new Date(nextInspection.scheduled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[nextInspection.status] || 'bg-gray-50 text-gray-500'}`}>
                    {nextInspection.status.replace('_', ' ')}
                  </span>
                </div>
                <Link
                  to={`/inspections/${nextInspection.id}`}
                  className="inline-flex items-center text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors"
                >
                  View details <i className="ri-arrow-right-s-line ml-1"></i>
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-400 italic mb-3">No upcoming inspections scheduled.</p>
                <Link
                  to={`/customers/${customer.id}/schedule`}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-add-line"></i>
                  </span>
                  Schedule one now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('inspections')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inspections' ? 'bg-brand-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
              <i className="ri-clipboard-line text-xs"></i>
            </span>
            Inspection History
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'assets' ? 'bg-brand-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
              <i className="ri-tools-line text-xs"></i>
            </span>
            Assets Inventory
            <span className="ml-1.5 text-xs opacity-60">({assets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'info' ? 'bg-brand-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
              <i className="ri-information-line text-xs"></i>
            </span>
            Customer Info
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'documents' ? 'bg-brand-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
              <i className="ri-folder-line text-xs"></i>
            </span>
            Documents
          </button>
        </div>
        {activeTab === 'inspections' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {inspections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="w-12 h-12 flex items-center justify-center mb-3">
                  <i className="ri-clipboard-line text-3xl"></i>
                </span>
                <p className="text-sm">No inspections found for this customer</p>
                <Link to={`/customers/${customer.id}/schedule`} className="mt-3 text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors">
                  Create first inspection
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Inspector</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map((insp) => (
                      <tr key={insp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-gray-900">{insp.asset_name}</p>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-sm text-gray-500">{insp.inspection_type}</span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-sm text-gray-600">
                            {new Date(insp.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <span className="text-sm text-gray-600">{insp.inspector_name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[insp.status] || 'bg-gray-50 text-gray-500'}`}>
                            {insp.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {insp.rating ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ratingStyles[insp.rating] || 'bg-gray-50 text-gray-500'}`}>
                              {insp.rating.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/inspections/${insp.id}`}
                            className="inline-flex items-center text-gray-400 hover:text-brand-navy transition-colors"
                          >
                            <span className="w-8 h-8 flex items-center justify-center">
                              <i className="ri-arrow-right-s-line text-lg"></i>
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Assets Inventory Tab */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {Object.entries(
              assets.reduce((acc, asset) => {
                if (!acc[asset.type]) acc[asset.type] = [];
                acc[asset.type].push(asset);
                return acc;
              }, {} as Record<string, AssetRecord[]>)
            ).map(([type, typeAssets]) => {
              const icon = assetTypeIcons[type] || 'ri-settings-3-line';
              const isOverdue = (nextDue: string | null) => {
                if (!nextDue) return false;
                return new Date(nextDue) < new Date();
              };
              const isDueSoon = (nextDue: string | null) => {
                if (!nextDue) return false;
                const diff = new Date(nextDue).getTime() - Date.now();
                return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
              };
              return (
                <div key={type} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center text-brand-navy flex-shrink-0">
                      <i className={`${icon} text-lg`}></i>
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {type}
                        <span className="ml-2 text-xs font-normal text-gray-400">({typeAssets.length})</span>
                      </h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50 bg-gray-50/30">
                          <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Location</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Last Inspected</th>
                          <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Next Due</th>
                          <th className="text-right px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeAssets.map((asset) => {
                          const overdue = isOverdue(asset.next_due);
                          const dueSoon = isDueSoon(asset.next_due);
                          return (
                            <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                              <td className="px-5 py-3">
                                <Link to={`/assets/${asset.id}`} className="text-sm font-medium text-brand-navy hover:text-brand-gold transition-colors">
                                  {asset.name}
                                </Link>
                                <p className="text-xs text-gray-400">{asset.serial_number}</p>
                              </td>
                              <td className="px-5 py-3 hidden sm:table-cell">
                                <span className="text-sm text-gray-500">{asset.location}</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${assetStatusStyles[asset.status] || 'bg-gray-50 text-gray-500'}`}>
                                  {asset.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 hidden md:table-cell">
                                <span className="text-sm text-gray-600">
                                  {asset.last_inspected ? new Date(asset.last_inspected).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`text-sm font-medium ${overdue ? 'text-red-500' : dueSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                                  {asset.next_due ? new Date(asset.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                  {overdue && <span className="ml-1 text-[10px]">(overdue)</span>}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <Link to={`/assets/${asset.id}`} className="inline-flex items-center text-gray-400 hover:text-brand-navy transition-colors">
                                  <span className="w-8 h-8 flex items-center justify-center">
                                    <i className="ri-arrow-right-s-line text-lg"></i>
                                  </span>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {assets.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <span className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-gray-300">
                  <i className="ri-inbox-line text-3xl"></i>
                </span>
                <p className="text-sm text-gray-500">No assets registered for this customer.</p>
                <Link to="/assets" className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors">
                  <i className="ri-add-line"></i> Add assets
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Customer Info Tab */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Customer Name</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{customer.name}</p>
                </div>
                {customer.company && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Company</p>
                    <p className="text-sm text-gray-700 mt-0.5">{customer.company}</p>
                  </div>
                )}
                {customer.contact_name && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Contact Person</p>
                    <p className="text-sm text-gray-700 mt-0.5">{customer.contact_name}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {(customer.address || customer.city) && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Address</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-gray-700 mt-0.5">{customer.phone}</p>
                  </div>
                )}
                {customer.email && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-gray-700 mt-0.5 break-all">{customer.email}</p>
                  </div>
                )}
                {customer.created_at && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Customer Since</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <CustomerDocuments customerId={customer.id} />
        )}

      </div>
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
            <form onSubmit={handleEdit} className="space-y-4">
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

              {editError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}