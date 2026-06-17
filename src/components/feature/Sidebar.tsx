import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context';
import { useNeedsSchedulingCount } from '@/hooks/useNeedsSchedulingCount';
import Logo from '@/components/base/Logo';

const navItems: { path: string; icon: string; label: string; allowedRoles: string[] }[] = [
  { path: '/', icon: 'ri-dashboard-line', label: 'Dashboard', allowedRoles: ['admin', 'manager', 'technician'] },
  { path: '/inspections', icon: 'ri-clipboard-line', label: 'Inspections', allowedRoles: ['admin', 'manager', 'technician'] },
  { path: '/customers', icon: 'ri-building-2-line', label: 'Customers', allowedRoles: ['admin', 'manager', 'technician'] },
  { path: '/schedule', icon: 'ri-calendar-line', label: 'Schedule', allowedRoles: ['admin', 'manager', 'technician'] },
  { path: '/assets', icon: 'ri-tools-line', label: 'Assets', allowedRoles: ['admin', 'manager', 'technician'] },
  { path: '/recurring-schedules', icon: 'ri-calendar-check-line', label: 'Recurring', allowedRoles: ['admin', 'manager'] },
  { path: '/deficiencies', icon: 'ri-error-warning-line', label: 'Deficiencies', allowedRoles: ['admin', 'manager', 'technician'] },
  { path: '/proposals', icon: 'ri-file-list-line', label: 'Proposals', allowedRoles: ['admin', 'manager'] },
  { path: '/work-orders', icon: 'ri-hammer-line', label: 'Work Orders', allowedRoles: ['admin', 'manager', 'technician'] },
  { path: '/invoices', icon: 'ri-bill-line', label: 'Invoices', allowedRoles: ['admin', 'manager'] },
  { path: '/reports', icon: 'ri-file-chart-line', label: 'Reports', allowedRoles: ['admin', 'manager'] },
  { path: '/compliance', icon: 'ri-shield-check-line', label: 'Compliance', allowedRoles: ['admin', 'manager'] },
  { path: '/users', icon: 'ri-team-line', label: 'Users', allowedRoles: ['admin'] },
  { path: '/audit-logs', icon: 'ri-history-line', label: 'Audit Logs', allowedRoles: ['admin'] },
  { path: '/dispatch', icon: 'ri-radar-line', label: 'Dispatch', allowedRoles: ['admin', 'manager'] },
];

const roleLabels = {
  admin: 'Administrator',
  manager: 'Manager',
  technician: 'Technician',
};

export default function Sidebar() {
  const { user } = useAuth();
  const { count: needsSchedulingCount } = useNeedsSchedulingCount();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const badgeCount = needsSchedulingCount > 99 ? '99+' : needsSchedulingCount;

  const sidebarContent = (
    <div className={`flex flex-col h-full ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
      <div className="flex items-center gap-3 px-5 py-5 md:py-6 border-b border-white/5">
        {!collapsed && <Logo variant="full" light />}
        {collapsed && <Logo variant="icon" light className="mx-auto" />}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems
          .filter((item) => user && item.allowedRoles.includes(user.role))
          .map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap group ${
                isActive
                  ? 'bg-brand-gold/15 text-brand-gold'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <span className="w-8 h-8 flex items-center justify-center relative">
              <i className={`${item.icon} text-lg`}></i>
              {item.path === '/' && needsSchedulingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none px-1 shadow-[0_0_0_2px_rgba(15,23,42,1)]">
                  {badgeCount}
                </span>
              )}
            </span>
            {!collapsed && (
              <span className="flex items-center gap-2 flex-1">
                <span>{item.label}</span>
                {item.path === '/' && needsSchedulingCount > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1.5">
                    {badgeCount}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">{roleLabels[user.role]}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 w-full transition-all duration-200"
        >
          <span className="w-8 h-8 flex items-center justify-center">
            <i className={`text-lg ${collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'}`}></i>
          </span>
          {!collapsed && <span>Collapse</span>}
        </button>

        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 w-full transition-all duration-200"
        >
          <span className="w-8 h-8 flex items-center justify-center">
            <i className="ri-close-line text-lg"></i>
          </span>
          <span>Close Menu</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop spacer */}
      <div className={`hidden lg:block ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 flex-shrink-0`} />

      {/* Mobile overlay sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 bg-brand-navy flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:hidden`}>
        {sidebarContent}
      </div>

      {/* Desktop static sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40 bg-brand-navy flex flex-col">
        {sidebarContent}
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger - positioned in header area */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-2.5 left-3 z-30 w-9 h-9 rounded-lg bg-brand-navy text-white flex items-center justify-center shadow-sm"
        aria-label="Open menu"
      >
        <i className="ri-menu-line text-lg"></i>
      </button>

      {/* Mobile bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-1.5 safe-bottom">
        {navItems
          .filter((item) => user && item.allowedRoles.includes(user.role))
          .slice(0, 5)
          .map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1 py-1 min-w-0 rounded-lg transition-colors ${
                isActive
                  ? 'text-brand-gold'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className={`${item.icon} text-lg`}></i>
            </span>
            <span className="text-[10px] font-medium leading-none whitespace-nowrap">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-1 py-1 min-w-0 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-more-line text-lg"></i>
          </span>
          <span className="text-[10px] font-medium leading-none whitespace-nowrap">More</span>
        </button>
      </nav>
    </>
  );
}