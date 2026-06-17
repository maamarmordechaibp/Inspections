import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function Header() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, loading: notifLoading, markAsRead, markAllAsRead } = useNotifications();
  const { isOnline, pendingCount, syncing, syncNow } = useOfflineSync();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-sm md:text-base font-semibold text-brand-navy">DouseFire Inspect</h1>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          {/* Offline / sync status */}
          {(!isOnline || pendingCount > 0) && (
            <button
              onClick={() => { if (isOnline && pendingCount > 0) syncNow(); }}
              disabled={!isOnline || syncing}
              title={!isOnline ? 'You are offline — changes are saved locally' : syncing ? 'Syncing…' : `${pendingCount} change(s) waiting to sync — tap to sync now`}
              aria-label={!isOnline ? 'Offline' : `${pendingCount} changes pending sync`}
              className={`flex items-center gap-1.5 h-9 px-2.5 rounded-lg transition-colors cursor-pointer ${
                !isOnline
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20'
              }`}
            >
              <i
                className={`text-base ${
                  !isOnline
                    ? 'ri-cloud-off-line'
                    : syncing
                    ? 'ri-loader-4-line animate-spin'
                    : 'ri-refresh-line'
                }`}
              ></i>
              {pendingCount > 0 && (
                <span className="text-xs font-bold leading-none">{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
              {!isOnline && <span className="hidden sm:inline text-xs font-semibold">Offline</span>}
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={() => { setNotifDropdownOpen(!notifDropdownOpen); setUserDropdownOpen(false); }}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              aria-haspopup="true"
              aria-expanded={notifDropdownOpen}
              className="relative w-9 h-9 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="ri-notification-3-line text-gray-500 text-base md:text-lg" aria-hidden="true"></i>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 shadow-[0_0_0_2px_rgba(255,255,255,1)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    {unreadCount > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{unreadCount} unread</p>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                      className="text-xs font-medium text-brand-navy hover:text-brand-gold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[360px] overflow-y-auto">
                  {notifLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <i className="ri-loader-4-line animate-spin text-gray-300 text-xl"></i>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4">
                      <span className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                        <i className="ri-notification-off-line text-gray-300 text-lg"></i>
                      </span>
                      <p className="text-sm text-gray-500">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-0.5">You'll see new assignments here</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors cursor-pointer border-b border-gray-50 last:border-b-0 ${
                          !n.is_read ? 'bg-brand-gold/3 hover:bg-brand-gold/8' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Unread indicator */}
                          <div className="mt-0.5 flex-shrink-0">
                            {!n.is_read ? (
                              <span className="w-2 h-2 rounded-full bg-brand-gold block mt-1.5"></span>
                            ) : (
                              <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                <i className="ri-calendar-check-line text-gray-400 text-sm"></i>
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-line">
                              {n.body.split('\n').slice(0, 2).join(' — ')}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-gray-400">{getTimeAgo(n.created_at)}</span>
                              {n.inspection_count > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-brand-navy/5 text-brand-navy">
                                  {n.inspection_count} inspection{n.inspection_count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => { setUserDropdownOpen(!userDropdownOpen); setNotifDropdownOpen(false); }}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={userDropdownOpen}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center text-xs font-bold">
                {user.avatar}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <p className="text-sm font-semibold text-brand-navy">{user.fullName}</p>
                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
              </div>
              <i className={`ri-arrow-down-s-line text-gray-400 text-sm transition-transform hidden md:block ${userDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-100 py-1.5 shadow-lg z-50">
                <div className="px-4 py-2.5 border-b border-gray-50 sm:hidden">
                  <p className="text-sm font-semibold text-brand-navy">{user.fullName}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                  <i className="ri-user-settings-line text-base w-5 h-5 flex items-center justify-center"></i>
                  Profile Settings
                </button>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                  <i className="ri-settings-3-line text-base w-5 h-5 flex items-center justify-center"></i>
                  Preferences
                </button>

                {/* Language switcher */}
                <div className="border-t border-gray-50 my-1" />
                <div className="px-4 py-2">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">{t('common.language')}</p>
                  <div className="flex gap-1">
                    {([
                      { code: 'en', label: 'English' },
                      { code: 'es', label: 'Español' },
                    ] as const).map((l) => (
                      <button
                        key={l.code}
                        onClick={() => i18n.changeLanguage(l.code)}
                        aria-pressed={i18n.resolvedLanguage === l.code}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          i18n.resolvedLanguage === l.code
                            ? 'bg-brand-navy text-white'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-50 my-1" />
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <i className="ri-logout-box-line text-base w-5 h-5 flex items-center justify-center"></i>
                  {t('action.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}