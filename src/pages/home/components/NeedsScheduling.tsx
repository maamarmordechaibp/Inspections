import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import BulkScheduleModal from './BulkScheduleModal';

interface NeedsSchedulingItem {
  assetId: string;
  assetName: string;
  assetType: string;
  location: string;
  customerId: string | null;
  customerName: string;
  nextDue: string;
  daysUntilDue: number;
}

interface NeedsSchedulingProps {
  items: NeedsSchedulingItem[];
  onScheduled?: () => void;
}

const typeIcons: Record<string, string> = {
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

const typeColors: Record<string, string> = {
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

export default function NeedsScheduling({ items, onScheduled }: NeedsSchedulingProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Extract unique customers from items
  const customers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    items.forEach((item) => {
      const key = item.customerId || 'unknown';
      if (!map.has(key)) {
        map.set(key, { id: item.customerId || '', name: item.customerName || 'No Customer', count: 0 });
      }
      map.get(key)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [items]);

  // Filter items by selected customer
  const filteredItems = useMemo(() => {
    if (customerFilter === 'all') return items;
    if (customerFilter === 'unknown') return items.filter((i) => !i.customerId);
    return items.filter((i) => i.customerId === customerFilter);
  }, [items, customerFilter]);

  const selectedCustomer = customers.find((c) => c.id === customerFilter);

  const overdue = filteredItems.filter((i) => i.daysUntilDue < 0);
  const dueThisWeek = filteredItems.filter((i) => i.daysUntilDue >= 0 && i.daysUntilDue <= 7);
  const upcoming = filteredItems.filter((i) => i.daysUntilDue > 7);

  const allIds = new Set(filteredItems.map((i) => i.assetId));
  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;
  const someSelected = selectedIds.size > 0;
  const selectedItems = filteredItems.filter((i) => selectedIds.has(i.assetId));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectOverdue = () => {
    setSelectedIds(new Set(overdue.map((i) => i.assetId)));
  };

  const handleScheduled = () => {
    setSelectedIds(new Set());
    onScheduled?.();
  };

  const handleCustomerChange = (customerId: string) => {
    setCustomerFilter(customerId);
    setShowCustomerDropdown(false);
    setSelectedIds(new Set());
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <i className="ri-calendar-todo-line"></i>
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Needs Scheduling</h3>
                <p className="text-xs text-gray-400">
                  {filteredItems.length} asset{filteredItems.length !== 1 ? 's' : ''} need{filteredItems.length === 1 ? 's' : ''} attention
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filteredItems.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    allSelected ? 'bg-brand-gold border-brand-gold' : 'border-gray-300'
                  }`}>
                    {allSelected && <i className="ri-check-line text-[10px] text-white"></i>}
                  </span>
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
              {overdue.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">
                  {overdue.length} overdue
                </span>
              )}
              {dueThisWeek.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">
                  {dueThisWeek.length} this week
                </span>
              )}
            </div>
          </div>

          {/* Customer filter row */}
          {customers.length > 1 && (
            <div className="mt-3 relative">
              <button
                type="button"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white hover:border-gray-300 transition-colors cursor-pointer"
              >
                <i className="ri-building-2-line text-gray-400"></i>
                <span className="text-gray-600">
                  {customerFilter === 'all' ? 'All Customers' : selectedCustomer?.name || 'Filtered'}
                </span>
                {customerFilter !== 'all' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-gold/10 text-brand-gold">
                    {filteredItems.length}
                  </span>
                )}
                <i className={`ri-arrow-down-s-line text-gray-400 text-xs transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {showCustomerDropdown && (
                <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[240px]">
                  <div className="max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleCustomerChange('all')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        customerFilter === 'all' ? 'bg-brand-gold/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm text-gray-700">All Customers</span>
                      <span className="text-[11px] text-gray-400">{items.length}</span>
                    </button>
                    {customers.map((c) => (
                      <button
                        key={c.id || 'unknown'}
                        type="button"
                        onClick={() => handleCustomerChange(c.id || 'unknown')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          customerFilter === c.id || (customerFilter === 'unknown' && !c.id)
                            ? 'bg-brand-gold/5'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-sm text-gray-700 truncate pr-2">{c.name}</span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showCustomerDropdown && (
                <div className="fixed inset-0 z-10" onClick={() => setShowCustomerDropdown(false)}></div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {filteredItems.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <span className="w-10 h-10 flex items-center justify-center mx-auto mb-2 text-gray-300">
              <i className="ri-check-double-line text-2xl"></i>
            </span>
            <p className="text-sm text-gray-500">
              {customerFilter !== 'all' ? 'All assets for this customer are scheduled.' : 'All assets are scheduled.'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Nothing needs attention right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Overdue section */}
            {overdue.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500"></span>
                    Overdue — Schedule Immediately
                  </p>
                  <button
                    onClick={selectOverdue}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium cursor-pointer whitespace-nowrap"
                  >
                    Select all overdue
                  </button>
                </div>
                {overdue.map((item) => (
                  <SchedulingRow
                    key={item.assetId}
                    item={item}
                    selected={selectedIds.has(item.assetId)}
                    onToggle={() => toggleOne(item.assetId)}
                  />
                ))}
              </div>
            )}

            {/* Due this week section */}
            {dueThisWeek.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-amber-50/50 border-b border-amber-100">
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                    Due This Week
                  </p>
                </div>
                {dueThisWeek.map((item) => (
                  <SchedulingRow
                    key={item.assetId}
                    item={item}
                    selected={selectedIds.has(item.assetId)}
                    onToggle={() => toggleOne(item.assetId)}
                  />
                ))}
              </div>
            )}

            {/* Upcoming section */}
            {upcoming.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                    Upcoming
                  </p>
                </div>
                {upcoming.map((item) => (
                  <SchedulingRow
                    key={item.assetId}
                    item={item}
                    selected={selectedIds.has(item.assetId)}
                    onToggle={() => toggleOne(item.assetId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer link */}
        {filteredItems.length > 0 && !someSelected && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <Link
              to="/assets"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-navy hover:text-brand-gold transition-colors cursor-pointer"
            >
              <i className="ri-calendar-event-line"></i>
              Go to Assets to schedule
              <i className="ri-arrow-right-line"></i>
            </Link>
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-brand-navy text-white rounded-2xl shadow-lg px-5 py-3 animate-[slideUp_0.2s_ease-out]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-double-line text-sm"></i>
            </span>
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedIds.size} asset{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear
            </button>
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-xs font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <i className="ri-calendar-event-line"></i>
              Schedule All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Schedule Modal */}
      <BulkScheduleModal
        selectedItems={selectedItems}
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onScheduled={handleScheduled}
      />
    </>
  );
}

function SchedulingRow({
  item,
  selected,
  onToggle,
}: {
  item: NeedsSchedulingItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const isOverdue = item.daysUntilDue < 0;
  const daysText = isOverdue
    ? `${Math.abs(item.daysUntilDue)} day${Math.abs(item.daysUntilDue) !== 1 ? 's' : ''} overdue`
    : item.daysUntilDue === 0
      ? 'Due today'
      : `${item.daysUntilDue} day${item.daysUntilDue !== 1 ? 's' : ''} left`;

  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer ${
        selected ? 'bg-brand-gold/5' : 'hover:bg-gray-50/50'
      }`}
    >
      {/* Checkbox */}
      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'bg-brand-gold border-brand-gold' : 'border-gray-300 hover:border-gray-400'
      }`}>
        {selected && <i className="ri-check-line text-[12px] text-white"></i>}
      </span>

      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[item.assetType] || 'bg-gray-100 text-gray-500'}`}>
        <i className={`${typeIcons[item.assetType] || 'ri-tools-line'} text-sm`}></i>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {item.assetName}
          </span>
          {item.customerId && (
            <span className="text-[11px] text-gray-400 truncate hidden sm:inline">
              {item.customerName}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{item.assetType} · {item.location}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-gray-400 hidden sm:inline">
          {new Date(item.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
          isOverdue ? 'bg-red-50 text-red-600' :
          item.daysUntilDue <= 3 ? 'bg-amber-50 text-amber-600' :
          'bg-brand-cyan/10 text-brand-cyan'
        }`}>
          {daysText}
        </span>
      </div>
      <Link
        to={`/assets/${item.assetId}`}
        onClick={(e) => e.stopPropagation()}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-navy transition-colors cursor-pointer flex-shrink-0"
      >
        <i className="ri-arrow-right-s-line"></i>
      </Link>
    </div>
  );
}