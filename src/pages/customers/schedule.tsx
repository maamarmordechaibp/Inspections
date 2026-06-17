import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

interface Asset {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  serialNumber: string;
  lastInspected: string;
  nextDue: string;
  manufacturer: string;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
  city: string | null;
  state: string | null;
}

interface SelectableAsset extends Asset {
  selected: boolean;
  dueStatus: 'overdue' | 'due_soon' | 'upcoming' | 'ok';
}

const INSPECTION_TYPES = [
  'Monthly Check',
  'Quarterly Test',
  'Semi-Annual',
  'Annual Inspection',
  'Annual Test',
];

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
  Sprinkler: 'bg-sky-50 text-sky-600',
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

const assetTypeInterval: Record<string, { label: string; inspectionType: string }> = {
  Extinguisher: { label: 'Monthly', inspectionType: 'Monthly Check' },
  'Fire Pump': { label: 'Monthly', inspectionType: 'Monthly Check' },
  'Emergency Lighting': { label: 'Monthly', inspectionType: 'Monthly Check' },
  Sprinkler: { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  Hydrant: { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  'Kitchen Suppression': { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  'Smoke Control': { label: 'Semi-Annual', inspectionType: 'Semi-Annual' },
  Alarm: { label: 'Annual', inspectionType: 'Annual Inspection' },
  Hose: { label: 'Annual', inspectionType: 'Annual Inspection' },
  'Backflow Preventer': { label: 'Annual', inspectionType: 'Annual Inspection' },
  'Elevator Recall': { label: 'Annual', inspectionType: 'Annual Inspection' },
  'Monitoring System': { label: 'Annual', inspectionType: 'Annual Inspection' },
};

function getDueStatus(nextDue: string): SelectableAsset['dueStatus'] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'due_soon';
  if (diffDays <= 90) return 'upcoming';
  return 'ok';
}

export default function ScheduleInspectionPage() {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectId = searchParams.get('preSelect');
  const { user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [assets, setAssets] = useState<SelectableAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [inspectionType, setInspectionType] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Manual add state
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualAssetName, setManualAssetName] = useState('');
  const [manualAssetType, setManualAssetType] = useState('');
  const [manualAssetLocation, setManualAssetLocation] = useState('');
  const [manualSerialNumber, setManualSerialNumber] = useState('');
  const [manualManufacturer, setManualManufacturer] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ name: string; type: string; location: string; serialNumber: string; manufacturer: string }>>([]);

  // Track whether user manually picked an inspection type (so we don't override their choice)
  const userPickedType = useRef(false);

  // Auto-suggest inspection type based on selected assets
  useEffect(() => {
    const selectedAssets = assets.filter((a) => a.selected);
    if (selectedAssets.length === 0) {
      if (!userPickedType.current) setInspectionType('');
      return;
    }
    if (userPickedType.current) return;

    // Count which inspection type is most common among selected assets
    const typeCounts: Record<string, number> = {};
    selectedAssets.forEach((a) => {
      const match = assetTypeInterval[a.type];
      if (match) {
        typeCounts[match.inspectionType] = (typeCounts[match.inspectionType] || 0) + 1;
      }
    });

    let bestType = '';
    let bestCount = 0;
    for (const [itype, count] of Object.entries(typeCounts)) {
      if (count > bestCount) {
        bestType = itype;
        bestCount = count;
      }
    }

    if (bestType && bestType !== inspectionType) {
      setInspectionType(bestType);
    }
  }, [assets]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load customer
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('id, name, company, city, state')
        .eq('id', customerId)
        .maybeSingle();

      if (custErr) throw custErr;

      if (custData) {
        setCustomer(custData as Customer);
      } else {
        const { mockCustomers } = await import('@/mocks/customers');
        const found = mockCustomers.find((c: any) => c.id === customerId);
        if (found) setCustomer(found as Customer);
      }

      // Load customer assets
      const assetList: Asset[] = [];
      try {
        const { data: assetData } = await supabase
          .from('assets')
          .select('id, name, type, location, status, serial_number, last_inspected, next_due, manufacturer')
          .eq('customer_id', customerId)
          .order('type')
          .order('name');

        if (assetData && assetData.length > 0) {
          assetData.forEach((a: any) => {
            assetList.push({
              id: a.id,
              name: a.name,
              type: a.type,
              location: a.location,
              status: a.status,
              serialNumber: a.serial_number || '',
              lastInspected: a.last_inspected || '',
              nextDue: a.next_due || '',
              manufacturer: a.manufacturer || '',
            });
          });
        }
      } catch {
        // fallback to mock
      }

      // If no Supabase data, use mock
      if (assetList.length === 0) {
        const { mockAssets } = await import('@/mocks/assets');
        mockAssets
          .filter((a: any) => a.customerId === customerId)
          .forEach((a: any) => {
            assetList.push({
              id: a.id,
              name: a.name,
              type: a.type,
              location: a.location,
              status: a.status,
              serialNumber: a.serialNumber || '',
              lastInspected: a.lastInspected || '',
              nextDue: a.nextDue || '',
              manufacturer: a.manufacturer || '',
            });
          });
      }

      // Convert to selectable assets with auto-selection
      const selectable: SelectableAsset[] = assetList.map((a) => {
        const dueStatus = getDueStatus(a.nextDue);
        return {
          ...a,
          selected: a.id === preSelectId || dueStatus === 'overdue' || dueStatus === 'due_soon',
          dueStatus,
        };
      });

      setAssets(selectable);
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
    } catch {
      const { mockCustomers } = await import('@/mocks/customers');
      const { mockAssets } = await import('@/mocks/assets');
      const found = mockCustomers.find((c: any) => c.id === customerId);
      if (found) setCustomer(found as Customer);

      const assetList: Asset[] = [];
      mockAssets
        .filter((a: any) => a.customerId === customerId)
        .forEach((a: any) => {
          assetList.push({
            id: a.id,
            name: a.name,
            type: a.type,
            location: a.location,
            status: a.status,
            serialNumber: a.serialNumber || '',
            lastInspected: a.lastInspected || '',
            nextDue: a.nextDue || '',
            manufacturer: a.manufacturer || '',
          });
        });

      const selectable: SelectableAsset[] = assetList.map((a) => {
        const dueStatus = getDueStatus(a.nextDue);
        return {
          ...a,
          selected: a.id === preSelectId || dueStatus === 'overdue' || dueStatus === 'due_soon',
          dueStatus,
        };
      });

      setAssets(selectable);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
    } finally {
      setLoading(false);
    }
  }, [customerId, preSelectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleAsset = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, selected: !a.selected } : a))
    );
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setAssets((prev) => prev.map((a) => ({ ...a, selected: newSelectAll })));
  };

  const selectedCount = assets.filter((a) => a.selected).length;
  const overdueCount = assets.filter((a) => a.dueStatus === 'overdue').length;
  const dueSoonCount = assets.filter((a) => a.dueStatus === 'due_soon').length;
  const recommendedCount = assets.filter((a) => a.dueStatus === 'overdue' || a.dueStatus === 'due_soon').length;

  const addManualItem = () => {
    if (!manualAssetName.trim()) return;
    setManualItems((prev) => [
      ...prev,
      { name: manualAssetName.trim(), type: manualAssetType || 'Other', location: manualAssetLocation.trim(), serialNumber: manualSerialNumber || '', manufacturer: manualManufacturer || '' },
    ]);
    setManualAssetName('');
    setManualAssetType('');
    setManualAssetLocation('');
    setManualSerialNumber('');
    setManualManufacturer('');
  };

  const removeManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    const selectedAssets = assets.filter((a) => a.selected);
    if (selectedAssets.length === 0 && manualItems.length === 0) {
      setError('Please select at least one asset or add a manual item.');
      return;
    }
    if (!inspectionType) {
      setError('Please select an inspection type.');
      return;
    }
    if (!scheduledDate) {
      setError('Please select a scheduled date.');
      return;
    }

    setSubmitting(true);

    const batchId = crypto.randomUUID();

    try {
      // First, create asset records for manual items
      const newAssetIds: string[] = [];
      for (const item of manualItems) {
        const assetId = crypto.randomUUID();
        newAssetIds.push(assetId);

        const assetPayload: Record<string, any> = {
          id: assetId,
          customer_id: customerId,
          name: item.name,
          type: item.type,
          location: item.location,
          serial_number: item.serialNumber || null,
          manufacturer: item.manufacturer || null,
          status: 'active',
          next_due: new Date(scheduledDate).toISOString(),
        };

        const { error: assetErr } = await supabase.from('assets').insert(assetPayload);
        if (assetErr) throw assetErr;
      }

      // Create inspection for each selected asset
      for (const asset of selectedAssets) {
        const payload: Record<string, any> = {
          asset_id: asset.id,
          customer_id: customerId,
          inspector_id: user?.id || null,
          scheduled_date: new Date(scheduledDate).toISOString(),
          status: 'scheduled',
          inspection_type: inspectionType,
          batch_id: batchId,
        };

        const { error: insertErr } = await supabase.from('inspections').insert(payload);
        if (insertErr) throw insertErr;
      }

      // Create inspection for each new manual asset
      for (const assetId of newAssetIds) {
        const payload: Record<string, any> = {
          asset_id: assetId,
          customer_id: customerId,
          inspector_id: user?.id || null,
          scheduled_date: new Date(scheduledDate).toISOString(),
          status: 'scheduled',
          inspection_type: inspectionType,
          batch_id: batchId,
        };

        const { error: insertErr } = await supabase.from('inspections').insert(payload);
        if (insertErr) throw insertErr;
      }

      const totalCreated = selectedAssets.length + newAssetIds.length;
      setSuccess(`Created ${totalCreated} inspection${totalCreated !== 1 ? 's' : ''}${newAssetIds.length > 0 ? ` (+${newAssetIds.length} new asset${newAssetIds.length !== 1 ? 's' : ''})` : ''} successfully!`);
      setTimeout(() => navigate(`/customers/${customerId}`), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create inspections.');
    } finally {
      setSubmitting(false);
    }
  };

  // Group assets by type for display
  const groupedAssets: Record<string, SelectableAsset[]> = {};
  assets.forEach((a) => {
    if (!groupedAssets[a.type]) groupedAssets[a.type] = [];
    groupedAssets[a.type].push(a);
  });

  const dueStatusBadge = (status: SelectableAsset['dueStatus']) => {
    switch (status) {
      case 'overdue':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">Overdue</span>;
      case 'due_soon':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">Due soon</span>;
      case 'upcoming':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-600">Upcoming</span>;
      default:
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400">OK</span>;
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
          <h2 className="text-lg font-semibold text-gray-900">Customer Not Found</h2>
          <button onClick={() => navigate('/customers')} className="mt-4 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap">
            Back to Customers
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/customers')} className="text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer">
            <i className="ri-arrow-left-line mr-1"></i> Customers
          </button>
          <span className="text-gray-300">/</span>
          <button onClick={() => navigate(`/customers/${customerId}`)} className="text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer">
            {customer.name}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">Schedule</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Schedule Inspection — {customer.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {customer.company && <>{customer.company} · </>}
                {[customer.city, customer.state].filter(Boolean).join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Available Assets</p>
                <p className="text-lg font-bold text-gray-900">{assets.length}</p>
              </div>
              {recommendedCount > 0 && (
                <div className="bg-amber-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-amber-600 uppercase tracking-wider font-medium">Recommended</p>
                  <p className="text-lg font-bold text-amber-700">{recommendedCount}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line"></i>
            </span>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
              <span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line"></i></span>
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-line"></i>
            </span>
            {success}
          </div>
        )}

        {/* Selection Controls */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {selectAll ? (
                  <><span className="w-4 h-4 flex items-center justify-center"><i className="ri-checkbox-indeterminate-line"></i></span> Deselect All</>
                ) : (
                  <><span className="w-4 h-4 flex items-center justify-center"><i className="ri-checkbox-line"></i></span> Select All</>
                )}
              </button>
              <span className="text-sm text-gray-500">
                <strong className="text-gray-900">{selectedCount}</strong> of {assets.length} selected
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Overdue ({overdueCount})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Due Soon ({dueSoonCount})</span>
              <span className="text-gray-400">| Auto-selected: overdue & due within 30 days</span>
            </div>
          </div>

          {/* Inspection config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Type <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INSPECTION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setInspectionType(type); userPickedType.current = true; }}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      inspectionType === type
                        ? 'border-brand-gold bg-brand-gold/5 text-brand-gold'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
              />
            </div>
          </div>
        </div>

        {/* Asset List - Grouped by Type */}
        {Object.keys(groupedAssets).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <span className="w-16 h-16 flex items-center justify-center mx-auto mb-4 text-gray-300">
              <i className="ri-tools-line text-4xl"></i>
            </span>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No assets linked to this customer</h3>
            <p className="text-sm text-gray-500 mb-4">This customer has no assets in the system yet. You can still manually add inspection items below.</p>
            <button
              onClick={() => setShowManualAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line"></i></span>
              Add Manual Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedAssets).map(([type, typeAssets]) => (
              <div key={type} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${assetTypeColors[type] || 'bg-gray-100 text-gray-500'}`}>
                      <i className={`${assetTypeIcons[type] || 'ri-tools-line'} text-sm`}></i>
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{type}</h3>
                      <p className="text-xs text-gray-400">
                        {typeAssets.length} asset{typeAssets.length !== 1 ? 's' : ''}
                        <span className="mx-1.5 text-gray-200">·</span>
                        <span className="font-medium text-gray-500">{assetTypeInterval[type]?.label || ''}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {typeAssets.filter((a) => a.selected).length} selected
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {typeAssets.map((asset) => (
                    <label
                      key={asset.id}
                      className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors hover:bg-gray-50/50 ${
                        asset.selected ? 'bg-brand-gold/[0.03]' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={asset.selected}
                        onChange={() => toggleAsset(asset.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold/20 cursor-pointer flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">
                            {assetTypeInterval[asset.type]?.label || 'N/A'}
                          </span>
                          {asset.status === 'maintenance' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 flex-shrink-0">Maint.</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{asset.location}</span>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400 truncate">{asset.manufacturer}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-gray-400 uppercase">Last</p>
                          <p className="text-xs text-gray-600">
                            {asset.lastInspected ? new Date(asset.lastInspected).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-gray-400 uppercase">Next Due</p>
                          <p className={`text-xs font-medium ${
                            asset.dueStatus === 'overdue' ? 'text-red-600' :
                            asset.dueStatus === 'due_soon' ? 'text-amber-600' :
                            'text-gray-600'
                          }`}>
                            {asset.nextDue ? new Date(asset.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </p>
                        </div>
                        {dueStatusBadge(asset.dueStatus)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual Add Section */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowManualAdd(!showManualAdd)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                <i className="ri-add-line"></i>
              </span>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Additional Manual Items</h3>
                <p className="text-xs text-gray-400">Add items not linked to this customer's asset list</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">
              {manualItems.length > 0 && `${manualItems.length} added`}
              {showManualAdd ? (
                <i className="ri-arrow-up-s-line ml-1"></i>
              ) : (
                <i className="ri-arrow-down-s-line ml-1"></i>
              )}
            </span>
          </button>

          {showManualAdd && (
            <div className="px-5 pb-5 border-t border-gray-50">
              {/* Existing manual items */}
              {manualItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="w-7 h-7 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        <i className="ri-tools-line"></i>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.type}{item.location ? ` · ${item.location}` : ''}
                          {item.serialNumber ? ` · S/N: ${item.serialNumber}` : ''}
                          {item.manufacturer ? ` · ${item.manufacturer}` : ''}
                        </p>
                      </div>
                      <button onClick={() => removeManualItem(idx)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer">
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={manualAssetName}
                    onChange={(e) => setManualAssetName(e.target.value)}
                    placeholder="Asset name..."
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualItem(); } }}
                  />
                  <input
                    type="text"
                    value={manualAssetType}
                    onChange={(e) => setManualAssetType(e.target.value)}
                    placeholder="Type (e.g. Extinguisher)..."
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                  />
                  <input
                    type="text"
                    value={manualAssetLocation}
                    onChange={(e) => setManualAssetLocation(e.target.value)}
                    placeholder="Location..."
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualItem(); } }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={manualSerialNumber}
                    onChange={(e) => setManualSerialNumber(e.target.value)}
                    placeholder="Serial number (optional)..."
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                  />
                  <input
                    type="text"
                    value={manualManufacturer}
                    onChange={(e) => setManualManufacturer(e.target.value)}
                    placeholder="Manufacturer (optional)..."
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
                  />
                  <button
                    type="button"
                    onClick={addManualItem}
                    disabled={!manualAssetName.trim()}
                    className="px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            onClick={() => navigate(`/customers/${customerId}`)}
            className="w-full sm:w-auto px-6 py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap order-1 sm:order-2"
          >
            {submitting ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <i className="ri-calendar-check-line"></i>
                Schedule {selectedCount + manualItems.length} Inspection{selectedCount + manualItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}