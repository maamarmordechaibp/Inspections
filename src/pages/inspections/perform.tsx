import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import GpsCheckIn from '@/components/feature/GpsCheckIn';
import { supabase } from '@/lib/supabase';
import { persist } from '@/lib/offlineMutation';
import { useAuth } from '@/context';
import {
  initChecklistItems,
  computeChecklistSummary,
  checklistToOverallRating,
  FAIL_REASON_LABELS,
  type ChecklistItem,
  type ChecklistResult,
  type FailReason,
} from '@/mocks/checklists';
import {
  generateAiSuggestion,
  grammarCheck,
  checkMissingFields,
  getAiInspectionStats,
  type MissingFieldWarning,
} from '@/mocks/aiSuggestions';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import PhotoAnnotator from './components/PhotoAnnotator';

interface BatchInspection {
  id: string;
  assetId: string;
  customerId: string;
  assetName: string;
  assetType: string;
  assetLocation: string;
  status: string;
  items: ChecklistItem[];
}

const statusStyles: Record<string, string> = {
  scheduled: 'bg-brand-cyan/10 text-brand-cyan',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-500',
};

const assetTypeIcons: Record<string, string> = {
  Extinguisher: 'ri-fire-fill',
  Sprinkler: 'ri-drop-fill',
  Alarm: 'ri-alert-fill',
  Hydrant: 'ri-water-flash-fill',
  Hose: 'ri-bring-to-front',
  'Backflow Preventer': 'ri-contrast-drop-line',
  'Fire Pump': 'ri-speed-up-fill',
  'Kitchen Suppression': 'ri-fire-fill',
  'Emergency Lighting': 'ri-lightbulb-flash-line',
  'Smoke Control': 'ri-windy-line',
  'Elevator Recall': 'ri-arrow-up-down-line',
  'Monitoring System': 'ri-signal-tower-line',
};

const assetTypeColors: Record<string, string> = {
  Extinguisher: 'bg-red-50 text-red-500',
  Sprinkler: 'bg-brand-cyan/10 text-brand-cyan',
  Alarm: 'bg-amber-50 text-amber-600',
  Hydrant: 'bg-blue-50 text-blue-600',
  Hose: 'bg-fuchsia-50 text-fuchsia-600',
  'Backflow Preventer': 'bg-teal-50 text-teal-600',
  'Fire Pump': 'bg-orange-50 text-orange-600',
  'Kitchen Suppression': 'bg-rose-50 text-rose-600',
  'Emergency Lighting': 'bg-green-50 text-green-600',
  'Smoke Control': 'bg-sky-50 text-sky-600',
  'Elevator Recall': 'bg-violet-50 text-violet-600',
  'Monitoring System': 'bg-slate-100 text-slate-600',
};

const ASSET_TYPE_INTERVALS: Record<string, number> = {
  Extinguisher: 30,
  Sprinkler: 90,
  Alarm: 365,
  Hydrant: 180,
  Hose: 365,
  'Backflow Preventer': 365,
  'Fire Pump': 30,
  'Kitchen Suppression': 180,
  'Emergency Lighting': 30,
  'Smoke Control': 180,
  'Elevator Recall': 365,
  'Monitoring System': 365,
};

async function scheduleNextInspection(
  assetIdToUse: string,
  customerIdToUse: string,
  assetTypeToUse: string,
  inspectionTypeToUse: string,
) {
  const intervalDays = ASSET_TYPE_INTERVALS[assetTypeToUse] || 90;
  const now = new Date();
  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + intervalDays);
  const nextScheduled = new Date(nextDue);
  nextScheduled.setDate(nextScheduled.getDate() - 1);

  try {
    await supabase
      .from('assets')
      .update({ last_inspected: now.toISOString(), next_due: nextDue.toISOString() })
      .eq('id', assetIdToUse);
    await supabase.from('inspections').insert({
      asset_id: assetIdToUse, customer_id: customerIdToUse,
      scheduled_date: nextScheduled.toISOString(), status: 'scheduled', inspection_type: inspectionTypeToUse,
    });
  } catch { /* non-critical */ }
}

