import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';
import { mockInspections } from '@/mocks/inspections';
import BulkRescheduleModal from './components/BulkRescheduleModal';
import MyDayView from './components/MyDayView';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const mapMarkers = (inspections: ScheduleInspection[]) => {
  // Generate unique location markers with color coding
  const locationMap = new Map<string, { count: number; statuses: string[]; asset_location: string }>();
  inspections.forEach((ins) => {
    const loc = ins.asset_location || 'Unknown';
    if (!locationMap.has(loc)) locationMap.set(loc, { count: 0, statuses: [], asset_location: loc });
    const entry = locationMap.get(loc)!;
    entry.count++;
    entry.statuses.push(ins.status);
  });
  return Array.from(locationMap.entries()).map(([loc, data]) => {
    const hasOverdue = data.statuses.includes('overdue');
    const color = hasOverdue ? 'red' : data.statuses.includes('in_progress') ? 'orange' : 'blue';
    return { location: loc, count: data.count, color };
  });
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-brand-cyan/15 border-brand-cyan/30',
  completed: 'bg-emerald-50 border-emerald-200',
  overdue: 'bg-red-50 border-red-200',
  in_progress: 'bg-amber-50 border-amber-200',
};

const statusBadge: Record<string, string> = {
  scheduled: 'bg-brand-cyan/10 text-brand-cyan',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-500',
  in_progress: 'bg-amber-50 text-amber-600',
};

interface Technician {
  id: string;
  full_name: string;
  role: string;
}

interface ScheduleInspection {
  id: string;
  inspection_type: string;
  asset_name: string;
  asset_location: string;
  inspector_name: string;
  inspector_id: string;
  scheduled_date: string;
  status: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
}

// ─── Draggable Inspection Card ───────────────────────────────────────────────

