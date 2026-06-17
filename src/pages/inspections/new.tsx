import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import { useInspectorSuggestion } from '@/hooks/useInspectorSuggestion';

interface Asset {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
}

const INSPECTION_TYPES = [
  'Monthly Check',
  'Quarterly Test',
  'Semi-Annual',
  'Annual Inspection',
  'Annual Test',
];

const RATINGS = [
  { value: 'pass', label: 'Pass', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'needs_attention', label: 'Needs Attention', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'fail', label: 'Fail', color: 'bg-red-50 text-red-500 border-red-200' },
];

export default function NewInspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const preselectedCustomerId = searchParams.get('customerId');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [assetId, setAssetId] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [inspectionType, setInspectionType] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'in_progress' | 'completed'>('scheduled');
  const [rating, setRating] = useState('');
  const [findings, setFindings] = useState('');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Inspector state
  const [inspectorId, setInspectorId] = useState('');
  const [technicians, setTechnicians] = useState<{ id: string; full_name: string }[]>([]);
  const [showInspectorDropdown, setShowInspectorDropdown] = useState(false);

  // Smart suggestion
  const { suggestion, loading: suggestionLoading, clearSuggestion } = useInspectorSuggestion(assetId || null);

  useEffect(() => {
    async function fetchAssets() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('assets')
          .select('id, name, type, location, status')
          .order('name');

        if (fetchErr) throw fetchErr;
        setAssets(data || []);
      } catch {
        const { mockAssets } = await import('@/mocks/assets');
        setAssets(mockAssets.map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          location: a.location,
          status: a.status,
        })));
      } finally {
        setLoadingAssets(false);
      }
    }
    async function fetchCustomers() {
      try {
        const { data, error: custErr } = await supabase
          .from('customers')
          .select('id, name, company, address, city, state, phone, email')
          .order('name');

        if (custErr) throw custErr;
        if (data && data.length > 0) {
          setCustomers(data);
        } else {
          const { mockCustomers } = await import('@/mocks/customers');
          setCustomers(mockCustomers.map((c: any) => ({
            id: c.id,
            name: c.name,
            company: c.company,
            address: c.address,
            city: c.city,
            state: c.state,
            phone: c.phone,
            email: c.email,
          })));
        }
      } catch {
        const { mockCustomers } = await import('@/mocks/customers');
        setCustomers(mockCustomers.map((c: any) => ({
          id: c.id,
          name: c.name,
          company: c.company,
          address: c.address,
          city: c.city,
          state: c.state,
          phone: c.phone,
          email: c.email,
        })));
      }
    }
    fetchAssets();
    fetchCustomers();

    // Fetch technicians for inspector assignment
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
  }, []);

  // Pre-select customer from query param once customers are loaded
  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      const match = customers.find((c) => c.id === preselectedCustomerId);
      if (match) {
        setCustomerId(match.id);
        setCustomerSearch(match.name);
      }
    }
  }, [preselectedCustomerId, customers]);

  const selectedAsset = assets.find((a) => a.id === assetId);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const filteredAssets = assets.filter((a) => {
    if (!assetSearch) return true;
    const s = assetSearch.toLowerCase();
    return a.name.toLowerCase().includes(s) || a.location.toLowerCase().includes(s) || a.type.toLowerCase().includes(s);
  });

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return true;
    const s = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(s) || (c.company && c.company.toLowerCase().includes(s)) || (c.city && c.city.toLowerCase().includes(s));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!assetId) {
      setError('Please select an asset.');
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
    if (status === 'completed' && !rating) {
      setError('Please provide a rating for completed inspections.');
      return;
    }

    setSubmitting(true);

    const payload: Record<string, any> = {
      asset_id: assetId,
      customer_id: customerId || null,
      inspector_id: inspectorId || user?.id || null,
      scheduled_date: new Date(scheduledDate).toISOString(),
      status,
      inspection_type: inspectionType,
      findings: findings.trim() || null,
    };

    if (status === 'completed') {
      payload.completed_date = new Date().toISOString();
      payload.rating = rating;
    } else {
      payload.rating = null;
    }

    try {
      const { error: insertErr } = await supabase.from('inspections').insert(payload);

      if (insertErr) throw insertErr;

      setSuccess('Inspection created successfully!');
      setTimeout(() => navigate('/inspections'), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create inspection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin', 'manager']}>
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/inspections')}
            className="text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line mr-1"></i> Inspections
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">New Inspection</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Inspection</h1>
          <p className="text-sm text-gray-500 mt-1">Log a new inspection for a fire safety asset</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line"></i>
            </span>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-close-line"></i>
              </span>
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-6">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-line"></i>
            </span>
            {success}
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all cursor-pointer"
              >
                {selectedAsset ? (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-tools-line text-gray-400"></i>
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{selectedAsset.name}</p>
                      <p className="text-xs text-gray-400">{selectedAsset.location} · {selectedAsset.type}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">
                    {loadingAssets ? 'Loading assets...' : 'Select an asset...'}
                  </span>
                )}
                <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${showAssetDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {showAssetDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        placeholder="Search assets..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredAssets.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No assets found</div>
                    ) : (
                      filteredAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => {
                            setAssetId(asset.id);
                            setAssetSearch('');
                            setShowAssetDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                            assetId === asset.id ? 'bg-brand-gold/5' : ''
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <i className={`${
                              asset.type === 'Extinguisher' ? 'ri-fire-fill text-red-400' :
                              asset.type === 'Sprinkler' ? 'ri-drop-fill text-brand-cyan' :
                              asset.type === 'Alarm' ? 'ri-alert-fill text-amber-400' :
                              asset.type === 'Hydrant' ? 'ri-water-flash-fill text-blue-400' :
                              asset.type === 'Hose' ? 'ri-bring-to-front text-fuchsia-400' :
                              asset.type === 'Backflow Preventer' ? 'ri-contrast-drop-line text-teal-400' :
                              asset.type === 'Fire Pump' ? 'ri-speed-up-fill text-orange-400' :
                              asset.type === 'Kitchen Suppression' ? 'ri-fire-fill text-rose-400' :
                              asset.type === 'Emergency Lighting' ? 'ri-lightbulb-flash-line text-green-400' :
                              asset.type === 'Smoke Control' ? 'ri-windy-line text-sky-400' :
                              asset.type === 'Elevator Recall' ? 'ri-arrow-up-down-line text-violet-400' :
                              asset.type === 'Monitoring System' ? 'ri-signal-tower-line text-slate-400' :
                              'ri-tools-line text-gray-400'
                            }`}></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                            <p className="text-xs text-gray-400">{asset.location} · <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              asset.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>{asset.status}</span></p>
                          </div>
                          {assetId === asset.id && (
                            <i className="ri-check-line text-brand-gold"></i>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {showAssetDropdown && (
              <div className="fixed inset-0 z-10" onClick={() => setShowAssetDropdown(false)}></div>
            )}
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer / Building
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all cursor-pointer"
              >
                {selectedCustomer ? (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-building-2-line text-gray-400"></i>
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                      <p className="text-xs text-gray-400">{[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(', ') || selectedCustomer.company || ''}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">Select a customer (optional)...</span>
                )}
                {customerId && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCustomerId(''); }}
                    className="mr-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <i className="ri-close-line text-sm"></i>
                  </button>
                )}
                <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {showCustomerDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customers..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setCustomerId(''); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50"
                    >
                      <span className="text-sm text-gray-400 italic">No customer (unlinked)</span>
                    </button>
                    {filteredCustomers.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No customers found</div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerSearch('');
                            setShowCustomerDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                            customerId === c.id ? 'bg-brand-gold/5' : ''
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <i className="ri-building-2-line text-gray-400"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                            <p className="text-xs text-gray-400">
                              {[c.city, c.state].filter(Boolean).join(', ') || c.company || ''}
                            </p>
                          </div>
                          {customerId === c.id && (
                            <i className="ri-check-line text-brand-gold"></i>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {showCustomerDropdown && (
              <div className="fixed inset-0 z-10" onClick={() => setShowCustomerDropdown(false)}></div>
            )}
          </div>

          {/* Inspector Selection with Smart Suggestion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Inspector <span className="text-red-400">*</span>
            </label>

            {/* Smart suggestion banner */}
            {suggestion && !inspectorId && (
              <div className="mb-3 p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-lightbulb-line text-brand-gold text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Suggested Inspector</p>
                    <p className="text-xs text-gray-500 mt-0.5">{suggestion.reason}</p>
                    <button
                      type="button"
                      onClick={() => setInspectorId(suggestion.inspectorId)}
                      className="mt-2 px-3 py-1.5 bg-brand-gold hover:bg-brand-gold/90 text-white text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-user-add-line mr-1"></i> Assign {suggestion.inspectorName}
                    </button>
                    <button
                      type="button"
                      onClick={clearSuggestion}
                      className="mt-2 ml-2 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inspector dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInspectorDropdown(!showInspectorDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all cursor-pointer"
              >
                {inspectorId ? (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-brand-navy">
                        {technicians.find((t) => t.id === inspectorId)?.full_name.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </span>
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {technicians.find((t) => t.id === inspectorId)?.full_name || 'Selected'}
                      </p>
                      <p className="text-xs text-gray-400">Technician</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">Select a technician...</span>
                )}
                {inspectorId && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setInspectorId(''); }}
                    className="mr-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <i className="ri-close-line text-sm"></i>
                  </button>
                )}
                <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${showInspectorDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {showInspectorDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setInspectorId(''); setShowInspectorDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50"
                    >
                      <span className="text-sm text-gray-400 italic">Self (you)</span>
                    </button>
                    {technicians.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setInspectorId(t.id); setShowInspectorDropdown(false); clearSuggestion(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                          inspectorId === t.id ? 'bg-brand-gold/5' : ''
                        }`}
                      >
                        <span className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-brand-navy">
                            {t.full_name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.full_name}</p>
                          <p className="text-xs text-gray-400">Technician</p>
                        </div>
                        {inspectorId === t.id && (
                          <i className="ri-check-line text-brand-gold"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {showInspectorDropdown && (
              <div className="fixed inset-0 z-10" onClick={() => setShowInspectorDropdown(false)}></div>
            )}
          </div>

          {/* Inspection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inspection Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INSPECTION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setInspectionType(type)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
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

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['scheduled', 'in_progress', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s);
                    if (s !== 'completed') setRating('');
                  }}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    status === s
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Rating - only if completed */}
          {status === 'completed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(r.value)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      rating === r.value
                        ? `${r.color} border-2`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Findings & Notes
            </label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={5}
              placeholder="Describe inspection findings, observations, issues found, or any notes..."
              maxLength={2000}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/15 focus:border-brand-gold transition-all resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{findings.length}/2000</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/inspections')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap order-1 sm:order-2"
            >
              {submitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <i className="ri-check-line"></i>
                  Create Inspection
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}