export default function PerformInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [assetId, setAssetId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [inspectionType, setInspectionType] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSipUri, setCustomerSipUri] = useState('');
  const [inspectorPhone, setInspectorPhone] = useState('');
  const [inspectorSipUri, setInspectorSipUri] = useState('');
  const [callingCustomer, setCallingCustomer] = useState(false);
  const [callError, setCallError] = useState('');
  const [callSuccess, setCallSuccess] = useState('');

  const [isBatch, setIsBatch] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchInspections, setBatchInspections] = useState<BatchInspection[]>([]);
  const [collapsedAssets, setCollapsedAssets] = useState<Record<string, boolean>>();
  const [batchInspectionType, setBatchInspectionType] = useState('');

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [techSignature, setTechSignature] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');
  const [signatureStep, setSignatureStep] = useState<'tech' | 'customer' | 'done'>('tech');
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [deficiencyItem, setDeficiencyItem] = useState<ChecklistItem | null>(null);
  const [deficiencyForm, setDeficiencyForm] = useState({ severity: 'medium', description: '', corrective_action: '', estimated_cost: '' });
  const [creatingDeficiency, setCreatingDeficiency] = useState(false);

  // ─── GPS Attendance State ───
  const [checkInAt, setCheckInAt] = useState<string | null>(null);
  const [checkOutAt, setCheckOutAt] = useState<string | null>(null);
  const [checkInLat, setCheckInLat] = useState<number | null>(null);
  const [checkInLng, setCheckInLng] = useState<number | null>(null);
  const [checkOutLat, setCheckOutLat] = useState<number | null>(null);
  const [checkOutLng, setCheckOutLng] = useState<number | null>(null);

  // ─── AI Assistant State ───
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<MissingFieldWarning[]>([]);
  const [grammarToast, setGrammarToast] = useState<{ itemId: string; changes: string[] } | null>(null);
  const [aiSuggesting, setAiSuggesting] = useState<Record<string, boolean>>();

  // ─── Photo Annotation State ───
  const [annotatePhoto, setAnnotatePhoto] = useState<{ itemId: string; inspectionId?: string; photoUrl: string } | null>(null);

  const techCanvasRef = useRef<HTMLCanvasElement>(null);
  const customerCanvasRef = useRef<HTMLCanvasElement>(null);
  const techDrawing = useRef(false);
  const customerDrawing = useRef(false);

  const allItems = isBatch ? batchInspections.flatMap((bi) => bi.items) : items;

  useEffect(() => {
    if (allItems.length > 0) {
      setAiWarnings(checkMissingFields(allItems));
    }
  }, [allItems, isBatch]);

  const loadInspection = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('inspections')
        .select(`id, asset_id, customer_id, status, inspection_type, scheduled_date, checklist_data, batch_id, inspector_id, signature_tech, signature_customer, checked_in_at, checked_out_at, check_in_lat, check_in_lng, check_out_lat, check_out_lng, assets:asset_id (name, type, location), customers:customer_id (name, phone, sip_uri, contact_name)`)
        .eq('id', id)
        .maybeSingle();
      if (fetchErr || !data) throw fetchErr || new Error('Inspection not found');
      const insp = data as any;
      if (user?.role === 'technician' && insp.inspector_id !== user.id) { navigate('/inspections', { replace: true }); return; }
      if (insp.signature_tech) setTechSignature(insp.signature_tech);
      if (insp.signature_customer) setCustomerSignature(insp.signature_customer);
      setCheckInAt(insp.checked_in_at || null);
      setCheckOutAt(insp.checked_out_at || null);
      setCheckInLat(insp.check_in_lat ?? null);
      setCheckInLng(insp.check_in_lng ?? null);
      setCheckOutLat(insp.check_out_lat ?? null);
      setCheckOutLng(insp.check_out_lng ?? null);
      try {
        const inspectorId = insp.inspector_id || user?.id;
        if (inspectorId) {
          const { data: ip } = await supabase.from('profiles').select('phone, sip_uri').eq('id', inspectorId).maybeSingle();
          if (ip) { setInspectorPhone(ip.phone || ''); setInspectorSipUri(ip.sip_uri || ''); }
        }
      } catch { /* non-critical */ }
      if (insp.customers) { setCustomerName(insp.customers.name || ''); setCustomerPhone(insp.customers.phone || ''); setCustomerSipUri(insp.customers.sip_uri || ''); }
      if (insp.batch_id) {
        setIsBatch(true); setBatchId(insp.batch_id); setBatchInspectionType(insp.inspection_type || '');
        const { data: siblings } = await supabase.from('inspections').select(`id, asset_id, customer_id, status, inspection_type, checklist_data, assets:asset_id (name, type, location)`).eq('batch_id', insp.batch_id).order('created_at', { ascending: true });
        if (siblings && siblings.length > 0) {
          setBatchInspections(siblings.map((s: any) => ({ id: s.id, assetId: s.asset_id || '', customerId: s.customer_id || '', assetName: s.assets?.name || 'Unknown', assetType: s.assets?.type || '', assetLocation: s.assets?.location || '', status: s.status, items: (s.checklist_data && Array.isArray(s.checklist_data)) ? s.checklist_data as ChecklistItem[] : initChecklistItems(s.assets?.type || '') })));
        }
        setScheduledDate(insp.scheduled_date || '');
      } else {
        setIsBatch(false); setAssetId(insp.asset_id || ''); setCustomerId(insp.customer_id || ''); setInspectionStatus(insp.status); setInspectionType(insp.inspection_type || ''); setScheduledDate(insp.scheduled_date || ''); setAssetName(insp.assets?.name || 'Unknown'); setAssetType(insp.assets?.type || ''); setAssetLocation(insp.assets?.location || '');
        setItems((insp.checklist_data && Array.isArray(insp.checklist_data)) ? insp.checklist_data as ChecklistItem[] : initChecklistItems(insp.assets?.type || ''));
      }
    } catch (err: any) { setError(err.message || 'Failed to load inspection'); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { loadInspection(); }, [loadInspection]);

  const callCustomer = async () => {
    setCallError(''); setCallSuccess(''); setCallingCustomer(true);
    try {
      const dest = customerSipUri || customerPhone;
      if (!dest) { setCallError('No phone number or SIP URI on file.'); setCallingCustomer(false); return; }
      const { data, error: ce } = await supabase.functions.invoke('signalwire-call', { body: { action: 'bridge', inspectorId: user?.id, inspectorName: user?.fullName || 'Inspector', inspectorNumber: inspectorPhone || undefined, inspectorSip: inspectorSipUri || undefined, customerId: customerId || undefined, customerName: customerName || 'Customer', customerNumber: customerPhone || undefined, customerSip: customerSipUri || undefined } });
      if (ce) throw ce;
      if (data?.success) { setCallSuccess(`Call initiated!`); setTimeout(() => setCallSuccess(''), 6000); }
      else { setCallError(data?.error || 'Call failed.'); }
    } catch { /* fallback */ if (customerPhone) { window.location.href = `tel:${customerPhone}`; } else { setCallError('Call failed.'); } }
    finally { setCallingCustomer(false); }
  };

  const ensureInProgress = async () => {
    if (isBatch) {
      for (const bi of batchInspections) { if (bi.status === 'scheduled' || bi.status === 'overdue') { await supabase.from('inspections').update({ status: 'in_progress' }).eq('id', bi.id); } }
      setBatchInspections((prev) => prev.map((bi) => (bi.status === 'scheduled' || bi.status === 'overdue' ? { ...bi, status: 'in_progress' } : bi)));
    } else if (inspectionStatus === 'scheduled' || inspectionStatus === 'overdue') {
      const { error: ue } = await supabase.from('inspections').update({ status: 'in_progress' }).eq('id', id);
      if (!ue) setInspectionStatus('in_progress');
    }
  };

  const handleResultChange = (itemId: string, field: keyof ChecklistResult, value: any) => {
    ensureInProgress();
    setItems((prev) => prev.map((item) => { if (item.id !== itemId) return item; const nr = { ...item.result, [field]: value }; if (field === 'status' && value !== 'fail') nr.fail_reason = undefined; return { ...item, result: nr }; }));
  };

  const handleBatchResultChange = (inspectionId: string, itemId: string, field: keyof ChecklistResult, value: any) => {
    ensureInProgress();
    setBatchInspections((prev) => prev.map((bi) => { if (bi.id !== inspectionId) return bi; return { ...bi, items: bi.items.map((item) => { if (item.id !== itemId) return item; const nr = { ...item.result, [field]: value }; if (field === 'status' && value !== 'fail') nr.fail_reason = undefined; return { ...item, result: nr }; }) }; }));
  };

  const handleSave = async () => { setError(''); setSuccess(''); setSaving(true); try { let queuedAny = false; if (isBatch) { for (const bi of batchInspections) { const r = await persist('inspections', 'update', { id: bi.id, checklist_data: bi.items }); if (r.error) throw r.error; if (r.queued) queuedAny = true; } } else { const r = await persist('inspections', 'update', { id, checklist_data: items }); if (r.error) throw r.error; if (r.queued) queuedAny = true; } setSuccess(queuedAny ? 'Saved offline — will sync when reconnected.' : 'Checklist saved.'); setTimeout(() => setSuccess(''), 2500); } catch (err: any) { setError(err.message || 'Failed to save'); } finally { setSaving(false); } };

  const handleComplete = async () => {
    if (!techSignature || !customerSignature) { setShowSignatureModal(true); setSignatureStep('tech'); return; }
    doComplete();
  };

  const doComplete = async () => {
    setError(''); setSuccess('');
    if (isBatch) {
      const allItems = batchInspections.flatMap((bi) => bi.items);
      const summary = computeChecklistSummary(allItems);
      if (summary.applicable === 0) { setError('Please mark at least one checklist item before completing.'); return; }
      setCompleting(true);
      try {
        const findings = generateBatchFindings(batchInspections, summary);
        let queuedAny = false;
        for (const bi of batchInspections) {
          const biSummary = computeChecklistSummary(bi.items);
          const r = await persist('inspections', 'update', { id: bi.id, status: 'completed', completed_date: new Date().toISOString(), rating: checklistToOverallRating(biSummary), checklist_data: bi.items, findings, signature_tech: techSignature || null, signature_customer: customerSignature || null });
          if (r.error) throw r.error;
          if (r.queued) queuedAny = true;
        }
        for (const bi of batchInspections) { scheduleNextInspection(bi.assetId, bi.customerId, bi.assetType, batchInspectionType); }
        setSuccess(queuedAny ? `Batch saved offline — ${batchInspections.length} items will sync when reconnected.` : `Batch completed — ${batchInspections.length} items.`);
        setTimeout(() => navigate(`/inspections/${id}`), 1500);
      } catch (err: any) { setError(err.message || 'Failed.'); }
      finally { setCompleting(false); }
    } else {
      const summary = computeChecklistSummary(items);
      if (summary.applicable === 0) { setError('Please mark at least one checklist item before completing.'); return; }
      setCompleting(true);
      try {
        const findings = generateFindings(items, summary);
        const r = await persist('inspections', 'update', { id, status: 'completed', completed_date: new Date().toISOString(), rating: checklistToOverallRating(summary), checklist_data: items, findings, signature_tech: techSignature || null, signature_customer: customerSignature || null });
        if (r.error) throw r.error;
        scheduleNextInspection(assetId, customerId, assetType, inspectionType);
        setSuccess(r.queued ? 'Saved offline — will sync when reconnected.' : 'Inspection completed!');
        setInspectionStatus('completed');
        setTimeout(() => navigate(`/inspections/${id}`), 1500);
      } catch (err: any) { setError(err.message || 'Failed.'); }
      finally { setCompleting(false); }
    }
  };

  const handleAnnotatePhoto = (itemId: string, photoUrl: string) => {
    setAnnotatePhoto({ itemId, photoUrl });
  };

  const handleAnnotateSave = (annotatedDataUrl: string) => {
    if (!annotatePhoto) return;
    const { itemId } = annotatePhoto;
    if (isBatch) {
      setBatchInspections((prev) => prev.map((bi) => ({
        ...bi,
        items: bi.items.map((item) =>
          item.id === itemId
            ? { ...item, result: { ...item.result, photo_urls: (item.result.photo_urls || []).map((url) => url === annotatePhoto.photoUrl ? annotatedDataUrl : url) } }
            : item
        ),
      })));
    } else {
      setItems((prev) => prev.map((item) =>
        item.id === itemId
          ? { ...item, result: { ...item.result, photo_urls: (item.result.photo_urls || []).map((url) => url === annotatePhoto.photoUrl ? annotatedDataUrl : url) } }
          : item
      ));
    }
    setAnnotatePhoto(null);
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (isBatch) {
          setBatchInspections((prev) => prev.map((bi) => ({ ...bi, items: bi.items.map((item) => item.id === itemId ? { ...item, result: { ...item.result, photo_urls: [...(item.result.photo_urls || []), dataUrl] } } : item) })));
        } else {
          setItems((prev) => prev.map((item) => item.id === itemId ? { ...item, result: { ...item.result, photo_urls: [...(item.result.photo_urls || []), dataUrl] } } : item));
        }
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  const openDeficiencyModal = (item: ChecklistItem) => {
    const failReason = item.result.fail_reason ? FAIL_REASON_LABELS[item.result.fail_reason] : '';
    setDeficiencyItem(item);
    setDeficiencyForm({ severity: 'medium', description: `${item.description} — ${failReason}`, corrective_action: '', estimated_cost: '' });
    setShowDeficiencyModal(true);
  };

  const createDeficiency = async () => {
    if (!deficiencyItem || !id) return;
    setCreatingDeficiency(true);
    try {
      const insp = isBatch ? batchInspections.find((bi) => bi.items.some((i) => i.id === deficiencyItem.id)) : undefined;
      await supabase.from('deficiencies').insert({
        inspection_id: id, asset_id: insp?.assetId || assetId || null, customer_id: insp?.customerId || customerId || null,
        checklist_item_id: deficiencyItem.id, checklist_item_description: deficiencyItem.description,
        severity: deficiencyForm.severity, description: deficiencyForm.description || `${deficiencyItem.description}`,
        corrective_action: deficiencyForm.corrective_action || null,
        estimated_cost: deficiencyForm.estimated_cost ? parseFloat(deficiencyForm.estimated_cost) : null, status: 'open',
      });
      setShowDeficiencyModal(false); setDeficiencyItem(null);
      setDeficiencyForm({ severity: 'medium', description: '', corrective_action: '', estimated_cost: '' });
    } finally { setCreatingDeficiency(false); }
  };

  const clearSignature = (who: 'tech' | 'customer') => {
    const canvas = who === 'tech' ? techCanvasRef.current : customerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (who === 'tech') setTechSignature(''); else setCustomerSignature('');
  };

  const finalizeSignature = (who: 'tech' | 'customer') => {
    const canvas = who === 'tech' ? techCanvasRef.current : customerCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (who === 'tech') { setTechSignature(dataUrl); setSignatureStep('customer'); }
    else { setCustomerSignature(dataUrl); setSignatureStep('done'); setShowSignatureModal(false); }
  };

  const anyCompleted = isBatch ? batchInspections.some((bi) => bi.status === 'completed') : inspectionStatus === 'completed';
  const isReadOnly = anyCompleted;

  if (loading) {
    return (<DashboardLayout><div className="max-w-[1400px] mx-auto flex items-center justify-center h-64"><i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i></div></DashboardLayout>);
  }

  let summary: ReturnType<typeof computeChecklistSummary>;
  if (isBatch) { summary = computeChecklistSummary(batchInspections.flatMap((bi) => bi.items)); }
  else { summary = computeChecklistSummary(items); }

  const aiStats = getAiInspectionStats(allItems);

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center gap-2 mb-3 sm:mb-4 overflow-x-auto">
          <button onClick={() => navigate('/inspections')} className="text-xs sm:text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1"></i> Inspections</button>
          <span className="text-gray-300">/</span>
          <button onClick={() => navigate(`/inspections/${id}`)} className="text-xs sm:text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer whitespace-nowrap">{id?.slice(0, 8)}...</button>
          <span className="text-gray-300">/</span>
          <span className="text-xs sm:text-sm text-gray-900 font-medium">Perform</span>
        </div>

        {/* Header */}
        {isBatch ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col gap-3">
              <div><h1 className="text-lg sm:text-xl font-bold text-gray-900">Batch Inspection</h1><p className="text-xs sm:text-sm text-gray-500 mt-0.5">{batchInspectionType} · {batchInspections.length} asset{batchInspections.length !== 1 ? 's' : ''}<span className="mx-2 text-gray-300">|</span>{new Date(scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
              <div className="flex items-center gap-1.5">{Array.from(new Set(batchInspections.map((bi) => bi.assetType))).map((type) => (<span key={type} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${assetTypeColors[type] || 'bg-brand-navy/8 text-brand-navy'}`}><i className={`${assetTypeIcons[type] || 'ri-tools-line'} mr-1 text-[10px]`}></i>{type}</span>))}</div>
              {(customerPhone || customerSipUri) && (<div className="flex items-center gap-2 pt-2 border-t border-gray-100"><div className="flex-1 min-w-0"><p className="text-xs text-gray-400">Customer</p><p className="text-sm font-medium text-gray-900 truncate">{customerName || 'Unknown'}</p></div><button onClick={callCustomer} disabled={callingCustomer} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait shadow-sm">{callingCustomer ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Calling...</>) : (<><span className="w-4 h-4 flex items-center justify-center"><i className="ri-phone-fill"></i></span>Call Customer</>)}</button></div>)}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col gap-3">
              <div><h1 className="text-lg sm:text-xl font-bold text-gray-900">{assetName}</h1><p className="text-xs sm:text-sm text-gray-500 mt-0.5">{inspectionType} · {assetLocation}<span className="mx-2 text-gray-300">|</span>{new Date(scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
              <div className="flex items-center gap-2"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[inspectionStatus] || 'bg-gray-50 text-gray-500'}`}>{inspectionStatus.replace('_', ' ')}</span>{assetType && (<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${assetTypeColors[assetType] || 'bg-brand-navy/8 text-brand-navy'}`}><i className={`${assetTypeIcons[assetType] || 'ri-tools-line'} mr-1 text-[10px]`}></i>{assetType}</span>)}</div>
              {(customerPhone || customerSipUri) && (<div className="flex items-center gap-2 pt-2 border-t border-gray-100"><div className="flex-1 min-w-0"><p className="text-xs text-gray-400">Customer</p><p className="text-sm font-medium text-gray-900 truncate">{customerName || 'Unknown'}</p></div><button onClick={callCustomer} disabled={callingCustomer} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-wait shadow-sm">{callingCustomer ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Calling...</>) : (<><span className="w-4 h-4 flex items-center justify-center"><i className="ri-phone-fill"></i></span>Call Customer</>)}</button></div>)}
            </div>
          </div>
        )}

        {/* GPS Attendance Verification */}
        <GpsCheckIn
          inspectionId={id || ''}
          checkedInAt={checkInAt}
          checkedOutAt={checkOutAt}
          checkInLat={checkInLat}
          checkInLng={checkInLng}
          checkOutLat={checkOutLat}
          checkOutLng={checkOutLng}
          onUpdate={(data) => {
            if (data.checked_in_at) setCheckInAt(data.checked_in_at);
            if (data.checked_out_at) setCheckOutAt(data.checked_out_at);
            if (data.check_in_lat !== undefined) setCheckInLat(data.check_in_lat);
            if (data.check_in_lng !== undefined) setCheckInLng(data.check_in_lng);
            if (data.check_out_lat !== undefined) setCheckOutLat(data.check_out_lat);
            if (data.check_out_lng !== undefined) setCheckOutLng(data.check_out_lng);
          }}
        />

        {/* Progress Bar */}
        {!isReadOnly && (<div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 mb-4"><div className="flex flex-col gap-3"><div className="flex items-center gap-2 sm:gap-3 flex-wrap"><div className="flex items-center gap-1.5"><div className="w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></div><span className="text-xs text-gray-600">{summary.pass}<span className="text-gray-400"> pass</span></span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 flex-shrink-0"></div><span className="text-xs text-gray-600">{summary.fail}<span className="text-gray-400"> fail</span></span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500 flex-shrink-0"></div><span className="text-xs text-gray-600">{summary.needsAttention}<span className="text-gray-400"> attn</span></span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-300 flex-shrink-0"></div><span className="text-xs text-gray-600">{summary.notApplicable}<span className="text-gray-400"> n/a</span></span></div></div><div className="flex items-center gap-3"><div className="flex-1 min-w-0"><div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-2"><div className="bg-emerald-500 h-2.5 sm:h-2 rounded-full transition-all duration-300" style={{ width: `${summary.applicable > 0 ? Math.round((summary.pass / summary.applicable) * 100) : 0}%` }}></div></div></div><span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{summary.applicable > 0 ? Math.round((summary.pass / summary.applicable) * 100) : 0}% pass</span></div></div></div>)}

        {/* AI Assistant Panel */}
        {!isReadOnly && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="w-full flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center flex-shrink-0">
                  <i className="ri-sparkling-line text-sm"></i>
                </span>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-gray-900">AI Inspection Assistant</h3>
                  <p className="text-xs text-gray-400">
                    {aiWarnings.length > 0
                      ? `${aiWarnings.filter((w) => w.severity === 'error').length} critical, ${aiWarnings.filter((w) => w.severity === 'warning').length} warnings`
                      : aiStats.completionPercent < 100
                        ? `${aiStats.completionPercent}% complete — ${aiStats.missingValues} missing values`
                        : 'All checks passed — ready to complete'}
                  </p>
                </div>
              </div>
              <span className="w-7 h-7 flex items-center justify-center text-gray-400 flex-shrink-0">
                <i className={showAiPanel ? 'ri-arrow-up-s-line text-lg' : 'ri-arrow-down-s-line text-lg'}></i>
              </span>
            </button>
            {showAiPanel && (
              <div className="border-t border-gray-50 px-4 sm:px-5 py-3">
                {aiWarnings.length > 0 ? (
                  <div className="space-y-2">
                    {aiWarnings.slice(0, 8).map((w) => (
                      <div key={w.itemId + w.message} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${w.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className={w.severity === 'error' ? 'ri-close-circle-line' : 'ri-error-warning-line'}></i>
                        </span>
                        <span>{w.message}</span>
                      </div>
                    ))}
                    {aiWarnings.length > 8 && (
                      <p className="text-xs text-gray-400 text-center">+ {aiWarnings.length - 8} more issues</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-check-line"></i></span>
                    <span>No missing fields or warnings detected. Ready to complete!</span>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-50">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{aiStats.completionPercent}%</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Complete</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600">{aiStats.fail}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600">{aiStats.attention}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Attention</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-brand-cyan">{aiStats.missingValues}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Missing Values</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grammar Toast */}
        {grammarToast && (
          <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-brand-navy text-white px-4 py-3 rounded-xl shadow-lg max-w-md w-[90%] flex items-start gap-3">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-brand-gold"><i className="ri-sparkling-line"></i></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Grammar fixed</p>
              <ul className="mt-1 space-y-0.5">
                {grammarToast.changes.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-xs text-white/70">• {c}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setGrammarToast(null)} className="w-5 h-5 flex items-center justify-center text-white/50 hover:text-white flex-shrink-0 cursor-pointer"><i className="ri-close-line"></i></button>
          </div>
        )}

        {/* Messages */}
        {error && (<div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4"><span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>{error}<button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line"></i></span></button></div>)}
        {success && (<div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-4"><span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-check-line"></i></span>{success}<button onClick={() => setSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer"><span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line"></i></span></button></div>)}
        {callError && (<div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4"><span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-phone-fill"></i></span>{callError}<button onClick={() => setCallError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line"></i></span></button></div>)}
        {callSuccess && (<div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-4"><span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><i className="ri-phone-fill"></i></span>{callSuccess}<button onClick={() => setCallSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer"><span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line"></i></span></button></div>)}

        {/* Checklist */}
        {isBatch ? (
          <div className="space-y-4">
            {batchInspections.map((bi) => {
              const isAssetCollapsed = collapsedAssets[bi.id] || false;
              const biSummary = computeChecklistSummary(bi.items);
              return (
                <div key={bi.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button onClick={() => setCollapsedAssets((prev) => ({ ...prev, [bi.id]: !isAssetCollapsed }))} className="w-full flex items-center justify-between px-4 sm:px-5 py-4 sm:py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3"><span className={`w-9 h-9 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${assetTypeColors[bi.assetType] || 'bg-gray-100 text-gray-500'}`}><i className={`${assetTypeIcons[bi.assetType] || 'ri-tools-line'}`}></i></span><div className="text-left min-w-0"><h3 className="text-sm font-semibold text-gray-900 truncate">{bi.assetName}</h3><p className="text-xs text-gray-400 truncate">{bi.assetType} · {bi.assetLocation}</p></div></div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0"><span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[bi.status] || 'bg-gray-50 text-gray-500'}`}>{bi.status.replace('_', ' ')}</span><span className="text-xs text-gray-400 hidden sm:inline">{biSummary.pass}/{biSummary.applicable} pass</span><span className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-gray-400 flex-shrink-0"><i className={isAssetCollapsed ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'}></i></span></div>
                  </button>
                  {!isAssetCollapsed && (<div className="border-t border-gray-50">{Array.from(new Set(bi.items.map((i) => i.category))).map((category) => { const catItems = bi.items.filter((i) => i.category === category); const catKey = `${bi.id}-${category}`; const isCatCollapsed = collapsedCategories[catKey] || false; return (<div key={catKey} className="border-b border-gray-50 last:border-b-0"><button onClick={() => setCollapsedCategories((prev) => ({ ...prev, [catKey]: !isCatCollapsed }))} className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-2.5 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer"><div className="flex items-center gap-2"><span className="text-xs text-gray-400"><i className="ri-folder-line"></i></span><span className="text-xs font-medium text-gray-700">{category}</span><span className="text-[10px] text-gray-400">({catItems.length})</span></div><span className="w-5 h-5 sm:w-4 sm:h-4 flex items-center justify-center text-gray-400 flex-shrink-0"><i className={isCatCollapsed ? 'ri-arrow-down-s-line text-xs' : 'ri-arrow-up-s-line text-xs'}></i></span></button>{!isCatCollapsed && (<div className="divide-y divide-gray-50">{catItems.map((item) => (<ChecklistRow key={item.id} item={item} readOnly={isReadOnly} onChange={(field, value) => handleBatchResultChange(bi.id, item.id, field, value)} onPhotoUpload={handlePhotoUpload} onLogDeficiency={openDeficiencyModal} onAnnotatePhoto={handleAnnotatePhoto} onAiSuggest={(it) => {
                              const suggestion = generateAiSuggestion({ item: it, assetType: bi.assetType, assetName: bi.assetName });
                              handleBatchResultChange(bi.id, it.id, 'notes', suggestion);
                              setAiSuggesting((prev) => ({ ...prev, [it.id]: false }));
                            }} onGrammarCheck={(it) => {
                              if (!it.result.notes) return;
                              const result = grammarCheck(it.result.notes);
                              if (result.changes.length > 0) {
                                handleBatchResultChange(bi.id, it.id, 'notes', result.cleaned);
                                setGrammarToast({ itemId: it.id, changes: result.changes });
                                setTimeout(() => setGrammarToast(null), 4000);
                              }
                            }} aiSuggesting={aiSuggesting} setAiSuggesting={setAiSuggesting} />))}</div>)}</div>); })}</div>)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(new Set(items.map((i) => i.category))).map((category) => { const catItems = items.filter((i) => i.category === category); const isCollapsed = collapsedCategories[category] || false; return (<div key={category} className="bg-white rounded-xl border border-gray-100 overflow-hidden"><button onClick={() => setCollapsedCategories((prev) => ({ ...prev, [category]: !isCollapsed }))} className="w-full flex items-center justify-between px-4 sm:px-5 py-4 sm:py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"><div className="flex items-center gap-2 sm:gap-3"><span className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${category.includes('Visual') || category.includes('Condition') ? 'bg-brand-cyan/10 text-brand-cyan' : category.includes('System') || category.includes('Component') ? 'bg-brand-navy/8 text-brand-navy' : category.includes('Document') || category.includes('Label') ? 'bg-brand-gold/15 text-brand-gold' : category.includes('Environment') || category.includes('Temp') ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}><i className="ri-list-check-2 text-sm"></i></span><div className="text-left"><h3 className="text-sm font-semibold text-gray-900">{category}</h3><p className="text-xs text-gray-400">{catItems.length} items</p></div></div><span className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-gray-400 flex-shrink-0"><i className={isCollapsed ? 'ri-arrow-down-s-line text-lg' : 'ri-arrow-up-s-line text-lg'}></i></span></button>{!isCollapsed && (<div className="divide-y divide-gray-50">{catItems.map((item) => (<ChecklistRow key={item.id} item={item} readOnly={isReadOnly} onChange={(field, value) => handleResultChange(item.id, field, value)} onPhotoUpload={handlePhotoUpload} onLogDeficiency={openDeficiencyModal} onAnnotatePhoto={handleAnnotatePhoto} onAiSuggest={(it) => {
                              const suggestion = generateAiSuggestion({ item: it, assetType, assetName });
                              handleResultChange(it.id, 'notes', suggestion);
                              setAiSuggesting((prev) => ({ ...prev, [it.id]: false }));
                            }} onGrammarCheck={(it) => {
                              if (!it.result.notes) return;
                              const result = grammarCheck(it.result.notes);
                              if (result.changes.length > 0) {
                                handleResultChange(it.id, 'notes', result.cleaned);
                                setGrammarToast({ itemId: it.id, changes: result.changes });
                                setTimeout(() => setGrammarToast(null), 4000);
                              }
                            }} aiSuggesting={aiSuggesting} setAiSuggesting={setAiSuggesting} />))}</div>)}</div>); })}
          </div>
        )}

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pb-8 safe-bottom">
            <button onClick={handleSave} disabled={saving} className="w-full sm:flex-1 sm:flex-none px-6 py-3.5 sm:py-3 rounded-xl sm:rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">{saving ? (<span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>Saving...</span>) : (<span className="flex items-center gap-2 justify-center"><i className="ri-save-line"></i>Save Checklist</span>)}</button>
            <button onClick={handleComplete} disabled={completing || summary.applicable === 0} className="w-full px-6 py-3.5 sm:py-3 rounded-xl sm:rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">{completing ? (<span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Completing...</span>) : (<span className="flex items-center gap-2 justify-center"><i className="ri-check-double-line"></i>Complete {isBatch ? `All (${batchInspections.length})` : 'Inspection'}</span>)}</button>
          </div>
        )}
        {isReadOnly && (<div className="flex gap-3 mt-6 pb-8"><button onClick={() => navigate(`/inspections/${id}`)} className="px-6 py-3 rounded-lg bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5"></i>Back to Details</button></div>)}
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{signatureStep === 'tech' ? 'Technician Signature' : 'Customer Signature'}</h3>
              <button onClick={() => { setShowSignatureModal(false); setSignatureStep('tech'); }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"><i className="ri-close-line"></i></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-500 mb-3">Please sign in the box below using your mouse or finger.</p>
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={signatureStep === 'tech' ? techCanvasRef : customerCanvasRef}
                  width={400}
                  height={150}
                  className="w-full h-[150px] cursor-crosshair"
                  onMouseDown={(e) => { const ctx = (signatureStep === 'tech' ? techCanvasRef : customerCanvasRef).current?.getContext('2d'); if (!ctx) return; ctx.beginPath(); const r = e.currentTarget.getBoundingClientRect(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); const setter = signatureStep === 'tech' ? () => { techDrawing.current = true; } : () => { customerDrawing.current = true; }; setter(); }}
                  onMouseMove={(e) => { const drawing = signatureStep === 'tech' ? techDrawing.current : customerDrawing.current; const canvas = signatureStep === 'tech' ? techCanvasRef : customerCanvasRef; if (!drawing || !canvas.current) return; const ctx = canvas.current.getContext('2d'); if (!ctx) return; ctx.strokeStyle = '#0a1628'; ctx.lineWidth = 2; ctx.lineCap = 'round'; const r = e.currentTarget.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); }}
                  onMouseUp={() => { if (signatureStep === 'tech') techDrawing.current = false; else customerDrawing.current = false; }}
                  onMouseLeave={() => { if (signatureStep === 'tech') techDrawing.current = false; else customerDrawing.current = false; }}
                  onTouchStart={(e) => { const ctx = (signatureStep === 'tech' ? techCanvasRef : customerCanvasRef).current?.getContext('2d'); if (!ctx) return; ctx.beginPath(); const r = e.currentTarget.getBoundingClientRect(); const t = e.touches[0]; ctx.moveTo(t.clientX - r.left, t.clientY - r.top); if (signatureStep === 'tech') techDrawing.current = true; else customerDrawing.current = true; e.preventDefault(); }}
                  onTouchMove={(e) => { const drawing = signatureStep === 'tech' ? techDrawing.current : customerDrawing.current; const canvas = signatureStep === 'tech' ? techCanvasRef : customerCanvasRef; if (!drawing || !canvas.current) return; const ctx = canvas.current.getContext('2d'); if (!ctx) return; ctx.strokeStyle = '#0a1628'; ctx.lineWidth = 2; ctx.lineCap = 'round'; const r = e.currentTarget.getBoundingClientRect(); const t = e.touches[0]; ctx.lineTo(t.clientX - r.left, t.clientY - r.top); ctx.stroke(); e.preventDefault(); }}
                  onTouchEnd={() => { if (signatureStep === 'tech') techDrawing.current = false; else customerDrawing.current = false; }}
                />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => clearSignature(signatureStep as 'tech' | 'customer')} className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><i className="ri-eraser-line mr-1"></i>Clear</button>
                <button onClick={() => finalizeSignature(signatureStep as 'tech' | 'customer')} className="ml-auto px-5 py-2 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors cursor-pointer">{signatureStep === 'tech' ? 'Next: Customer' : 'Done'}</button>
              </div>
              {signatureStep === 'customer' && <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400"><span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0"><i className="ri-check-line"></i></span>Technician signature captured. Now collect customer signature.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Deficiency Modal */}
      {showDeficiencyModal && deficiencyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Log Deficiency</h3>
              <button onClick={() => setShowDeficiencyModal(false)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"><i className="ri-close-line"></i></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Checklist Item</p>
                <p className="text-sm font-medium text-gray-900">{deficiencyItem.description}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Severity</label>
                <select value={deficiencyForm.severity} onChange={(e) => setDeficiencyForm((f) => ({ ...f, severity: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 cursor-pointer">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <textarea value={deficiencyForm.description} onChange={(e) => setDeficiencyForm((f) => ({ ...f, description: e.target.value }))} rows={3} maxLength={500} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none" />
                <p className="text-xs text-gray-400 mt-0.5 text-right">{deficiencyForm.description.length}/500</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Corrective Action</label>
                <input value={deficiencyForm.corrective_action} onChange={(e) => setDeficiencyForm((f) => ({ ...f, corrective_action: e.target.value }))} placeholder="What needs to be done to fix this?" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Estimated Cost ($)</label>
                <input value={deficiencyForm.estimated_cost} onChange={(e) => setDeficiencyForm((f) => ({ ...f, estimated_cost: e.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setShowDeficiencyModal(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
                <button onClick={createDeficiency} disabled={creatingDeficiency} className="ml-auto px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50">{creatingDeficiency ? 'Creating...' : 'Log Deficiency'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Annotator Modal */}
      {annotatePhoto && (
        <PhotoAnnotator
          imageUrl={annotatePhoto.photoUrl}
          onSave={handleAnnotateSave}
          onClose={() => setAnnotatePhoto(null)}
        />
      )}
    </DashboardLayout>
  );
}

/* ─── Checklist Row Component ─── */
function ChecklistRow({
  item, readOnly, onChange, onPhotoUpload, onLogDeficiency, onAiSuggest, onGrammarCheck, aiSuggesting, setAiSuggesting, onAnnotatePhoto,
}: { item: ChecklistItem; readOnly: boolean; onChange: (field: keyof ChecklistResult, value: any) => void; onPhotoUpload?: (itemId: string, file: File) => void; onLogDeficiency?: (item: ChecklistItem) => void; onAiSuggest?: (item: ChecklistItem) => void; onGrammarCheck?: (item: ChecklistItem) => void; onAnnotatePhoto?: (itemId: string, photoUrl: string) => void; aiSuggesting: Record<string, boolean>; setAiSuggesting: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; }) {
  const result = item.result;
  const showFailReason = result.status === 'fail' && item.fail_reasons && item.fail_reasons.length > 0;
  const showNumInput = (item.type === 'numeric' || item.type === 'pressure');
  const resultColor = result.status === 'pass' ? 'text-emerald-600 bg-emerald-50' : result.status === 'fail' ? 'text-red-500 bg-red-50' : result.status === 'needs_attention' ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-100';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSuggesting = aiSuggesting[item.id] || false;
  const { isListening, isSupported: voiceSupported, transcript, error: voiceError, startListening, stopListening } = useVoiceToText();

  // When voice transcript arrives, append to notes
  useEffect(() => {
    if (transcript && !isListening) {
      const currentNotes = item.result.notes || '';
      const newNotes = currentNotes ? `${currentNotes} ${transcript}` : transcript;
      onChange('notes', newNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening]);

  // Missing field warning indicator
  const hasMissingValue = (item.type === 'numeric' || item.type === 'pressure') && result.status !== 'not_applicable' && (result.value === undefined || result.value === null);
  const hasMissingFailReason = result.status === 'fail' && item.fail_reasons && item.fail_reasons.length > 0 && !result.fail_reason;
  const needsMoreNotes = (result.status === 'fail' || result.status === 'needs_attention') && (!result.notes || result.notes.trim().length < 10);

  return (
    <div className={`px-4 sm:px-5 py-4 sm:py-3.5 ${readOnly ? 'opacity-100' : ''} ${hasMissingValue || hasMissingFailReason ? 'bg-red-50/40' : needsMoreNotes ? 'bg-amber-50/30' : ''}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        <span className={`w-7 h-7 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold ${resultColor}`}>{item.id.split('-')[1]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-sm text-gray-900 leading-snug">{item.description}</p>
          {item.unit && !showNumInput && (<span className="text-[11px] text-gray-400 mt-0.5 inline-block">{item.unit}</span>)}
          {/* AI warning badges */}
          {!readOnly && (
            <div className="flex flex-wrap gap-1 mt-1">
              {hasMissingValue && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">
                  <i className="ri-close-circle-line"></i> Missing value
                </span>
              )}
              {hasMissingFailReason && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">
                  <i className="ri-close-circle-line"></i> Select deficiency type
                </span>
              )}
              {needsMoreNotes && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-600">
                  <i className="ri-error-warning-line"></i> Add detailed notes
                </span>
              )}
            </div>
          )}
        </div>
        {!readOnly && (<button type="button" onClick={() => { const ta = document.getElementById(`note-${item.id}`); if (ta) { ta.classList.toggle('hidden'); if (!ta.classList.contains('hidden')) { (ta as HTMLTextAreaElement).focus(); } } }} className={`hidden sm:flex w-7 h-7 rounded-md items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${result.notes ? 'text-brand-gold bg-brand-gold/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} title="Add note"><i className="ri-chat-3-line text-xs"></i></button>)}
      </div>

      {!readOnly && (
        <div className="mt-3 sm:mt-2 ml-0 sm:ml-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-1.5">
          {showNumInput && (<div className="flex items-center gap-1.5"><input type="number" min={item.min} max={item.max} step={item.type === 'pressure' ? 1 : 0.1} value={result.value ?? ''} onChange={(e) => onChange('value', e.target.value === '' ? undefined : Number(e.target.value))} disabled={result.status === 'not_applicable'} placeholder="—" className={`w-full sm:w-20 px-3 py-2.5 sm:py-1.5 rounded-lg border text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all disabled:bg-gray-50 disabled:text-gray-400 ${hasMissingValue ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200'}`} />{item.unit && <span className="text-xs text-gray-400 whitespace-nowrap">{item.unit}</span>}</div>)}
          <div className="flex items-center gap-1.5 sm:gap-0.5 bg-gray-100 rounded-xl sm:rounded-lg p-1 sm:p-0.5 self-start">
            {(['pass', 'fail', 'needs_attention', 'not_applicable'] as const).map((s) => { const isActive = result.status === s; const label = s === 'pass' ? <i className="ri-check-line text-base sm:text-xs"></i> : s === 'fail' ? <i className="ri-close-line text-base sm:text-xs"></i> : s === 'needs_attention' ? <i className="ri-error-warning-line text-base sm:text-xs"></i> : <i className="ri-subtract-line text-base sm:text-xs"></i>; return (<button key={s} type="button" onClick={() => onChange('status', s)} title={s === 'needs_attention' ? 'Needs Attention' : s === 'not_applicable' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)} className={`w-11 h-10 sm:w-8 sm:h-7 flex items-center justify-center rounded-lg sm:rounded-md transition-all cursor-pointer ${isActive ? 'bg-white shadow-sm ' + (s === 'pass' ? 'text-emerald-600' : s === 'fail' ? 'text-red-500' : s === 'needs_attention' ? 'text-amber-600' : 'text-gray-500') : 'text-gray-400 hover:text-gray-600'}`}>{label}</button>); })}
          </div>
          {onPhotoUpload && (<><input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onPhotoUpload(item.id, file); if (fileInputRef.current) fileInputRef.current.value = ''; }} /><button type="button" onClick={() => fileInputRef.current?.click()} className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${result.photo_urls && result.photo_urls.length > 0 ? 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20' : 'text-gray-400 border-gray-200 hover:text-gray-600 hover:bg-gray-50'}`} title="Add photo"><i className="ri-camera-line"></i><span className="text-xs">{result.photo_urls?.length || 0}</span></button></>)}
          <button type="button" onClick={() => { const ta = document.getElementById(`note-${item.id}`); if (ta) { ta.classList.toggle('hidden'); if (!ta.classList.contains('hidden')) { (ta as HTMLTextAreaElement).focus(); } } }} className={`sm:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer text-sm ${result.notes ? 'text-brand-gold bg-brand-gold/10 border-brand-gold/20' : 'text-gray-400 border-gray-200 hover:text-gray-600 hover:bg-gray-50'}`}><i className="ri-chat-3-line"></i><span>Note</span></button>
        </div>
      )}

      {result.status === 'fail' && !readOnly && onLogDeficiency && (<div className="mt-2.5 ml-0 sm:ml-10"><button onClick={() => onLogDeficiency(item)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer"><i className="ri-add-circle-line"></i>Log Deficiency</button></div>)}

      {result.photo_urls && result.photo_urls.length > 0 && (<div className="mt-2.5 ml-0 sm:ml-10 flex gap-2 overflow-x-auto pb-1">{result.photo_urls.map((url, idx) => (<button key={idx} onClick={() => onAnnotatePhoto?.(item.id, url)} title="Click to annotate" className="relative flex-shrink-0 w-16 h-16 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-red-400 bg-gray-50 transition-colors cursor-pointer group"><img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" /><span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"><span className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"><i className="ri-edit-line mr-0.5"></i>Annotate</span></span></button>))}</div>)}

      {showFailReason && !readOnly && (<div className="mt-2.5 ml-0 sm:ml-10"><select value={result.fail_reason || ''} onChange={(e) => onChange('fail_reason', e.target.value as FailReason)} className={`w-full max-w-full sm:max-w-xs px-3 py-2.5 sm:py-1.5 rounded-lg border bg-red-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all cursor-pointer ${hasMissingFailReason ? 'border-red-400' : 'border-red-200 text-red-700'}`}><option value="">Select deficiency type...</option>{item.fail_reasons!.map((fr) => (<option key={fr} value={fr}>{FAIL_REASON_LABELS[fr]}</option>))}</select></div>)}

      <div className={`mt-2.5 ml-0 sm:ml-10 ${result.notes || isListening ? '' : 'hidden'}`} id={`note-${item.id}`}>
        <div className="relative">
          <textarea value={isListening ? transcript || result.notes || '' : result.notes || ''} onChange={(e) => onChange('notes', e.target.value)} disabled={readOnly || isListening} placeholder={isListening ? 'Listening... speak now' : 'Add note for this item...'} maxLength={300} rows={2} className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all resize-none disabled:bg-gray-50 disabled:text-gray-400 pr-20" />
          {isListening && (
            <div className="absolute left-3 bottom-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] text-red-500 font-medium">REC</span>
            </div>
          )}
          {voiceError && !isListening && (
            <div className="absolute left-3 bottom-2">
              <span className="text-[10px] text-red-400">{voiceError}</span>
            </div>
          )}
          {!readOnly && (
            <div className="absolute right-1.5 top-1.5 flex gap-1">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }}
                  title={isListening ? 'Stop recording' : 'Voice input'}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  }`}
                >
                  <i className={isListening ? 'ri-stop-fill text-xs' : 'ri-mic-line text-xs'}></i>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!onAiSuggest) return;
                  setAiSuggesting((prev) => ({ ...prev, [item.id]: true }));
                  setTimeout(() => onAiSuggest(item), 400);
                }}
                disabled={isSuggesting}
                title="AI Suggest Note"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSuggesting ? <span className="w-3 h-3 border border-brand-gold/30 border-t-brand-gold rounded-full animate-spin"></span> : <i className="ri-sparkling-line text-xs"></i>}
              </button>
              <button
                type="button"
                onClick={() => onGrammarCheck?.(item)}
                disabled={!result.notes}
                title="Grammar Check"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-brand-navy/5 text-brand-navy hover:bg-brand-navy/10 transition-colors cursor-pointer disabled:opacity-30"
              >
                <i className="ri-check-double-line text-xs"></i>
              </button>
            </div>
          )}
        </div>
        {result.notes && (<p className="text-xs text-gray-400 mt-1 text-right">{result.notes.length}/300</p>)}
      </div>
    </div>
  );
}

/* ─── Findings generators ─── */
function generateFindings(items: ChecklistItem[], summary: ReturnType<typeof computeChecklistSummary>): string {
  const applicableItems = items.filter((i) => i.result.status !== 'not_applicable');
  const failedItems = applicableItems.filter((i) => i.result.status === 'fail');
  const attentionItems = applicableItems.filter((i) => i.result.status === 'needs_attention');
  const passedItems = applicableItems.filter((i) => i.result.status === 'pass');
  const lines: string[] = [];
  lines.push('═══ DOUSEFIRE INSPECTION FINDINGS ═══');
  lines.push(`Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  lines.push(''); lines.push('EXECUTIVE SUMMARY');
  lines.push(`Total items inspected: ${summary.applicable}`);
  lines.push(`Passed: ${summary.pass}  |  Failed: ${summary.fail}  |  Needs Attention: ${summary.needsAttention}`);
  lines.push(`Overall Pass Rate: ${summary.passRate}%`); lines.push('');
  const rating = checklistToOverallRating(summary);
  if (rating === 'pass') lines.push('OVERALL ASSESSMENT: PASS');
  else if (rating === 'fail') lines.push('OVERALL ASSESSMENT: FAIL — Critical deficiencies identified.');
  else if (rating === 'needs_attention') lines.push('OVERALL ASSESSMENT: NEEDS ATTENTION');
  lines.push('');
  return formatFindingDetails(lines, failedItems, attentionItems, passedItems);
}

function generateBatchFindings(batchInspections: BatchInspection[], summary: ReturnType<typeof computeChecklistSummary>): string {
  const lines: string[] = [];
  lines.push('═══ DOUSEFIRE BATCH INSPECTION FINDINGS ═══');
  lines.push(`Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  lines.push(`Assets Inspected: ${batchInspections.length}`); lines.push('');
  lines.push('EXECUTIVE SUMMARY'); lines.push(`Total items inspected: ${summary.applicable}`);
  lines.push(`Passed: ${summary.pass}  |  Failed: ${summary.fail}  |  Needs Attention: ${summary.needsAttention}`);
  lines.push(`Overall Pass Rate: ${summary.passRate}%`); lines.push('');
  const rating = checklistToOverallRating(summary);
  if (rating === 'pass') lines.push('OVERALL ASSESSMENT: PASS');
  else if (rating === 'fail') lines.push('OVERALL ASSESSMENT: FAIL');
  else if (rating === 'needs_attention') lines.push('OVERALL ASSESSMENT: NEEDS ATTENTION');
  lines.push('');
  batchInspections.forEach((bi) => {
    const biSummary = computeChecklistSummary(bi.items);
    if (biSummary.applicable === 0) return;
    lines.push(`━━━ ${bi.assetName} (${bi.assetType}) ━━━`);
    lines.push(`  Pass: ${biSummary.pass} | Fail: ${biSummary.fail} | Attention: ${biSummary.needsAttention}`); lines.push('');
    const applicableItems = bi.items.filter((i) => i.result.status !== 'not_applicable');
    const failedItems = applicableItems.filter((i) => i.result.status === 'fail');
    if (failedItems.length > 0) { lines.push(`  DEFICIENCIES:`); failedItems.forEach((item) => { const reason = item.result.fail_reason ? FAIL_REASON_LABELS[item.result.fail_reason] : 'Unspecified'; lines.push(`    ✗ ${item.description} — ${reason}`); }); lines.push(''); }
  });
  lines.push('─── END OF BATCH INSPECTION FINDINGS ───');
  return lines.join('\n');
}

function formatFindingDetails(lines: string[], failedItems: ChecklistItem[], attentionItems: ChecklistItem[], passedItems: ChecklistItem[]): string {
  if (passedItems.length > 0) { lines.push(`PASSED ITEMS (${passedItems.length}): All passed.`); lines.push(''); }
  if (failedItems.length > 0) { lines.push(`DEFICIENCIES:`); failedItems.forEach((item) => { const reason = item.result.fail_reason ? FAIL_REASON_LABELS[item.result.fail_reason] : 'Unspecified'; lines.push(`  ✗ ${item.description} — ${reason}`); }); lines.push(''); }
  if (attentionItems.length > 0) { lines.push(`NEEDS ATTENTION:`); attentionItems.forEach((item) => lines.push(`  ⚠ ${item.description}`)); lines.push(''); }
  lines.push('─── END OF INSPECTION FINDINGS ───');
  return lines.join('\n');
}