function DraggableCard({
  ins,
  isDragging,
  technicians,
  assigningId,
  onAssignStart,
  onAssign,
  canDrag,
  showAssign,
}: {
  ins: ScheduleInspection;
  isDragging: boolean;
  technicians: Technician[];
  assigningId: string | null;
  onAssignStart: (id: string) => void;
  onAssign: (inspectionId: string, newTechnicianId: string) => void;
  canDrag: boolean;
  showAssign: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dndDragging } = useDraggable({
    id: `card-${ins.id}`,
    disabled: !canDrag,
    data: { inspection: ins },
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    zIndex: 50,
  } : undefined;

  return (
    <div
      ref={canDrag ? setNodeRef : undefined}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      style={style}
      className={`p-2.5 rounded-lg border text-xs transition-all relative ${
        dndDragging || isDragging
          ? 'opacity-50 shadow-lg scale-105'
          : ''
      } ${statusColors[ins.status] || 'bg-gray-50 border-gray-100'} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <Link
        to={`/inspections/${ins.id}`}
        className="block"
        onClick={(e) => { if (dndDragging) e.preventDefault(); }}
      >
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-gray-800 truncate text-[11px] leading-tight">
            {ins.asset_name}
          </p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium flex-shrink-0 ${statusBadge[ins.status] || 'bg-gray-50 text-gray-500'}`}>
            {ins.status === 'in_progress' ? 'active' : ins.status}
          </span>
        </div>
        <p className="text-gray-500 mt-0.5 text-[10px] truncate">{ins.inspection_type}</p>
        <p className="text-gray-400 mt-0.5 text-[10px] truncate">{ins.asset_location}</p>
      </Link>

      {/* Assign dropdown — only for non-techs */}
      <div className="mt-1.5 pt-1.5 border-t border-gray-200/60">
        {showAssign && assigningId === ins.id ? (
          <select
            value={ins.inspector_id}
            onChange={(e) => onAssign(ins.id, e.target.value)}
            onBlur={() => onAssignStart('')}
            autoFocus
            className="w-full text-[10px] px-1.5 py-1 border border-gray-200 rounded bg-white cursor-pointer focus:outline-none focus:border-brand-gold"
          >
            <option value="">Unassigned</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name.split(' ')[0]}</option>
            ))}
          </select>
        ) : showAssign ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              onAssignStart(ins.id);
            }}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-brand-gold transition-colors cursor-pointer"
          >
            <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-500">
              {ins.inspector_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </span>
            <span className="truncate max-w-[60px]">{ins.inspector_name.split(' ')[0]}</span>
            <i className="ri-arrow-down-s-line text-[10px]"></i>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-500">
              {ins.inspector_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </span>
            <span className="text-[10px] text-gray-400 truncate">{ins.inspector_name.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Droppable Day Column ────────────────────────────────────────────────────

function DroppableDay({ date, children }: { date: Date; children: React.ReactNode }) {
  const dateKey = date.toISOString().slice(0, 10);
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
    data: { date: dateKey },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-r border-gray-100 last:border-r-0 p-1.5 space-y-1.5 min-h-[140px] transition-colors ${
        isOver ? 'bg-brand-gold/10' : ''
      } ${date.toDateString() === new Date().toDateString() ? 'bg-brand-gold/[0.03]' : ''}`}
    >
      {children}
    </div>
  );
}

// ─── Main Schedule Page ──────────────────────────────────────────────────────

export default function SchedulePage() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<ScheduleInspection[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'day' | 'myday' | 'map'>('week');
  const [selectedTechId, setSelectedTechId] = useState('all');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [useMockFallback, setUseMockFallback] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const currentDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + currentWeekOffset * 7);
    return d;
  }, [currentWeekOffset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: techData, error: techErr } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'technician')
        .order('full_name');

      if (techErr) throw techErr;
      setTechnicians(techData || []);

      let query = supabase
        .from('inspections')
        .select(`
          id, inspection_type, scheduled_date, status, inspector_id,
          checked_in_at, checked_out_at,
          assets:asset_id (name, location),
          profiles:inspector_id (full_name)
        `)
        .order('scheduled_date');

      if (user?.role === 'technician') {
        query = query.eq('inspector_id', user.id);
      }

      const { data: inspData, error: inspErr } = await query;
      if (inspErr) throw inspErr;

      setInspections((inspData || []).map((item: any) => ({
        id: item.id,
        inspection_type: item.inspection_type,
        asset_name: item.assets?.name || 'Unknown',
        asset_location: item.assets?.location || 'Unknown',
        inspector_name: item.profiles?.full_name || 'Unassigned',
        inspector_id: item.inspector_id || '',
        scheduled_date: item.scheduled_date,
        status: item.status,
        checked_in_at: item.checked_in_at || null,
        checked_out_at: item.checked_out_at || null,
      })));
      setUseMockFallback(false);
    } catch {
      const mockUsers = [
        { id: 'usr-003', full_name: 'Mike Rodriguez', role: 'technician' },
        { id: 'usr-004', full_name: 'Lisa Thompson', role: 'technician' },
      ];
      setTechnicians(mockUsers);

      const filtered = user?.role === 'technician'
        ? mockInspections.filter((i: any) => i.inspectorName === user?.fullName)
        : mockInspections;

      setInspections(filtered.map((i: any) => ({
        id: i.id,
        inspection_type: i.type,
        asset_name: i.assetName,
        asset_location: i.location,
        inspector_name: i.inspectorName,
        inspector_id: mockUsers.find((u) => u.full_name === i.inspectorName)?.id || '',
        scheduled_date: i.scheduledDate,
        status: i.status,
        checked_in_at: null,
        checked_out_at: null,
      })));
      setUseMockFallback(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const result = new Date(d);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const filteredInspections = useMemo(() => {
    if (selectedTechId === 'all') return inspections;
    return inspections.filter((ins) => ins.inspector_id === selectedTechId);
  }, [inspections, selectedTechId]);

  const getInspectionsForDate = (date: Date) => {
    return filteredInspections.filter((ins) => {
      const insDate = new Date(ins.scheduled_date + 'T00:00:00');
      return (
        insDate.getDate() === date.getDate() &&
        insDate.getMonth() === date.getMonth() &&
        insDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const selectedTechnician = useMemo(() => {
    if (selectedTechId === 'all') return null;
    return technicians.find((t) => t.id === selectedTechId);
  }, [selectedTechId, technicians]);

  const handleAssign = async (inspectionId: string, newTechnicianId: string) => {
    if (useMockFallback) {
      setInspections((prev) =>
        prev.map((ins) => {
          if (ins.id === inspectionId) {
            const newTech = technicians.find((t) => t.id === newTechnicianId);
            return { ...ins, inspector_id: newTechnicianId, inspector_name: newTech?.full_name || ins.inspector_name };
          }
          return ins;
        })
      );
      setAssigningId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ inspector_id: newTechnicianId })
        .eq('id', inspectionId);

      if (error) throw error;

      setInspections((prev) =>
        prev.map((ins) => {
          if (ins.id === inspectionId) {
            const newTech = technicians.find((t) => t.id === newTechnicianId);
            return { ...ins, inspector_id: newTechnicianId, inspector_name: newTech?.full_name || ins.inspector_name };
          }
          return ins;
        })
      );
    } catch (err) {
      console.error('Failed to assign:', err);
    } finally {
      setAssigningId(null);
    }
  };

  // ─── Drag & Drop Handler ──────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Extract inspection ID from draggable
    if (!activeId.startsWith('card-')) return;

    const inspectionId = activeId.replace('card-', '');
    const inspection = inspections.find((i) => i.id === inspectionId);
    if (!inspection) return;

    // Determine target date
    let targetDate: string | null = null;

    if (overId.startsWith('day-')) {
      targetDate = overId.replace('day-', '');
    }

    if (!targetDate) return;
    if (targetDate === inspection.scheduled_date.slice(0, 10)) return;

    // Update local state immediately for responsiveness
    setInspections((prev) =>
      prev.map((ins) =>
        ins.id === inspectionId
          ? { ...ins, scheduled_date: targetDate! }
          : ins
      )
    );

    // Persist to Supabase
    if (!useMockFallback) {
      try {
        await supabase
          .from('inspections')
          .update({ scheduled_date: targetDate })
          .eq('id', inspectionId);
      } catch {
        // Revert on error — refetch
        fetchData();
      }
    }
  };

  // ─── Check In / Check Out ─────────────────────────────────────────────────

  const handleCheckIn = async (inspectionId: string) => {
    const now = new Date().toISOString();

    setInspections((prev) =>
      prev.map((ins) =>
        ins.id === inspectionId ? { ...ins, checked_in_at: now } : ins
      )
    );

    if (!useMockFallback) {
      try {
        await supabase
          .from('inspections')
          .update({ checked_in_at: now })
          .eq('id', inspectionId);
      } catch {
        fetchData();
      }
    }
  };

  const handleCheckOut = async (inspectionId: string) => {
    const now = new Date().toISOString();

    setInspections((prev) =>
      prev.map((ins) =>
        ins.id === inspectionId ? { ...ins, checked_out_at: now } : ins
      )
    );

    if (!useMockFallback) {
      try {
        await supabase
          .from('inspections')
          .update({ checked_out_at: now })
          .eq('id', inspectionId);
      } catch {
        fetchData();
      }
    }
  };

  // ─── Bulk Reschedule ──────────────────────────────────────────────────────

  const handleBulkConfirm = async (payload: {
    inspectionIds: string[];
    action: 'reassign' | 'reschedule' | 'both';
    newTechnicianId?: string;
    newDate?: string;
  }) => {
    if (useMockFallback) {
      setInspections((prev) =>
        prev.map((ins) => {
          if (!payload.inspectionIds.includes(ins.id)) return ins;
          const updated = { ...ins };
          if (payload.action === 'reassign' || payload.action === 'both') {
            const newTech = technicians.find((t) => t.id === payload.newTechnicianId);
            if (newTech) {
              updated.inspector_id = payload.newTechnicianId!;
              updated.inspector_name = newTech.full_name;
            }
          }
          if (payload.action === 'reschedule' || payload.action === 'both') {
            if (payload.newDate) {
              updated.scheduled_date = payload.newDate;
            }
          }
          return updated;
        })
      );
      return;
    }

    const updates: Record<string, any> = {};
    if (payload.action === 'reassign' || payload.action === 'both') {
      updates.inspector_id = payload.newTechnicianId;
    }
    if (payload.action === 'reschedule' || payload.action === 'both') {
      updates.scheduled_date = payload.newDate;
    }

    const promises = payload.inspectionIds.map((id) =>
      supabase.from('inspections').update(updates).eq('id', id)
    );
    await Promise.all(promises);
    await fetchData();
  };

  const navigateWeek = (direction: number) => {
    setCurrentWeekOffset((prev) => prev + direction);
  };

  const weekLabel = useMemo(() => {
    const start = weekStart;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', formatOpts);
    const endStr = end.toLocaleDateString('en-US', { ...formatOpts, year: 'numeric' });
    return `${startStr} — ${endStr}`;
  }, [weekStart]);

  const canDrag = user?.role !== 'technician';

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Schedule</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {view === 'myday' ? 'Today\'s inspections' : weekLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Technician filter — only for non-techs */}
            {user && user.role !== 'technician' && (
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:border-brand-gold"
              >
                <option value="all">All Technicians</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            )}

            {/* View toggles */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setView('myday')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  view === 'myday' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Day
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  view === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ri-map-pin-line mr-1"></i> Map
              </button>
            </div>

            {/* Week navigation — only for week/day views */}
            {view !== 'myday' && view !== 'map' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateWeek(-1)}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-arrow-left-s-line text-gray-500 text-sm"></i>
                </button>
                <button
                  onClick={() => setCurrentWeekOffset(0)}
                  className="px-2 py-1 text-xs font-medium text-brand-gold hover:bg-brand-gold/5 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateWeek(1)}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-arrow-right-s-line text-gray-500 text-sm"></i>
                </button>
              </div>
            )}

            {/* Bulk reschedule button */}
            {user && user.role !== 'technician' && view !== 'myday' && view !== 'map' && selectedTechId !== 'all' && selectedTechnician && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-stack-line mr-1"></i> Bulk Actions
              </button>
            )}

            {/* Drag hint */}
            {canDrag && view === 'week' && (
              <span className="text-[10px] text-gray-400 hidden lg:inline-flex items-center gap-1">
                <i className="ri-drag-move-line"></i> Drag to reschedule
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
          </div>
        ) : view === 'myday' ? (
          <MyDayView
            inspections={inspections}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            loading={false}
          />
        ) : view === 'map' ? (
          <div className="space-y-4">
            {/* Map container */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Inspection Sites Map</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {filteredInspections.length} inspections across {
                      new Set(filteredInspections.map((i) => i.asset_location)).size
                    } locations
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Overdue
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> In Progress
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan"></span> Scheduled
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
                  </div>
                </div>
              </div>
              <div className="relative w-full" style={{ height: '550px' }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d193623.72592161594!2d-74.06491511084818!3d40.697663723491496!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew%20York%2C%20NY!5e0!3m2!1sen!2sus!4v1718400000000!5m2!1sen!2sus"
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Inspection Sites Map"
                ></iframe>
              </div>
            </div>

            {/* Location summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(() => {
                const locationGroups = new Map<string, ScheduleInspection[]>();
                filteredInspections.forEach((ins) => {
                  const loc = ins.asset_location || 'Unknown';
                  if (!locationGroups.has(loc)) locationGroups.set(loc, []);
                  locationGroups.get(loc)!.push(ins);
                });

                return Array.from(locationGroups.entries()).map(([loc, inspections]) => {
                  const overdue = inspections.filter((i) => i.status === 'overdue').length;
                  const inProgress = inspections.filter((i) => i.status === 'in_progress').length;
                  const completed = inspections.filter((i) => i.status === 'completed').length;
                  return (
                    <div key={loc} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-brand-gold/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-lg bg-brand-navy/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="ri-map-pin-line text-brand-navy text-lg"></i>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{loc}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {overdue > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                {overdue} overdue
                              </span>
                            )}
                            {inProgress > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                {inProgress} active
                              </span>
                            )}
                            {completed > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {completed} done
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* Calendar grid with DnD */}
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gray-100">
                  {days.map((day, i) => {
                    const date = weekDays[i];
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dateInspections = getInspectionsForDate(date);
                    return (
                      <div
                        key={day}
                        className={`px-2 py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-brand-gold/5' : ''}`}
                      >
                        <p className="text-xs text-gray-400 font-medium">{day}</p>
                        <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand-gold' : 'text-gray-900'}`}>
                          {date.getDate()}
                        </p>
                        {dateInspections.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-navy text-white text-[10px] font-bold mt-1">
                            {dateInspections.length}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Calendar body */}
                <div className="grid grid-cols-7 min-h-[500px]">
                  {weekDays.map((date, i) => {
                    const dateInspections = getInspectionsForDate(date);
                    return (
                      <DroppableDay key={i} date={date}>
                        {dateInspections.map((ins) => (
                          <DraggableCard
                            key={ins.id}
                            ins={ins}
                            isDragging={draggingId === `card-${ins.id}`}
                            technicians={technicians}
                            assigningId={canDrag ? assigningId : null}
                            onAssignStart={setAssigningId}
                            onAssign={handleAssign}
                            canDrag={canDrag}
                            showAssign={user?.role !== 'technician'}
                          />
                        ))}

                        {dateInspections.length === 0 && (
                          <div className="h-full min-h-[80px] flex items-center justify-center">
                            <span className="text-[10px] text-gray-300">—</span>
                          </div>
                        )}
                      </DroppableDay>
                    );
                  })}
                </div>
              </div>
            </DndContext>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-cyan/30 border border-brand-cyan/40"></span>
                Scheduled
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-50 border border-emerald-200"></span>
                Completed
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200"></span>
                Overdue
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-200"></span>
                In Progress
              </div>
            </div>
          </>
        )}

        {/* Bulk Reschedule Modal */}
        {selectedTechnician && (
          <BulkRescheduleModal
            isOpen={showBulkModal}
            onClose={() => setShowBulkModal(false)}
            technicianName={selectedTechnician.full_name}
            technicians={technicians}
            allInspections={inspections.filter(
              (ins) => ins.inspector_id === selectedTechId
            )}
            onConfirm={handleBulkConfirm}
          />
        )}
      </div>
    </DashboardLayout>
  );
}