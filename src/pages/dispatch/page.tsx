import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import { mockInspections } from '@/mocks/inspections';
import EmptyState from '@/components/base/EmptyState';

interface TechLoad {
  id: string;
  full_name: string;
  assigned: number;
  completed_today: number;
  in_progress: number;
  overdue: number;
  utilization: number;
  inspections: DispatchInspection[];
}

interface DispatchInspection {
  id: string;
  type: string;
  asset_name: string;
  asset_location: string;
  customer_name: string;
  customer_id: string;
  scheduled_date: string;
  status: string;
  inspector_id: string;
  inspector_name: string;
  priority: 'high' | 'medium' | 'low';
}

interface UnassignedJob {
  id: string;
  type: string;
  asset_name: string;
  asset_location: string;
  customer_name: string;
  customer_id: string;
  scheduled_date: string;
  priority: 'high' | 'medium' | 'low';
}

export default function DispatchPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [techLoads, setTechLoads] = useState<TechLoad[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedJob[]>([]);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [dragoverTech, setDragoverTech] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: techs, error: techErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician')
        .order('full_name');

      if (techErr) throw techErr;

      const { data: inspections, error: inspErr } = await supabase
        .from('inspections')
        .select(`
          id, inspection_type, scheduled_date, status, inspector_id,
          assets:asset_id (name, location),
          customers:customer_id (id, name)
        `)
        .order('scheduled_date');

      if (inspErr) throw inspErr;

      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      const profileMap: Record<string, string> = {};
      (techs || []).forEach((t: any) => { profileMap[t.id] = t.full_name; });

      const allInspections: DispatchInspection[] = (inspections || []).map((i: any) => {
        const daysUntilDue = Math.ceil((new Date(i.scheduled_date).getTime() - now.getTime()) / 86400000);
        const priority: 'high' | 'medium' | 'low' =
          i.status === 'overdue' || daysUntilDue < 0 ? 'high' :
          daysUntilDue <= 3 ? 'high' :
          daysUntilDue <= 7 ? 'medium' : 'low';

        return {
          id: i.id,
          type: i.inspection_type,
          asset_name: i.assets?.name || 'Unknown',
          asset_location: i.assets?.location || 'Unknown',
          customer_name: i.customers?.name || 'Unknown',
          customer_id: i.customers?.id || '',
          scheduled_date: i.scheduled_date,
          status: i.status,
          inspector_id: i.inspector_id || '',
          inspector_name: profileMap[i.inspector_id] || 'Unassigned',
          priority,
        };
      });

      // Unassigned jobs
      const unassignedJobs: UnassignedJob[] = allInspections
        .filter((i) => !i.inspector_id && (i.status === 'scheduled' || i.status === 'overdue'))
        .map((i) => ({
          id: i.id,
          type: i.type,
          asset_name: i.asset_name,
          asset_location: i.asset_location,
          customer_name: i.customer_name,
          customer_id: i.customer_id,
          scheduled_date: i.scheduled_date,
          priority: i.priority,
        }));

      setUnassigned(unassignedJobs);

      // Tech workloads
      const techWorkloads: TechLoad[] = (techs || []).map((t: any) => {
        const techInspections = allInspections.filter((i) => i.inspector_id === t.id);
        const active = techInspections.filter((i) => i.status === 'scheduled' || i.status === 'in_progress' || i.status === 'overdue');
        const completedToday = techInspections.filter((i) => i.status === 'completed' && i.scheduled_date === today).length;
        const inProgress = techInspections.filter((i) => i.status === 'in_progress').length;
        const overdue = techInspections.filter((i) => i.status === 'overdue').length;
        const utilization = active.length > 0 ? Math.min(100, Math.round((active.length / 8) * 100)) : 0;

        return {
          id: t.id,
          full_name: t.full_name,
          assigned: active.length,
          completed_today: completedToday,
          in_progress: inProgress,
          overdue,
          utilization,
          inspections: techInspections.filter((i) => i.status !== 'completed' && i.status !== 'cancelled'),
        };
      });

      setTechLoads(techWorkloads);
    } catch {
      // Mock fallback
      const mockTechs = [
        { id: 'usr-003', full_name: 'Mike Rodriguez' },
        { id: 'usr-004', full_name: 'Lisa Thompson' },
        { id: 'usr-005', full_name: 'James Wilson' },
      ];

      const mockDispatchInspections: DispatchInspection[] = mockInspections.map((i: any, idx: number) => ({
        id: i.id,
        type: i.type,
        asset_name: i.assetName,
        asset_location: i.location,
        customer_name: 'Customer',
        customer_id: `cust-00${idx + 1}`,
        scheduled_date: i.scheduledDate,
        status: i.status,
        inspector_id: mockTechs[idx % 3]?.id || '',
        inspector_name: i.inspectorName || 'Unassigned',
        priority: i.status === 'overdue' ? 'high' as const : idx % 3 === 0 ? 'high' as const : idx % 3 === 1 ? 'medium' as const : 'low' as const,
      }));

      setUnassigned(
        mockDispatchInspections
          .filter((i) => !i.inspector_id && (i.status === 'scheduled' || i.status === 'overdue'))
          .slice(0, 5)
          .map((i) => ({
            id: i.id, type: i.type, asset_name: i.asset_name,
            asset_location: i.asset_location, customer_name: i.customer_name,
            customer_id: i.customer_id, scheduled_date: i.scheduled_date, priority: i.priority,
          }))
      );

      setTechLoads(mockTechs.map((t) => {
        const techInspections = mockDispatchInspections.filter((i) => i.inspector_id === t.id);
        const active = techInspections.filter((i) => i.status === 'scheduled' || i.status === 'in_progress' || i.status === 'overdue');
        const inProgress = techInspections.filter((i) => i.status === 'in_progress').length;
        const overdue = techInspections.filter((i) => i.status === 'overdue').length;
        return {
          id: t.id, full_name: t.full_name,
          assigned: active.length, completed_today: 2,
          in_progress: inProgress, overdue,
          utilization: Math.min(100, Math.round((active.length / 8) * 100)),
          inspections: techInspections.filter((i) => i.status !== 'completed' && i.status !== 'cancelled'),
        };
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReassign = async (inspectionId: string, newTechId: string) => {
    const current = unassigned.find((j) => j.id === inspectionId) ||
      techLoads.flatMap((t) => t.inspections).find((i) => i.id === inspectionId);
    if (!current) return;

    const newTechName = techLoads.find((t) => t.id === newTechId)?.full_name || 'Technician';

    // Optimistic update
    setUnassigned((prev) => prev.filter((j) => j.id !== inspectionId));
    setTechLoads((prev) => prev.map((t) => {
      if (t.id === newTechId) {
        const newInsp: DispatchInspection = {
          ...current,
          inspector_id: newTechId,
          inspector_name: newTechName,
          id: current.id,
          type: 'type' in current ? current.type : '',
          asset_name: 'asset_name' in current ? current.asset_name : '',
          asset_location: 'asset_location' in current ? current.asset_location : '',
          customer_name: 'customer_name' in current ? current.customer_name : '',
          customer_id: 'customer_id' in current ? current.customer_id : '',
          scheduled_date: 'scheduled_date' in current ? current.scheduled_date : '',
          status: 'scheduled',
          priority: 'priority' in current ? current.priority : 'medium',
        };
        return { ...t, assigned: t.assigned + 1, inspections: [newInsp, ...t.inspections] };
      }
      // Remove from old tech if reassigning
      return {
        ...t,
        inspections: t.inspections.filter((i) => i.id !== inspectionId),
        assigned: t.inspections.some((i) => i.id === inspectionId) ? t.assigned - 1 : t.assigned,
      };
    }));

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ inspector_id: newTechId })
        .eq('id', inspectionId);
      if (error) throw error;
    } catch {
      fetchData();
    } finally {
      setReassigning(null);
    }
  };

  const handleBulkAssign = async (techId: string) => {
    if (unassigned.length === 0) return;
    for (const job of unassigned) {
      await handleReassign(job.id, techId);
    }
  };

  const handleDragStart = (e: React.DragEvent, inspectionId: string) => {
    e.dataTransfer.setData('inspectionId', inspectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, techId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragoverTech(techId);
  };

  const handleDragLeave = () => {
    setDragoverTech(null);
  };

  const handleDrop = async (e: React.DragEvent, techId: string) => {
    e.preventDefault();
    setDragoverTech(null);
    const inspectionId = e.dataTransfer.getData('inspectionId');
    if (inspectionId) {
      await handleReassign(inspectionId, techId);
    }
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-slate-50 border-slate-200 text-slate-600',
  };

  const priorityDots: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-400',
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    const today = new Date();
    const date = new Date(d);
    const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return `${diff}d`;
  };

  const totalStats = useMemo(() => ({
    totalTechs: techLoads.length,
    totalAssigned: techLoads.reduce((s, t) => s + t.assigned, 0),
    totalUnassigned: unassigned.length,
    totalCompleted: techLoads.reduce((s, t) => s + t.completed_today, 0),
    avgUtilization: techLoads.length > 0 ? Math.round(techLoads.reduce((s, t) => s + t.utilization, 0) / techLoads.length) : 0,
  }), [techLoads, unassigned]);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dynamic Dispatching</h2>
            <p className="text-sm text-gray-500 mt-0.5">Assign and balance workloads across your technician team in real time</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-1"></i> Refresh
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Technicians</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalStats.totalTechs}</p>
            <p className="text-xs text-gray-400 mt-0.5">Active today</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Assigned</p>
            <p className="text-2xl font-bold text-brand-cyan mt-1">{totalStats.totalAssigned}</p>
            <p className="text-xs text-gray-400 mt-0.5">Open jobs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Unassigned</p>
            <p className={`text-2xl font-bold mt-1 ${totalStats.totalUnassigned > 0 ? 'text-red-600' : 'text-gray-900'}`}>{totalStats.totalUnassigned}</p>
            <p className="text-xs text-gray-400 mt-0.5">Needs dispatcher</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Completed Today</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalStats.totalCompleted}</p>
            <p className="text-xs text-gray-400 mt-0.5">Across all techs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Avg Utilization</p>
            <p className="text-2xl font-bold text-brand-gold mt-1">{totalStats.avgUtilization}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Team capacity</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unassigned jobs — drag source area */}
            {unassigned.length === 0 && !loading && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-checkbox-circle-line text-emerald-600"></i>
                </span>
                <p className="text-sm font-medium text-emerald-800">All jobs are assigned — nothing waiting for a technician.</p>
              </div>
            )}
            {unassigned.length > 0 && (
              <div className="bg-red-50/50 border-2 border-dashed border-red-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                      <i className="ri-alert-line text-red-500"></i>
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Unassigned Jobs</h3>
                      <p className="text-xs text-gray-500">{unassigned.length} job{unassigned.length !== 1 ? 's' : ''} waiting for a technician</p>
                    </div>
                  </div>
                  {techLoads.length > 0 && (
                    <div className="flex items-center gap-1">
                      {techLoads.slice(0, 4).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleBulkAssign(t.id)}
                          className="px-2 py-1 rounded-md border border-red-200 bg-white text-[10px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          All to {t.full_name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {unassigned.map((job) => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      className={`flex-shrink-0 w-56 rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${priorityColors[job.priority]}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold truncate">{job.asset_name}</p>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${priorityDots[job.priority]}`}></span>
                      </div>
                      <p className="text-[10px] opacity-70 mt-0.5 truncate">{job.type} — {job.asset_location}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Link to={`/customers/${job.customer_id}`} className="text-[10px] hover:underline truncate max-w-[100px]">{job.customer_name}</Link>
                        <span className="text-[10px] font-medium">{formatDate(job.scheduled_date)}</span>
                      </div>
                      {reassigning === job.id && (
                        <div className="mt-2">
                          <select
                            onChange={(e) => { if (e.target.value) handleReassign(job.id, e.target.value); }}
                            className="w-full text-[10px] px-2 py-1 border border-gray-200 rounded bg-white"
                            autoFocus
                          >
                            <option value="">Assign to...</option>
                            {techLoads.map((t) => (
                              <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tech workload cards */}
            {techLoads.length === 0 ? (
              <EmptyState
                icon="ri-team-line"
                title="No technicians available"
                description="Add team members in the Users section to start assigning and dispatching jobs."
              />
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {techLoads.map((tech) => (
                <div
                  key={tech.id}
                  onDragOver={(e) => handleDragOver(e, tech.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, tech.id)}
                  className={`bg-white rounded-xl border transition-all ${
                    dragoverTech === tech.id
                      ? 'border-brand-gold border-2 shadow-lg bg-brand-gold/[0.03]'
                      : 'border-gray-100'
                  }`}
                >
                  {/* Tech header */}
                  <div
                    className="px-4 py-3 border-b border-gray-100 cursor-pointer"
                    onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-brand-navy text-white flex items-center justify-center text-sm font-bold">
                          {tech.full_name.split(' ').map((n) => n[0]).join('')}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{tech.full_name}</p>
                          <p className="text-xs text-gray-400">{tech.assigned} active job{tech.assigned !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  tech.utilization > 80 ? 'bg-red-500' :
                                  tech.utilization > 60 ? 'bg-amber-500' :
                                  'bg-emerald-500'
                                }`}
                                style={{ width: `${tech.utilization}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-medium text-gray-500">{tech.utilization}%</span>
                          </div>
                        </div>
                        {selectedTech === tech.id ? (
                          <i className="ri-arrow-up-s-line text-gray-400 text-sm"></i>
                        ) : (
                          <i className="ri-arrow-down-s-line text-gray-400 text-sm"></i>
                        )}
                      </div>
                    </div>

                    {/* Badge row */}
                    <div className="flex items-center gap-2 mt-2">
                      {tech.overdue > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                          {tech.overdue} overdue
                        </span>
                      )}
                      {tech.in_progress > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          {tech.in_progress} in progress
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        {tech.completed_today} done today
                      </span>
                    </div>
                  </div>

                  {/* Expanded inspection list */}
                  {selectedTech === tech.id && (
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                      {tech.inspections.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs text-gray-400">No active inspections. Drag jobs here!</p>
                        </div>
                      ) : (
                        tech.inspections
                          .sort((a, b) => {
                            const priorityOrder = { high: 0, medium: 1, low: 2 };
                            return priorityOrder[a.priority] - priorityOrder[b.priority];
                          })
                          .map((insp) => (
                            <div key={insp.id} className="px-4 py-2.5 flex items-center justify-between group hover:bg-gray-50/50">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDots[insp.priority]}`}></span>
                                  <Link
                                    to={`/inspections/${insp.id}`}
                                    className="text-xs font-medium text-gray-900 hover:text-brand-navy hover:underline truncate"
                                  >
                                    {insp.asset_name}
                                  </Link>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate ml-3">{insp.type} — {insp.asset_location}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-gray-400">{formatDate(insp.scheduled_date)}</span>
                                <button
                                  onClick={() => handleReassign(insp.id, '')}
                                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all cursor-pointer"
                                  title="Unassign"
                                >
                                  <span className="w-5 h-5 flex items-center justify-center"><i className="ri-close-circle-line text-xs"></i></span>
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}

                  {/* Compact view when collapsed — show first 3 */}
                  {selectedTech !== tech.id && tech.inspections.length > 0 && (
                    <div className="px-4 py-2">
                      {tech.inspections
                        .sort((a, b) => {
                          const priorityOrder = { high: 0, medium: 1, low: 2 };
                          return priorityOrder[a.priority] - priorityOrder[b.priority];
                        })
                        .slice(0, 3)
                        .map((insp) => (
                          <div key={insp.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDots[insp.priority]}`}></span>
                              <span className="text-[10px] text-gray-600 truncate">{insp.asset_name}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{formatDate(insp.scheduled_date)}</span>
                          </div>
                        ))}
                      {tech.inspections.length > 3 && (
                        <p className="text-[10px] text-gray-400 mt-1 pl-3">
                          +{tech.inspections.length - 3} more — click to expand
                        </p>
                      )}
                    </div>
                  )}

                  {/* Drop target hint */}
                  {dragoverTech === tech.id && (
                    <div className="px-4 py-6 text-center border-t-2 border-brand-gold border-dashed">
                      <p className="text-sm font-semibold text-brand-gold">Drop to assign</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}