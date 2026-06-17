import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import { computeChecklistSummary, type ChecklistItem } from '@/mocks/checklists';
import RescheduleModal from './components/RescheduleModal';

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

interface InspectionDetail {
  id: string;
  asset_name: string;
  asset_id: string;
  asset_location: string;
  inspection_type: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  inspector_name: string;
  inspector_id: string;
  rating: string | null;
  findings: string | null;
  checklist_data: ChecklistItem[] | null;
  batch_id: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  customer: {
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
  } | null;
}

interface AssetDetail {
  id: string;
  serial_number: string;
  manufacturer: string;
  install_date: string;
  status: string;
}

interface HistoryItem {
  id: string;
  inspection_type: string;
  scheduled_date: string;
  rating: string | null;
}

interface BatchSibling {
  id: string;
  asset_name: string;
  status: string;
  inspection_type: string;
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [batchSiblings, setBatchSiblings] = useState<BatchSibling[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingCustomer, setCallingCustomer] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [technicians, setTechnicians] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: inspData, error: inspErr } = await supabase
          .from('inspections')
          .select(`
            id, asset_id, customer_id, scheduled_date, completed_date, status,
            inspection_type, rating, findings, checklist_data, batch_id, inspector_id,
            checked_in_at, checked_out_at, check_in_lat, check_in_lng, check_out_lat, check_out_lng,
            assets:asset_id (id, name, location, serial_number, manufacturer, install_date, status),
            profiles:inspector_id (full_name),
            customers:customer_id (id, name, company, address, city, state, zip, phone, sip_uri, email, contact_name, notes)
          `)
          .eq('id', id)
          .maybeSingle();

        if (inspErr || !inspData) throw inspErr || new Error('Not found');

        const item = inspData as any;

        // Security gate: technicians can only view their own inspections
        if (user?.role === 'technician' && item.inspector_id !== user.id) {
          navigate('/inspections', { replace: true });
          return;
        }

        setInspection({
          id: item.id,
          asset_id: item.asset_id,
          asset_name: item.assets?.name || 'Unknown',
          asset_location: item.assets?.location || 'Unknown',
          inspection_type: item.inspection_type,
          scheduled_date: item.scheduled_date,
          completed_date: item.completed_date,
          status: item.status,
          inspector_name: item.profiles?.full_name || 'Unassigned',
          inspector_id: item.inspector_id || '',
          rating: item.rating,
          findings: item.findings,
          checklist_data: item.checklist_data || null,
          batch_id: item.batch_id || null,
          checked_in_at: item.checked_in_at || null,
          checked_out_at: item.checked_out_at || null,
          check_in_lat: item.check_in_lat ?? null,
          check_in_lng: item.check_in_lng ?? null,
          check_out_lat: item.check_out_lat ?? null,
          check_out_lng: item.check_out_lng ?? null,
          customer: item.customers ? {
            id: item.customers.id,
            name: item.customers.name,
            company: item.customers.company,
            address: item.customers.address,
            city: item.customers.city,
            state: item.customers.state,
            zip: item.customers.zip,
            phone: item.customers.phone,
            sip_uri: item.customers.sip_uri,
            email: item.customers.email,
            contact_name: item.customers.contact_name,
            notes: item.customers.notes,
          } : null,
        });

        if (item.assets) {
          setAsset({
            id: item.asset_id,
            serial_number: item.assets.serial_number,
            manufacturer: item.assets.manufacturer,
            install_date: item.assets.install_date,
            status: item.assets.status,
          });
        }

        // Fetch history
        if (item.asset_id) {
          const { data: histData } = await supabase
            .from('inspections')
            .select('id, inspection_type, scheduled_date, rating')
            .eq('asset_id', item.asset_id)
            .neq('id', id)
            .order('scheduled_date', { ascending: false })
            .limit(3);

          setHistory((histData || []).map((h: any) => ({
            id: h.id,
            inspection_type: h.inspection_type,
            scheduled_date: h.scheduled_date,
            rating: h.rating,
          })));
        }

        // Fetch batch siblings
        if (item.batch_id) {
          const { data: batchData } = await supabase
            .from('inspections')
            .select('id, status, inspection_type, assets:asset_id (name)')
            .eq('batch_id', item.batch_id)
            .neq('id', id)
            .order('created_at', { ascending: true });

          setBatchSiblings((batchData || []).map((b: any) => ({
            id: b.id,
            asset_name: b.assets?.name || 'Unknown',
            status: b.status,
            inspection_type: b.inspection_type,
          })));
        }
      } catch {
        const { mockInspections } = await import('@/mocks/inspections');
        const { mockAssets } = await import('@/mocks/assets');
        const found = mockInspections.find((i: any) => i.id === id);
        if (found) {
          setInspection({
            id: found.id,
            asset_id: found.assetId,
            asset_name: found.assetName,
            asset_location: found.location,
            inspection_type: found.type,
            scheduled_date: found.scheduledDate,
            completed_date: found.completedDate,
            status: found.status,
            inspector_name: found.inspectorName,
            inspector_id: (found as any).inspectorId || '',
            rating: found.rating,
            findings: found.findings,
            checklist_data: null,
            batch_id: null,
            checked_in_at: null,
            checked_out_at: null,
            check_in_lat: null,
            check_in_lng: null,
            check_out_lat: null,
            check_out_lng: null,
            customer: null,
          });
          const foundAsset = mockAssets.find((a: any) => a.id === found.assetId);
          if (foundAsset) {
            setAsset({
              id: foundAsset.id,
              serial_number: foundAsset.serialNumber,
              manufacturer: foundAsset.manufacturer,
              install_date: foundAsset.installDate,
              status: foundAsset.status,
            });
          }
          setHistory(
            mockInspections
              .filter((i: any) => i.assetId === found.assetId && i.id !== found.id)
              .slice(0, 3)
              .map((h: any) => ({
                id: h.id,
                inspection_type: h.type,
                scheduled_date: h.scheduledDate,
                rating: h.rating,
              }))
          );
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Fetch technicians for reschedule modal
    async function fetchTechnicians() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'technician')
          .order('full_name');
        if (data) setTechnicians(data);
      } catch {
        setTechnicians([
          { id: 'usr-003', full_name: 'Mike Rodriguez' },
          { id: 'usr-004', full_name: 'Lisa Thompson' },
        ]);
      }
    }
    fetchTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto flex items-center justify-center h-64">
          <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
        </div>
      </DashboardLayout>
    );
  }

  const callCustomer = async () => {
    if (!inspection?.customer?.phone && !inspection?.customer?.sip_uri) return;
    setCallingCustomer(true);
    try {
      // Fetch current user's phone/SIP from profiles for bridge
      let callerPhone = '';
      let callerSipUri = '';
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('phone, sip_uri')
          .eq('id', user?.id)
          .maybeSingle();
        if (prof) {
          callerPhone = prof.phone || '';
          callerSipUri = prof.sip_uri || '';
        }
      } catch { /* non-critical */ }

      const dest = inspection?.customer?.sip_uri || inspection?.customer?.phone;
      if (!dest) {
        alert('No phone number or SIP URI on file for this customer.');
        setCallingCustomer(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('signalwire-call', {
        body: {
          action: 'bridge',
          inspectorId: user?.id,
          inspectorName: user?.fullName || 'Inspector',
          inspectorNumber: callerPhone || undefined,
          inspectorSip: callerSipUri || undefined,
          customerId: inspection?.customer?.id,
          customerName: inspection?.customer?.name || 'Customer',
          customerNumber: inspection?.customer?.phone || undefined,
          customerSip: inspection?.customer?.sip_uri || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const method = data?.usingSip ? 'SIP' : 'phone';
        alert(`Call initiated via ${method}! Your phone will ring first, then connect you to ${inspection?.customer?.name || 'the customer'}.`);
      } else {
        alert('Call failed: ' + (data?.error || 'Unknown error'));
      }
    } catch {
      // Fallback: try native dialer
      if (inspection?.customer?.phone) {
        window.location.href = `tel:${inspection.customer.phone}`;
      } else {
        alert('Call failed. No fallback available for SIP-only customers.');
      }
    } finally {
      setCallingCustomer(false);
    }
  };

  const emailReport = () => {
    if (!inspection?.customer?.email) {
      alert('No customer email on file for this inspection.');
      return;
    }
    setEmailSending(true);

    const summary = inspection.checklist_data ? computeChecklistSummary(inspection.checklist_data) : null;
    const subject = encodeURIComponent(`DouseFire Inspection Report — ${inspection.asset_name}`);
    const body = encodeURIComponent(
      `DOUSEFIRE INSPECTION REPORT\n` +
      `${'═'.repeat(50)}\n\n` +
      `Customer: ${inspection.customer?.name || 'N/A'}\n` +
      `Asset: ${inspection.asset_name}\n` +
      `Location: ${inspection.asset_location}\n` +
      `Inspection Type: ${inspection.inspection_type}\n` +
      `Scheduled: ${new Date(inspection.scheduled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n` +
      `Completed: ${inspection.completed_date ? new Date(inspection.completed_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}\n` +
      `Inspector: ${inspection.inspector_name}\n` +
      `Rating: ${inspection.rating ? inspection.rating.replace('_', ' ') : 'N/A'}\n` +
      (summary ? `\nResults: ${summary.pass} passed, ${summary.fail} failed, ${summary.needsAttention} need attention (${summary.passRate}% pass rate)\n` : '\n') +
      `\n${inspection.findings || 'No detailed findings recorded.'}\n\n` +
      `${'─'.repeat(50)}\n` +
      `This report was generated by DouseFire Inspection Management System.\n` +
      `For questions, contact your DouseFire service representative.\n`
    );

    window.location.href = `mailto:${inspection.customer.email}?subject=${subject}&body=${body}`;
    setTimeout(() => setEmailSending(false), 500);
  };

  const downloadInspectionReport = () => {
    if (!inspection) return;

    const summary = inspection.checklist_data ? computeChecklistSummary(inspection.checklist_data) : null;
    const now = new Date().toLocaleString('en-US');

    const failReasonLabels: Record<string, string> = {
      corroded: 'Corroded', damaged: 'Damaged', missing: 'Missing', leaking: 'Leaking',
      obstructed: 'Obstructed', expired: 'Expired', painted: 'Painted', dirty: 'Dirty / Dust',
      blocked: 'Blocked', low_pressure: 'Low Pressure', high_pressure: 'High Pressure',
      not_functioning: 'Not Functioning', not_accessible: 'Not Accessible', tampered: 'Tampered',
      wrong_type: 'Wrong Type', not_synchronized: 'Not Synchronized', low_volume: 'Low Volume',
      low_battery: 'Low Battery', no_signal: 'No Signal', worn: 'Worn', loose: 'Loose',
      incorrect_mounting: 'Incorrect Mounting',
    };

    let checklistHtml = '';
    if (inspection.checklist_data && inspection.checklist_data.length > 0) {
      const inspectedItems = inspection.checklist_data.filter((i: any) => i.result?.status !== 'not_applicable');
      if (inspectedItems.length > 0) {
        checklistHtml = `
<div class="section">
  <h2>Inspected Checklist Items</h2>
  <table>
    <thead><tr><th>#</th><th>Category</th><th>Item</th><th>Result</th><th>Deficiency</th><th>Value</th></tr></thead>
    <tbody>
      ${inspectedItems.map((item: any) => `
      <tr>
        <td>${item.id || ''}</td>
        <td>${item.category || ''}</td>
        <td>${item.description || ''}</td>
        <td><span class="badge ${
          item.result?.status === 'pass' ? 'badge-pass' :
          item.result?.status === 'fail' ? 'badge-fail' :
          'badge-pending'
        }">${(item.result?.status || '').replace(/_/g, ' ')}</span></td>
        <td>${item.result?.fail_reason ? (failReasonLabels[item.result.fail_reason] || item.result.fail_reason) : '—'}</td>
        <td>${item.result?.value !== undefined ? `${item.result.value} ${item.unit || ''}` : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>DouseFire Inspection Report</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0a1628; padding: 40px; max-width: 900px; margin: auto; }
  .header { border-bottom: 3px solid #c9a227; padding-bottom: 20px; margin-bottom: 28px; }
  .header h1 { font-size: 26px; color: #0a1628; margin: 0; }
  .header .brand { font-size: 12px; color: #c9a227; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; padding: 20px; background: #f9fafb; border-radius: 8px; }
  .meta-item { }
  .meta-label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
  .meta-value { font-size: 14px; color: #0a1628; font-weight: 500; margin-top: 2px; }
  .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-stat { text-align: center; padding: 14px; background: #f9fafb; border-radius: 8px; }
  .summary-stat .num { font-size: 24px; font-weight: 700; }
  .summary-stat .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
  .section p.finding { font-size: 14px; color: #4b5563; line-height: 1.7; white-space: pre-wrap; font-family: 'Courier New', monospace; background: #fafafa; padding: 16px; border-radius: 8px; border-left: 3px solid #c9a227; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 10px; background: #f3f4f6; font-size: 10px; text-transform: uppercase; color: #374151; }
  td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-pass { background: #d1fae5; color: #065f46; }
  .badge-fail { background: #fee2e2; color: #991b1b; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
</style></head>
<body>
<div class="header">
  <h1>${inspection.asset_name} — Inspection Report</h1>
  <div class="brand">DouseFire Inspection Management System</div>
</div>
<div class="meta">
  <div class="meta-item"><div class="meta-label">Customer</div><div class="meta-value">${inspection.customer?.name || 'N/A'}</div></div>
  <div class="meta-item"><div class="meta-label">Location</div><div class="meta-value">${inspection.asset_location}</div></div>
  <div class="meta-item"><div class="meta-label">Inspection Type</div><div class="meta-value">${inspection.inspection_type}</div></div>
  <div class="meta-item"><div class="meta-label">Inspector</div><div class="meta-value">${inspection.inspector_name}</div></div>
  <div class="meta-item"><div class="meta-label">Scheduled</div><div class="meta-value">${new Date(inspection.scheduled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
  <div class="meta-item"><div class="meta-label">Completed</div><div class="meta-value">${inspection.completed_date ? new Date(inspection.completed_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</div></div>
</div>
${summary ? `
<div class="summary">
  <div class="summary-stat"><div class="num">${summary.applicable}</div><div class="lbl">Inspected</div></div>
  <div class="summary-stat"><div class="num" style="color:#065f46">${summary.pass}</div><div class="lbl">Passed</div></div>
  <div class="summary-stat"><div class="num" style="color:#991b1b">${summary.fail}</div><div class="lbl">Failed</div></div>
  <div class="summary-stat"><div class="num" style="color:#92400e">${summary.needsAttention}</div><div class="lbl">Need Attn</div></div>
  <div class="summary-stat"><div class="num">${summary.passRate}%</div><div class="lbl">Pass Rate</div></div>
</div>` : ''}
<div class="section">
  <h2>Findings</h2>
  <p class="finding">${inspection.findings || 'No detailed findings recorded.'}</p>
</div>
${checklistHtml}
<div class="footer">Generated ${now} — DouseFire Inspection Management System</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DouseFire-Inspection-${inspection.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRescheduleConfirm = async (payload: { newDate: string; newTechnicianId?: string }) => {
    const updates: Record<string, any> = { scheduled_date: payload.newDate };
    if (payload.newTechnicianId) {
      updates.inspector_id = payload.newTechnicianId;
    }

    try {
      const { error } = await supabase
        .from('inspections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Refresh the inspection data
      const { data: refreshed } = await supabase
        .from('inspections')
        .select(`
          id, asset_id, customer_id, scheduled_date, completed_date, status,
          inspection_type, rating, findings, checklist_data, batch_id, inspector_id,
          checked_in_at, checked_out_at, check_in_lat, check_in_lng, check_out_lat, check_out_lng,
          assets:asset_id (id, name, location, serial_number, manufacturer, install_date, status),
          profiles:inspector_id (full_name),
          customers:customer_id (id, name, company, address, city, state, zip, phone, email, contact_name, notes)
        `)
        .eq('id', id)
        .maybeSingle();

      if (refreshed) {
        const item = refreshed as any;
        setInspection((prev) => prev ? {
          ...prev,
          scheduled_date: item.scheduled_date,
          inspector_name: item.profiles?.full_name || 'Unassigned',
        } : null);
      }
    } catch (err) {
      // Mock fallback
      setInspection((prev) => prev ? {
        ...prev,
        scheduled_date: payload.newDate,
        inspector_name: payload.newTechnicianId
          ? (technicians.find((t) => t.id === payload.newTechnicianId)?.full_name || prev.inspector_name)
          : prev.inspector_name,
      } : null);
    }
  };

  const handleCancelInspection = async () => {
    if (!confirm('Are you sure you want to cancel this inspection? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      navigate('/inspections', { replace: true });
    } catch {
      navigate('/inspections', { replace: true });
    }
  };

  if (!inspection) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto text-center py-20">
          <i className="ri-error-warning-line text-4xl text-gray-300 mb-4 block"></i>
          <h2 className="text-lg font-semibold text-gray-900">Inspection not found</h2>
          <p className="text-sm text-gray-500 mt-1">The inspection you are looking for does not exist.</p>
          <button
            onClick={() => navigate('/inspections')}
            className="mt-4 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            Back to Inspections
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3 md:mb-6 text-xs md:text-sm">
          <button
            onClick={() => navigate('/inspections')}
            className="text-gray-400 hover:text-brand-navy transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line mr-0.5"></i> Inspections
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-medium truncate max-w-[120px] md:max-w-none">{inspection.id.slice(0, 8)}...</span>
        </div>

        {/* Mobile: asset name + badges on their own line */}
        <div className="md:hidden mb-3">
          <h2 className="text-base font-bold text-gray-900">{inspection.asset_name}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{inspection.inspection_type} · {inspection.asset_location}</p>
          <div className="flex gap-1.5 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[inspection.status] || 'bg-gray-50 text-gray-500'}`}>
              {inspection.status.replace('_', ' ')}
            </span>
            {inspection.rating && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ratingStyles[inspection.rating] || 'bg-gray-50 text-gray-500'}`}>
                {inspection.rating.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            {/* Main card */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
              {/* Desktop header */}
              <div className="hidden md:flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{inspection.asset_name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{inspection.inspection_type} · {inspection.asset_location}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[inspection.status] || 'bg-gray-50 text-gray-500'}`}>
                    {inspection.status.replace('_', ' ')}
                  </span>
                  {inspection.rating && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ratingStyles[inspection.rating] || 'bg-gray-50 text-gray-500'}`}>
                      {inspection.rating.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Stat cards - 2 cols on mobile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-5">
                <div className="p-2.5 md:p-3 rounded-lg bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">Scheduled</p>
                  <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5 md:mt-1">
                    {new Date(inspection.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="p-2.5 md:p-3 rounded-lg bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">Inspector</p>
                  <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5 md:mt-1 truncate">{inspection.inspector_name}</p>
                </div>
                <div className="p-2.5 md:p-3 rounded-lg bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">Type</p>
                  <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5 md:mt-1 truncate">{inspection.inspection_type}</p>
                </div>
                <div className="p-2.5 md:p-3 rounded-lg bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">Completed</p>
                  <p className="text-xs md:text-sm font-medium text-gray-900 mt-0.5 md:mt-1">
                    {inspection.completed_date
                      ? new Date(inspection.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 md:pt-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 md:mb-3">Findings & Notes</h3>
                {inspection.findings ? (
                  <p className="text-sm text-gray-600 leading-relaxed">{inspection.findings}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No findings recorded yet. This inspection has not been completed.</p>
                )}
              </div>

              {/* Checklist Results */}
              {inspection.checklist_data && inspection.checklist_data.length > 0 && (
                <div className="border-t border-gray-100 pt-4 md:pt-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 md:mb-3">
                    Inspection Checklist Results
                  </h3>
                  {(() => {
                    const summary = computeChecklistSummary(inspection.checklist_data);
                    return (
                      <>
                        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[11px] md:text-xs text-gray-600">{summary.pass} pass</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500"></div>
                            <span className="text-[11px] md:text-xs text-gray-600">{summary.fail} fail</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-amber-500"></div>
                            <span className="text-[11px] md:text-xs text-gray-600">{summary.needsAttention} attention</span>
                          </div>
                          <span className="text-[11px] md:text-xs font-semibold text-gray-700">{summary.passRate}% pass rate</span>
                        </div>

                        <div className="space-y-0.5 max-h-80 md:max-h-96 overflow-y-auto">
                          {inspection.checklist_data.map((item) => (
                            <div key={item.id} className="flex items-start gap-2 md:gap-3 py-2 px-2 md:px-3 rounded-lg hover:bg-gray-50">
                              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                item.result.status === 'pass' ? 'bg-emerald-500' :
                                item.result.status === 'fail' ? 'bg-red-500' :
                                item.result.status === 'needs_attention' ? 'bg-amber-500' :
                                'bg-gray-300'
                              }`}></span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs md:text-sm text-gray-700 leading-snug">{item.description}</p>
                                {(item.result.value !== undefined || item.result.notes) && (
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {item.result.value !== undefined && (
                                      <span className="text-[10px] md:text-[11px] text-gray-500">{item.result.value} {item.unit || ''}</span>
                                    )}
                                    {item.result.notes && (
                                      <span className="text-[10px] md:text-[11px] text-gray-400 italic truncate max-w-[160px] md:max-w-xs">"{item.result.notes}"</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className={`text-[10px] md:text-[11px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${
                                item.result.status === 'pass' ? 'text-emerald-600 bg-emerald-50' :
                                item.result.status === 'fail' ? 'text-red-500 bg-red-50' :
                                item.result.status === 'needs_attention' ? 'text-amber-600 bg-amber-50' :
                                'text-gray-400 bg-gray-50'
                              }`}>
                                {item.result.status === 'needs_attention' ? 'attn' : item.result.status === 'not_applicable' ? 'n/a' : item.result.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Actions card */}
            {(inspection.status === 'scheduled' || inspection.status === 'overdue' || inspection.status === 'in_progress') ? (
              <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4">Actions</h3>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <Link
                    to={`/inspections/${inspection.id}/perform`}
                    className="px-4 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap text-center"
                  >
                    <i className="ri-clipboard-line mr-1.5"></i> Perform Inspection
                  </Link>
                  {(inspection.customer?.phone || inspection.customer?.sip_uri) && (
                    <button
                      onClick={callCustomer}
                      disabled={callingCustomer}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait shadow-sm"
                    >
                      {callingCustomer ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <i className="ri-phone-fill mr-0.5"></i>
                      )}
                      Call Customer
                    </button>
                  )}
                  {user && user.role !== 'technician' && (
                    <>
                      <button
                        onClick={() => setShowRescheduleModal(true)}
                        className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-calendar-line mr-1.5"></i> Reschedule
                      </button>
                      <button
                        onClick={handleCancelInspection}
                        className="px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-close-circle-line mr-1.5"></i> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4">Actions</h3>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <button
                    onClick={downloadInspectionReport}
                    className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-download-line mr-1.5"></i> Download Report
                  </button>
                  {(inspection.customer?.phone || inspection.customer?.sip_uri) && (
                    <button
                      onClick={callCustomer}
                      disabled={callingCustomer}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait shadow-sm"
                    >
                      {callingCustomer ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <i className="ri-phone-fill mr-0.5"></i>
                      )}
                      Call Customer
                    </button>
                  )}
                  {inspection.customer?.email && (
                    <button
                      onClick={emailReport}
                      disabled={emailSending}
                      className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <i className="ri-mail-send-line mr-1.5"></i> Email to Customer
                    </button>
                  )}
                  <button className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap">
                    <i className="ri-share-line mr-1.5"></i> Share
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-3 md:space-y-4">
            {/* Asset Information */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Asset Information</h3>
              {asset ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Serial Number</p>
                    <p className="text-sm font-medium text-gray-900">{asset.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Manufacturer</p>
                    <p className="text-sm font-medium text-gray-900">{asset.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Installed</p>
                    <p className="text-sm font-medium text-gray-900">{asset.install_date ? new Date(asset.install_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${asset.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {asset.status}
                    </span>
                  </div>
                  <Link to={`/assets/${asset.id}`} className="inline-flex items-center text-sm text-brand-gold hover:text-brand-navy font-medium mt-1 transition-colors">
                    View asset details <i className="ri-arrow-right-s-line ml-1"></i>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Asset information unavailable.</p>
              )}
            </div>

            {/* Customer Information */}
            {inspection.customer && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inspection.customer.name}</p>
                    {inspection.customer.company && (
                      <p className="text-xs text-gray-400 mt-0.5">{inspection.customer.company}</p>
                    )}
                  </div>
                  {inspection.customer.address && (
                    <div>
                      <p className="text-xs text-gray-400">Address</p>
                      <p className="text-sm text-gray-600">
                        {[inspection.customer.address, inspection.customer.city, inspection.customer.state, inspection.customer.zip].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                  {inspection.customer.contact_name && (
                    <div>
                      <p className="text-xs text-gray-400">Contact</p>
                      <p className="text-sm text-gray-600">{inspection.customer.contact_name}</p>
                    </div>
                  )}
                  {(inspection.customer.phone || inspection.customer.sip_uri) && (
                    <div>
                      <p className="text-xs text-gray-400">{inspection.customer.phone ? 'Phone' : 'SIP'}</p>
                      <div className="flex items-center gap-2">
                        {inspection.customer.phone && (
                          <span className="text-sm text-gray-600">{inspection.customer.phone}</span>
                        )}
                        <button
                          onClick={callCustomer}
                          disabled={callingCustomer}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          {callingCustomer ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></span>
                              Calling...
                            </>
                          ) : (
                            <>
                              <span className="w-3.5 h-3.5 flex items-center justify-center">
                                <i className="ri-phone-line"></i>
                              </span>
                              Call
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  {inspection.customer.email && (
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <a href={`mailto:${inspection.customer.email}`} className="text-sm text-brand-gold hover:text-brand-navy transition-colors">
                        {inspection.customer.email}
                      </a>
                    </div>
                  )}
                  {inspection.customer.notes && (
                    <div>
                      <p className="text-xs text-gray-400">Notes</p>
                      <p className="text-xs text-gray-500 line-clamp-3">{inspection.customer.notes}</p>
                    </div>
                  )}
                  <Link to={`/customers/${inspection.customer.id}`} className="inline-flex items-center text-sm text-brand-gold hover:text-brand-navy font-medium mt-1 transition-colors">
                    View customer details <i className="ri-arrow-right-s-line ml-1"></i>
                  </Link>
                </div>
              </div>
            )}

            {/* Batch Siblings */}
            {batchSiblings.length > 0 && (
              <div className="bg-white rounded-xl border border-brand-gold/20 p-4 md:p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  <span className="w-5 h-5 inline-flex items-center justify-center mr-1 bg-brand-gold/10 text-brand-gold rounded-md">
                    <i className="ri-stack-line text-xs"></i>
                  </span>
                  Batch Inspection ({batchSiblings.length + 1} items)
                </h3>
                <div className="space-y-2">
                  {batchSiblings.map((sib) => (
                    <Link key={sib.id} to={`/inspections/${sib.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        sib.status === 'completed' ? 'bg-emerald-500' :
                        sib.status === 'in_progress' ? 'bg-amber-500' :
                        sib.status === 'overdue' ? 'bg-red-500' :
                        'bg-brand-cyan'
                      }`}></span>
                      <span className="text-sm text-gray-700 truncate flex-1">{sib.asset_name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        sib.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        sib.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {sib.status.replace('_', ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* GPS Attendance Verification */}
            {(inspection.checked_in_at || inspection.checked_out_at) && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 flex items-center justify-center text-emerald-600">
                    <i className="ri-map-pin-line text-xs"></i>
                  </span>
                  GPS Attendance
                </h3>
                <div className="space-y-3">
                  {/* Arrival */}
                  <div className="flex items-start gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${inspection.checked_in_at ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      <i className="ri-login-box-line text-xs"></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">Arrival</p>
                      {inspection.checked_in_at ? (
                        <>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(inspection.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            {' · '}
                            {new Date(inspection.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          {inspection.check_in_lat !== null && inspection.check_in_lng !== null && (
                            <a
                              href={`https://www.google.com/maps?q=${inspection.check_in_lat},${inspection.check_in_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-brand-navy hover:text-brand-gold transition-colors cursor-pointer mt-0.5 inline-block"
                            >
                              {inspection.check_in_lat.toFixed(6)}, {inspection.check_in_lng.toFixed(6)}
                              <i className="ri-external-link-line ml-1 text-[9px]"></i>
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Not recorded</p>
                      )}
                    </div>
                  </div>

                  {/* Departure */}
                  <div className="flex items-start gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${inspection.checked_out_at ? 'bg-brand-navy/10 text-brand-navy' : 'bg-gray-100 text-gray-400'}`}>
                      <i className="ri-logout-box-line text-xs"></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">Departure</p>
                      {inspection.checked_out_at ? (
                        <>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(inspection.checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            {' · '}
                            {new Date(inspection.checked_out_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          {inspection.check_out_lat !== null && inspection.check_out_lng !== null && (
                            <a
                              href={`https://www.google.com/maps?q=${inspection.check_out_lat},${inspection.check_out_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-brand-navy hover:text-brand-gold transition-colors cursor-pointer mt-0.5 inline-block"
                            >
                              {inspection.check_out_lat.toFixed(6)}, {inspection.check_out_lng.toFixed(6)}
                              <i className="ri-external-link-line ml-1 text-[9px]"></i>
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Not recorded</p>
                      )}
                    </div>
                  </div>

                  {/* Verified badge */}
                  {inspection.checked_in_at && inspection.check_in_lat !== null && inspection.checked_out_at && inspection.check_out_lat !== null && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="w-4 h-4 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <i className="ri-shield-check-line text-xs"></i>
                      </span>
                      <span className="text-[11px] font-medium text-emerald-700">Onsite attendance verified</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Inspection History</h3>
              <div className="space-y-3">
                {history.map((hist) => (
                  <Link key={hist.id} to={`/inspections/${hist.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-clipboard-line text-gray-400 text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{hist.inspection_type}</p>
                      <p className="text-xs text-gray-400">{new Date(hist.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    {hist.rating && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${ratingStyles[hist.rating] || 'bg-gray-50 text-gray-500'}`}>
                        {hist.rating.replace('_', ' ')}
                      </span>
                    )}
                  </Link>
                ))}
                {history.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No previous inspections for this asset.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {inspection && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          inspectionId={inspection.id}
          assetName={inspection.asset_name}
          currentDate={inspection.scheduled_date}
          currentInspectorId={inspection.inspector_id || ''}
          currentInspectorName={inspection.inspector_name}
          technicians={technicians}
          onConfirm={handleRescheduleConfirm}
        />
      )}
    </DashboardLayout>
  );
}