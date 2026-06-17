import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  maintenance: 'bg-amber-50 text-amber-600',
  retired: 'bg-gray-100 text-gray-500',
};

const ratingStyles: Record<string, string> = {
  pass: 'bg-emerald-50 text-emerald-600',
  fail: 'bg-red-50 text-red-500',
  needs_attention: 'bg-amber-50 text-amber-600',
};

const inspStatusStyles: Record<string, string> = {
  scheduled: 'bg-brand-cyan/10 text-brand-cyan',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-500',
};

const ASSET_TYPES = [
  'Extinguisher', 'Sprinkler', 'Alarm', 'Hydrant', 'Hose',
  'Backflow Preventer', 'Fire Pump', 'Kitchen Suppression',
  'Emergency Lighting', 'Smoke Control', 'Elevator Recall',
  'Monitoring System',
];

interface AssetData {
  id: string;
  name: string;
  type: string;
  location: string;
  serial_number: string;
  manufacturer: string;
  install_date: string | null;
  last_inspected: string | null;
  next_due: string | null;
  status: string;
  customer_id?: string | null;
}

interface InspectionHistory {
  id: string;
  inspection_type: string;
  scheduled_date: string;
  status: string;
  rating: string | null;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [inspections, setInspections] = useState<InspectionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editInstallDate, setEditInstallDate] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCustomerId, setEditCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Recurring schedule state
  const [recurringSchedule, setRecurringSchedule] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('monthly');
  const [scheduleInterval, setScheduleInterval] = useState(30);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleActive, setScheduleActive] = useState(true);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: assetData, error: assetErr } = await supabase
          .from('assets')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (assetErr || !assetData) throw assetErr || new Error('Not found');
        setAsset(assetData as AssetData);

        const { data: inspData } = await supabase
          .from('inspections')
          .select('id, inspection_type, scheduled_date, status, rating')
          .eq('asset_id', id)
          .order('scheduled_date', { ascending: false });

        setInspections((inspData || []).map((i: any) => ({
          id: i.id,
          inspection_type: i.inspection_type,
          scheduled_date: i.scheduled_date,
          status: i.status,
          rating: i.rating,
        })));

        // Fetch recurring schedule
        const { data: schedData } = await supabase
          .from('recurring_schedules')
          .select('*')
          .eq('asset_id', id)
          .maybeSingle();
        if (schedData) {
          setRecurringSchedule(schedData);
          setScheduleFrequency(schedData.frequency);
          setScheduleInterval(schedData.interval_days || 30);
          setScheduleStartDate(schedData.start_date);
          setScheduleActive(schedData.active);
        } else {
          setScheduleStartDate(new Date().toISOString().split('T')[0]);
        }
      } catch {
        const { mockAssets } = await import('@/mocks/assets');
        const { mockInspections } = await import('@/mocks/inspections');
        const found = mockAssets.find((a: any) => a.id === id);
        if (found) {
          setAsset({
            id: found.id,
            name: found.name,
            type: found.type,
            location: found.location,
            serial_number: found.serialNumber,
            manufacturer: found.manufacturer,
            install_date: found.installDate,
            last_inspected: found.lastInspected,
            next_due: found.nextDue,
            status: found.status,
          });
          setInspections(
            mockInspections
              .filter((i: any) => i.assetId === found.id)
              .map((i: any) => ({
                id: i.id,
                inspection_type: i.type,
                scheduled_date: i.scheduledDate,
                status: i.status,
                rating: i.rating,
              }))
          );
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const { data } = await supabase
          .from('customers')
          .select('id, name, company')
          .order('name');
        if (data && data.length > 0) {
          setCustomers(data as Customer[]);
        } else {
          const { mockCustomers } = await import('@/mocks/customers');
          setCustomers(mockCustomers.map((c: any) => ({ id: c.id, name: c.name, company: c.company || null })));
        }
      } catch {
        const { mockCustomers } = await import('@/mocks/customers');
        setCustomers(mockCustomers.map((c: any) => ({ id: c.id, name: c.name, company: c.company || null })));
      }
    }
    fetchCustomers();
  }, []);

  const openEditModal = () => {
    if (!asset) return;
    setEditName(asset.name);
    setEditType(asset.type);
    setEditLocation(asset.location);
    setEditSerial(asset.serial_number);
    setEditManufacturer(asset.manufacturer || '');
    setEditInstallDate(asset.install_date || '');
    setEditStatus(asset.status);
    setEditCustomerId(asset.customer_id || '');
    setEditError('');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editName.trim() || !editLocation.trim() || !editSerial.trim()) {
      setEditError('Name, location, and serial number are required.');
      return;
    }

    setEditSubmitting(true);

    const payload: Record<string, any> = {
      name: editName.trim(),
      type: editType,
      location: editLocation.trim(),
      serial_number: editSerial.trim(),
      status: editStatus,
      manufacturer: editManufacturer.trim() || null,
      install_date: editInstallDate || null,
      customer_id: editCustomerId || null,
    };

    try {
      const { error } = await supabase.from('assets').update(payload).eq('id', id);
      if (error) throw error;
      setShowEditModal(false);

      setAsset((prev) => prev ? {
        ...prev,
        name: editName.trim(),
        type: editType,
        location: editLocation.trim(),
        serial_number: editSerial.trim(),
        manufacturer: editManufacturer.trim() || '',
        install_date: editInstallDate || null,
        status: editStatus,
        customer_id: editCustomerId || null,
      } : null);
    } catch {
      setEditError('Failed to update asset. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    setDeleteSubmitting(true);

    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      setShowDeleteModal(false);
      navigate('/assets');
    } catch {
      setDeleteError('Failed to delete asset. Please try again.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError('');
    if (!scheduleStartDate) {
      setScheduleError('Start date is required.');
      return;
    }
    setScheduleSubmitting(true);
    try {
      const payload = {
        asset_id: id,
        customer_id: asset?.customer_id,
        asset_type: asset?.type || 'fire-alarm',
        frequency: scheduleFrequency,
        interval_days: scheduleInterval,
        start_date: scheduleStartDate,
        active: scheduleActive,
        next_due_date: scheduleStartDate,
        updated_at: new Date().toISOString(),
      };
      if (recurringSchedule) {
        const { error } = await supabase
          .from('recurring_schedules')
          .update(payload)
          .eq('id', recurringSchedule.id);
        if (error) throw error;
        setRecurringSchedule({ ...recurringSchedule, ...payload });
      } else {
        const { data, error } = await supabase
          .from('recurring_schedules')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        setRecurringSchedule(data);
      }
      setShowScheduleModal(false);
    } catch {
      setScheduleError('Failed to save schedule. Please try again.');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      semiannual: 'Semi-Annual',
      annual: 'Annual',
      custom: 'Custom',
    };
    return labels[freq] || freq;
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

  if (!asset) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto text-center py-20">
          <i className="ri-error-warning-line text-4xl text-gray-300 mb-4 block"></i>
          <h2 className="text-lg font-semibold text-gray-900">Asset not found</h2>
          <p className="text-sm text-gray-500 mt-1">The asset you are looking for does not exist.</p>
          <button
            onClick={() => navigate('/assets')}
            className="mt-4 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            Back to Assets
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isOverdue = asset.next_due ? new Date(asset.next_due) < new Date() : false;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/assets')}
            className="text-sm text-gray-500 hover:text-brand-navy transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line mr-1"></i> Assets
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">{asset.serial_number}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{asset.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{asset.type} · {asset.location}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[asset.status] || 'bg-gray-50 text-gray-500'}`}>
                  {asset.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Serial</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{asset.serial_number}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Manufacturer</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{asset.manufacturer || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Installed</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{asset.install_date ? new Date(asset.install_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Last Inspected</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{asset.last_inspected ? new Date(asset.last_inspected).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Next Due</p>
                  <p className={`text-sm font-medium mt-1 ${isOverdue ? 'text-red-500' : 'text-gray-900'}`}>
                    {asset.next_due ? new Date(asset.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    {isOverdue && <span className="ml-1 text-[10px] font-normal text-red-400">overdue</span>}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total Inspections</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{inspections.length}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (asset.customer_id) {
                      navigate(`/customers/${asset.customer_id}/schedule?preSelect=${asset.id}`);
                    } else {
                      navigate('/schedule');
                    }
                  }}
                  className="px-4 py-2 bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-calendar-line mr-1.5"></i> Schedule Inspection
                </button>
                {user && user.role !== 'technician' && (
                  <>
                    <button
                      onClick={openEditModal}
                      className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-edit-line mr-1.5"></i> Edit Asset
                    </button>
                    <button
                      onClick={() => { setDeleteError(''); setShowDeleteModal(true); }}
                      className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-delete-bin-line mr-1.5"></i> Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Inspection History</h3>
              {inspections.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((ins) => (
                        <tr key={ins.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-2.5">
                            <Link to={`/inspections/${ins.id}`} className="text-sm font-medium text-brand-navy hover:text-brand-gold transition-colors">
                              {ins.id.slice(0, 8)}...
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-600">{ins.inspection_type}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-600">
                            {new Date(ins.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inspStatusStyles[ins.status] || 'bg-gray-50 text-gray-500'}`}>
                              {ins.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {ins.rating ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ratingStyles[ins.rating] || 'bg-gray-50 text-gray-500'}`}>
                                {ins.rating.replace('_', ' ')}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No inspection history for this asset.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Completed</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {inspections.filter((i) => i.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Pass Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {(() => {
                      const completed = inspections.filter((i) => i.status === 'completed');
                      const passed = completed.filter((i) => i.rating === 'pass').length;
                      return completed.length ? `${Math.round((passed / completed.length) * 100)}%` : '—';
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Open Issues</span>
                  <span className="text-sm font-semibold text-red-500">
                    {inspections.filter((i) => i.rating === 'fail' || i.rating === 'needs_attention').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Overdue</span>
                  <span className="text-sm font-semibold text-red-500">
                    {inspections.filter((i) => i.status === 'overdue').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recurring Schedule</h3>
              {recurringSchedule ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Frequency</span>
                    <span className="text-sm font-semibold text-gray-900">{getFrequencyLabel(recurringSchedule.frequency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Next Due</span>
                    <span className={`text-sm font-semibold ${recurringSchedule.next_due_date && new Date(recurringSchedule.next_due_date) < new Date() ? 'text-red-500' : 'text-gray-900'}`}>
                      {recurringSchedule.next_due_date ? new Date(recurringSchedule.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${recurringSchedule.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {recurringSchedule.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setScheduleFrequency(recurringSchedule.frequency);
                      setScheduleInterval(recurringSchedule.interval_days || 30);
                      setScheduleStartDate(recurringSchedule.start_date);
                      setScheduleActive(recurringSchedule.active);
                      setScheduleError('');
                      setShowScheduleModal(true);
                    }}
                    className="w-full mt-3 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-edit-line mr-1.5"></i> Edit Schedule
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-gray-400 mb-3">No recurring schedule set.</p>
                  <button
                    onClick={() => {
                      setScheduleFrequency('monthly');
                      setScheduleInterval(30);
                      setScheduleStartDate(new Date().toISOString().split('T')[0]);
                      setScheduleActive(true);
                      setScheduleError('');
                      setShowScheduleModal(true);
                    }}
                    className="px-3 py-2 bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-calendar-check-line mr-1.5"></i> Set Recurring Schedule
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Maintenance Notes</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                This asset is currently {asset.status}. {asset.status === 'active'
                  ? 'All systems operating normally. Next inspection scheduled per compliance calendar.'
                  : 'Asset flagged for maintenance review. Please schedule follow-up after servicing.'}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Asset Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)}></div>
            <div className="relative bg-white rounded-xl border border-gray-100 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleUpdate} className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Edit Asset</h3>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
                  </button>
                </div>

                {editError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
                    {editError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Asset Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Type <span className="text-red-400">*</span></label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
                      >
                        {ASSET_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
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
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Serial Number <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={editSerial}
                      onChange={(e) => setEditSerial(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Manufacturer</label>
                      <input
                        type="text"
                        value={editManufacturer}
                        onChange={(e) => setEditManufacturer(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Install Date</label>
                      <input
                        type="date"
                        value={editInstallDate}
                        onChange={(e) => setEditInstallDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer</label>
                    <select
                      value={editCustomerId}
                      onChange={(e) => setEditCustomerId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
                    >
                      <option value="">— No customer —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.company ? ` (${c.company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    {editSubmitting ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative bg-white rounded-xl border border-gray-100 w-full max-w-md mx-4">
              <div className="p-6">
                <div className="text-center mb-5">
                  <span className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-delete-bin-line text-xl text-red-500"></i>
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">Delete Asset</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to delete <strong>{asset.name}</strong>? This action cannot be undone and will also remove all associated inspection records.
                  </p>
                </div>

                {deleteError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
                    {deleteError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    {deleteSubmitting ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Deleting...
                      </span>
                    ) : (
                      'Delete Asset'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowScheduleModal(false)}></div>
            <div className="relative bg-white rounded-xl border border-gray-100 w-full max-w-md mx-4">
              <form onSubmit={handleSaveSchedule} className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">
                    {recurringSchedule ? 'Edit Recurring Schedule' : 'Set Recurring Schedule'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
                  </button>
                </div>

                {scheduleError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0"><i className="ri-error-warning-line"></i></span>
                    {scheduleError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Inspection Frequency</label>
                    <select
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 cursor-pointer"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="semiannual">Semi-Annual</option>
                      <option value="annual">Annual</option>
                      <option value="custom">Custom (days)</option>
                    </select>
                  </div>

                  {scheduleFrequency === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Interval (days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={scheduleInterval}
                        onChange={(e) => setScheduleInterval(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={scheduleStartDate}
                      onChange={(e) => setScheduleStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="schedule-active"
                      checked={scheduleActive}
                      onChange={(e) => setScheduleActive(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                    />
                    <label htmlFor="schedule-active" className="text-sm text-gray-700">Active — auto-generate future inspections</label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scheduleSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    {scheduleSubmitting ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Saving...
                      </span>
                    ) : (
                      recurringSchedule ? 'Update Schedule' : 'Create Schedule'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}