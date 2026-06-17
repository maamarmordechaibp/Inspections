import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import QuickScheduleSingle from './components/QuickScheduleSingle';

const statusFilters = ['All', 'Active', 'Maintenance', 'Retired'];

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  maintenance: 'bg-amber-50 text-amber-600',
  retired: 'bg-gray-100 text-gray-500',
};

const inspectionStatusStyles: Record<string, string> = {
  scheduled: 'bg-brand-cyan/10 text-brand-cyan',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

const ASSET_TYPES = [
  'Extinguisher', 'Sprinkler', 'Alarm', 'Hydrant', 'Hose',
  'Backflow Preventer', 'Fire Pump', 'Kitchen Suppression',
  'Emergency Lighting', 'Smoke Control', 'Elevator Recall',
  'Monitoring System',
];

interface Asset {
  id: string;
  name: string;
  type: string;
  location: string;
  serial_number: string;
  status: string;
  last_inspected: string | null;
  next_due: string | null;
  manufacturer: string | null;
  customer_id: string | null;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
}

interface InspectionRecord {
  id: string;
  asset_id: string;
  asset_name: string;
  inspection_type: string;
  scheduled_date: string;
  status: string;
  inspector_name: string;
  rating: string | null;
}

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');

  // Add Asset modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Extinguisher');
  const [formLocation, setFormLocation] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formInstallDate, setFormInstallDate] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Quick Schedule state
  const [quickScheduleAsset, setQuickScheduleAsset] = useState<Asset | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [assetsRes, customersRes, inspectionsRes] = await Promise.all([
        supabase.from('assets').select('*').order('name'),
        supabase.from('customers').select('id, name, company').order('name'),
        supabase.from('inspections').select('id, asset_id, inspection_type, scheduled_date, status, inspector_name:profiles(full_name), rating, asset_name:assets(name)').in('status', ['scheduled', 'in_progress', 'overdue']).order('scheduled_date', { ascending: true }),
      ]);

      if (assetsRes.data && assetsRes.data.length > 0) {
        setAssets(assetsRes.data as Asset[]);
      } else {
        const { mockAssets } = await import('@/mocks/assets');
        setAssets(mockAssets.map((a: any) => ({
          id: a.id, name: a.name, type: a.type, location: a.location,
          serial_number: a.serialNumber, status: a.status,
          last_inspected: a.lastInspected, next_due: a.nextDue,
          manufacturer: a.manufacturer || null, customer_id: a.customerId || null,
        })));
      }

      if (customersRes.data && customersRes.data.length > 0) {
        setCustomers(customersRes.data as Customer[]);
      } else {
        const { mockCustomers } = await import('@/mocks/customers');
        setCustomers(mockCustomers.map((c: any) => ({ id: c.id, name: c.name, company: c.company || null })));
      }

      if (inspectionsRes.data && inspectionsRes.data.length > 0) {
        setInspections(inspectionsRes.data.map((i: any) => ({
          id: i.id, asset_id: i.asset_id,
          asset_name: i.asset_name?.name || 'Unknown',
          inspection_type: i.inspection_type, scheduled_date: i.scheduled_date,
          status: i.status, inspector_name: i.inspector_name?.full_name || 'Unassigned',
          rating: i.rating,
        })));
      } else {
        const { mockInspections } = await import('@/mocks/inspections');
        setInspections(mockInspections.filter((i: any) => ['scheduled', 'in_progress', 'overdue'].includes(i.status)).map((i: any) => ({
          id: i.id, asset_id: i.assetId, asset_name: i.assetName,
          inspection_type: i.type, scheduled_date: i.scheduledDate,
          status: i.status, inspector_name: i.inspectorName, rating: i.rating,
        })));
      }
    } catch {
      const [{ mockAssets }, { mockCustomers }, { mockInspections }] = await Promise.all([
        import('@/mocks/assets'), import('@/mocks/customers'), import('@/mocks/inspections'),
      ]);
      setAssets(mockAssets.map((a: any) => ({
        id: a.id, name: a.name, type: a.type, location: a.location,
        serial_number: a.serialNumber, status: a.status,
        last_inspected: a.lastInspected, next_due: a.nextDue,
        manufacturer: a.manufacturer || null, customer_id: a.customerId || null,
      })));
      setCustomers(mockCustomers.map((c: any) => ({ id: c.id, name: c.name, company: c.company || null })));
      setInspections(mockInspections.filter((i: any) => ['scheduled', 'in_progress', 'overdue'].includes(i.status)).map((i: any) => ({
        id: i.id, asset_id: i.assetId, asset_name: i.assetName,
        inspection_type: i.type, scheduled_date: i.scheduledDate,
        status: i.status, inspector_name: i.inspectorName, rating: i.rating,
      })));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const { containerRef, indicator } = usePullToRefresh({
    onRefresh: async () => { await fetchAll(); },
    disabled: loading,
  });

  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'all') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  // Filter assets by customer
  const customerAssets = useMemo(() => {
    if (selectedCustomerId === 'all') return assets;
    return assets.filter((a) => a.customer_id === selectedCustomerId);
  }, [assets, selectedCustomerId]);

  // Group assets by type for customer view
  const assetsByType = useMemo(() => {
    const grouped: Record<string, Asset[]> = {};
    customerAssets.forEach((a) => {
      if (!grouped[a.type]) grouped[a.type] = [];
      grouped[a.type].push(a);
    });
    return grouped;
  }, [customerAssets]);

  // Customer's upcoming inspections
  const customerInspections = useMemo(() => {
    if (selectedCustomerId === 'all') return [];
    const assetIds = new Set(customerAssets.map((a) => a.id));
    return inspections.filter((i) => assetIds.has(i.asset_id));
  }, [inspections, customerAssets, selectedCustomerId]);

  // Filtered for table view (all customers)
  const filteredTable = useMemo(() => {
    return assets.filter((asset) => {
      const matchSearch = asset.name.toLowerCase().includes(search.toLowerCase()) ||
        asset.location.toLowerCase().includes(search.toLowerCase()) ||
        asset.serial_number.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || asset.status === statusFilter.toLowerCase();
      const matchType = typeFilter === 'All' || asset.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [assets, search, statusFilter, typeFilter]);

  const assetTypes = useMemo(() => {
    const types = new Set(assets.map((a) => a.type));
    return ['All', ...Array.from(types)];
  }, [assets]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: assets.length };
    statusFilters.slice(1).forEach((s) => {
      c[s] = assets.filter((a) => a.status === s.toLowerCase()).length;
    });
    return c;
  }, [assets]);

  const isOverdue = (nextDue: string | null) => {
    if (!nextDue) return false;
    return new Date(nextDue) < new Date();
  };
  const isDueSoon = (nextDue: string | null) => {
    if (!nextDue) return false;
    const diff = new Date(nextDue).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const getUpcomingInspection = (assetId: string) => {
    return inspections.find((i) => i.asset_id === assetId && ['scheduled', 'in_progress', 'overdue'].includes(i.status)) || null;
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return '—';
    const c = customers.find((c) => c.id === customerId);
    return c ? c.name : '—';
  };

  // Stats for selected customer
  const customerStats = useMemo(() => {
    const total = customerAssets.length;
    const active = customerAssets.filter((a) => a.status === 'active').length;
    const upcomingCount = customerInspections.length;
    const overdueCount = customerInspections.filter((i) => i.status === 'overdue').length;
    const dueThisWeek = customerAssets.filter((a) => isDueSoon(a.next_due)).length;
    return { total, active, upcomingCount, overdueCount, dueThisWeek };
  }, [customerAssets, customerInspections]);

  const openAddModal = () => {
    setFormName(''); setFormType('Extinguisher'); setFormLocation('');
    setFormSerial(''); setFormManufacturer(''); setFormInstallDate('');
    setFormStatus('active');
    setFormCustomerId(selectedCustomerId !== 'all' ? selectedCustomerId : '');
    setFormError(''); setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    if (!formName.trim()) { setFormError('Asset name is required.'); return; }
    if (!formLocation.trim()) { setFormError('Location is required.'); return; }
    if (!formSerial.trim()) { setFormError('Serial number is required.'); return; }

    setSubmitting(true);
    const newId = crypto.randomUUID();
    const payload: Record<string, any> = {
      id: newId, name: formName.trim(), type: formType,
      location: formLocation.trim(), serial_number: formSerial.trim(),
      status: formStatus, manufacturer: formManufacturer.trim() || null,
      install_date: formInstallDate || null, customer_id: formCustomerId || null,
    };

    try {
      const { error } = await supabase.from('assets').insert(payload);
      if (error) throw error;
      setShowAddModal(false);
      const newAsset: Asset = {
        id: newId, name: formName.trim(), type: formType,
        location: formLocation.trim(), serial_number: formSerial.trim(),
        status: formStatus, last_inspected: null, next_due: null,
        manufacturer: formManufacturer.trim() || null, customer_id: formCustomerId || null,
      };
      setAssets((prev) => [newAsset, ...prev]);
    } catch {
      setFormError('Failed to create asset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assets</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedCustomer
                ? `${selectedCustomer.name} — ${customerAssets.length} asset${customerAssets.length !== 1 ? 's' : ''}`
                : `${filteredTable.length} asset${filteredTable.length !== 1 ? 's' : ''} across ${customers.length} customer${customers.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Customer Selector */}
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSearch('');
                setStatusFilter('All');
                setTypeFilter('All');
              }}
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer min-w-[200px]"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {user && user.role !== 'technician' && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line"></i>
                Add Asset
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
          </div>
        ) : (
          <div ref={containerRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)', WebkitOverflowScrolling: 'touch' }}>
            {indicator}

            {/* ═══ CUSTOMER-SPECIFIC VIEW ═══ */}
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Summary Card */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-navy text-lg font-bold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h3>
                      {selectedCustomer.company && (
                        <p className="text-sm text-gray-500">{selectedCustomer.company}</p>
                      )}
                    </div>
                    <Link
                      to={`/customers/${selectedCustomer.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-navy transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span className="w-4 h-4 flex items-center justify-center"><i className="ri-external-link-line text-xs"></i></span>
                      View Customer
                    </Link>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Total Assets</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{customerStats.total}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Active</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{customerStats.active}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Upcoming Inspections</p>
                    <p className="text-2xl font-bold text-brand-cyan mt-1">{customerStats.upcomingCount}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Overdue</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">{customerStats.overdueCount}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Due This Week</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{customerStats.dueThisWeek}</p>
                  </div>
                </div>

                {/* Assets Grouped by Type */}
                <div className="space-y-4">
                  {Object.entries(assetsByType).map(([type, typeAssets]) => {
                    const typeUpcoming = typeAssets.filter((a) => {
                      const insp = getUpcomingInspection(a.id);
                      return insp !== null;
                    }).length;
                    const typeOverdue = typeAssets.filter((a) => isOverdue(a.next_due)).length;
                    return (
                      <AssetTypeGroup
                        key={type}
                        typeName={type}
                        assets={typeAssets}
                        upcomingCount={typeUpcoming}
                        overdueCount={typeOverdue}
                        getUpcomingInspection={getUpcomingInspection}
                        isOverdue={isOverdue}
                        isDueSoon={isDueSoon}
                        canSchedule={user?.role !== 'technician'}
                        onQuickSchedule={setQuickScheduleAsset}
                      />
                    );
                  })}
                  {Object.keys(assetsByType).length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                      <span className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-gray-300">
                        <i className="ri-inbox-line text-3xl"></i>
                      </span>
                      <p className="text-sm text-gray-500">No assets found for this customer.</p>
                      {user && user.role !== 'technician' && (
                        <button onClick={openAddModal} className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors cursor-pointer">
                          <i className="ri-add-line"></i> Add first asset
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Upcoming Inspections Section */}
                {customerInspections.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center text-brand-cyan">
                          <i className="ri-calendar-check-line"></i>
                        </span>
                        Upcoming Inspections ({customerInspections.length})
                      </h3>
                      <Link
                        to={`/customers/${selectedCustomer.id}/schedule`}
                        className="text-xs text-brand-gold hover:text-brand-navy font-medium transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Schedule more
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Inspector</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerInspections.map((insp) => (
                            <tr key={insp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3">
                                <p className="text-sm font-medium text-gray-900">{insp.asset_name}</p>
                              </td>
                              <td className="px-5 py-3 hidden sm:table-cell">
                                <span className="text-sm text-gray-500">{insp.inspection_type}</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className="text-sm text-gray-600">
                                  {new Date(insp.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </td>
                              <td className="px-5 py-3 hidden md:table-cell">
                                <span className="text-sm text-gray-600">{insp.inspector_name}</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inspectionStatusStyles[insp.status] || 'bg-gray-50 text-gray-500'}`}>
                                  {insp.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <Link to={`/inspections/${insp.id}`} className="inline-flex items-center text-gray-400 hover:text-brand-navy transition-colors">
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
                  </div>
                )}
              </div>
            )}

            {/* ═══ ALL CUSTOMERS TABLE VIEW ═══ */}
            {!selectedCustomer && (
              <div className="bg-white rounded-xl border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 min-w-0">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, serial, or location..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
                  >
                    {assetTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
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

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Customer</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Last Inspected</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Due</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTable.map((asset) => {
                        const overdue = isOverdue(asset.next_due);
                        const dueSoon = isDueSoon(asset.next_due);
                        return (
                          <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <Link to={`/assets/${asset.id}`} className="text-sm font-medium text-brand-navy hover:text-brand-gold transition-colors">
                                {asset.name}
                              </Link>
                              <p className="text-xs text-gray-400">{asset.serial_number}</p>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-sm text-gray-600">{asset.type}</span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <Link to={`/customers/${asset.customer_id}`} className="text-sm text-gray-500 hover:text-brand-navy transition-colors">
                                {getCustomerName(asset.customer_id)}
                              </Link>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-sm text-gray-500">{asset.location}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[asset.status] || 'bg-gray-50 text-gray-500'}`}>
                                {asset.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-sm text-gray-600">
                                {asset.last_inspected ? new Date(asset.last_inspected).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${overdue ? 'text-red-500' : dueSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                                {asset.next_due ? new Date(asset.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                {overdue && <span className="ml-1 text-[10px]">(overdue)</span>}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link to={`/assets/${asset.id}`} className="text-gray-400 hover:text-brand-navy transition-colors">
                                <i className="ri-arrow-right-s-line text-lg"></i>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTable.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center">
                            <div className="text-gray-300 mb-2">
                              <i className="ri-search-line text-3xl"></i>
                            </div>
                            <p className="text-sm text-gray-500">No assets match your filters.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Asset Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)}></div>
            <div className="relative bg-white rounded-xl border border-gray-100 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Add New Asset</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
                  </button>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Asset Name <span className="text-red-400">*</span></label>
                    <input
                      type="text" value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Fire Extinguisher FE-101"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Type <span className="text-red-400">*</span></label>
                      <select
                        value={formType} onChange={(e) => setFormType(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
                      >
                        {ASSET_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location <span className="text-red-400">*</span></label>
                    <input
                      type="text" value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Building A, Floor 3"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Serial Number <span className="text-red-400">*</span></label>
                    <input
                      type="text" value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      placeholder="e.g. FE-2024-0301"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Manufacturer</label>
                      <input
                        type="text" value={formManufacturer}
                        onChange={(e) => setFormManufacturer(e.target.value)}
                        placeholder="e.g. Kidde"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Install Date</label>
                      <input
                        type="date" value={formInstallDate}
                        onChange={(e) => setFormInstallDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer</label>
                    <select
                      value={formCustomerId}
                      onChange={(e) => setFormCustomerId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
                    >
                      <option value="">— No customer —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Creating...
                      </span>
                    ) : 'Create Asset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Schedule Modal */}
        <QuickScheduleSingle
          assetId={quickScheduleAsset?.id || ''}
          assetName={quickScheduleAsset?.name || ''}
          assetType={quickScheduleAsset?.type || ''}
          customerId={quickScheduleAsset?.customer_id || null}
          customerName={quickScheduleAsset?.customer_id ? getCustomerName(quickScheduleAsset.customer_id) : null}
          open={quickScheduleAsset !== null}
          onClose={() => setQuickScheduleAsset(null)}
          onScheduled={() => fetchAll()}
        />
      </div>
    </DashboardLayout>
  );
}

// ═══ Asset Type Group Component ═══
function AssetTypeGroup({
  typeName,
  assets,
  upcomingCount,
  overdueCount,
  getUpcomingInspection,
  isOverdue,
  isDueSoon,
  canSchedule,
  onQuickSchedule,
}: {
  typeName: string;
  assets: Asset[];
  upcomingCount: number;
  overdueCount: number;
  getUpcomingInspection: (assetId: string) => InspectionRecord | null;
  isOverdue: (nextDue: string | null) => boolean;
  isDueSoon: (nextDue: string | null) => boolean;
  canSchedule: boolean;
  onQuickSchedule: (asset: Asset) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const typeIconMap: Record<string, string> = {
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

  const icon = typeIconMap[typeName] || 'ri-settings-3-line';

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center text-brand-navy">
            <i className={`${icon} text-lg`}></i>
          </span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">
              {typeName}
              <span className="ml-2 text-xs font-normal text-gray-400">({assets.length} asset{assets.length !== 1 ? 's' : ''})</span>
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {upcomingCount > 0 && (
                <span className="text-[11px] text-brand-cyan font-medium">{upcomingCount} upcoming</span>
              )}
              {overdueCount > 0 && (
                <span className="text-[11px] text-red-500 font-medium">{overdueCount} overdue</span>
              )}
              {upcomingCount === 0 && overdueCount === 0 && (
                <span className="text-[11px] text-gray-400">All clear</span>
              )}
            </div>
          </div>
        </div>
        <span className={`w-6 h-6 flex items-center justify-center text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <i className="ri-arrow-down-s-line"></i>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Location</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Last Inspected</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Next Due</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Upcoming Inspection</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider w-10"></th>
                  {canSchedule && <th className="text-right px-5 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const overdue = isOverdue(asset.next_due);
                  const dueSoon = isDueSoon(asset.next_due);
                  const upcomingInsp = getUpcomingInspection(asset.id);
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
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[asset.status] || 'bg-gray-50 text-gray-500'}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3">
                        {upcomingInsp ? (
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/inspections/${upcomingInsp.id}`}
                              className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:text-brand-navy font-medium transition-colors"
                            >
                              {new Date(upcomingInsp.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Link>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${inspectionStatusStyles[upcomingInsp.status] || 'bg-gray-50 text-gray-500'}`}>
                              {upcomingInsp.status.replace('_', ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link to={`/assets/${asset.id}`} className="inline-flex items-center text-gray-400 hover:text-brand-navy transition-colors">
                          <span className="w-8 h-8 flex items-center justify-center">
                            <i className="ri-arrow-right-s-line text-lg"></i>
                          </span>
                        </Link>
                      </td>
                      {canSchedule && (
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => onQuickSchedule(asset)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                            title="Quick schedule an inspection"
                          >
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-calendar-event-line text-xs"></i>
                            </span>
                            Schedule
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}