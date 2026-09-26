import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import {
  Building2,
  ChevronDown,
  LogOut,
  Sparkles,
  Check,
  UserCheck,
  GraduationCap,
  Menu,
  Bell,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link_tab: string | null;
  is_read: number;
  created_at: string;
}

interface NavbarProps {
  onMenuClick?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onNavigate }) => {
  const { user, currentBranch, quickSwitchUser, logout } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await apiFetch<{ notifications: Notification[]; unreadCount: number }>('/notifications/me');
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      // Silent — the bell just stays empty if this fails, no need to interrupt the page
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    // Light polling so the badge updates without a full page refresh
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Lock background scroll while a mobile sheet is open — standard iOS sheet behavior
  useEffect(() => {
    const anySheetOpen = showNotifications || showRoleSwitcher;
    if (anySheetOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [showNotifications, showRoleSwitcher]);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'POST' });
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error(err);
      }
    }
    if (n.link_tab && onNavigate) {
      onNavigate(n.link_tab);
    }
    setShowNotifications(false);
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const institutionalRoles = [
    { email: 'admin@sirmv.edu.in', label: 'Administrator', role: 'ADMIN', color: 'bg-purple-100 text-purple-900' },
    { email: 'principal@sirmv.edu.in', label: 'College Principal', role: 'PRINCIPAL', color: 'bg-emerald-100 text-emerald-900' },
    { email: 'hod.physics@sirmv.edu.in', label: 'HOD Physics', role: 'HOD', color: 'bg-blue-100 text-blue-900' },
    { email: 'lecturer@sirmv.edu.in', label: 'Teaching Faculty', role: 'TEACHER', color: 'bg-amber-100 text-amber-900' },
    { email: 'attender@sirmv.edu.in', label: 'Floor Operations', role: 'FLOOR_ATTENDER', color: 'bg-orange-100 text-orange-900' },
    { email: 'staff@sirmv.edu.in', label: 'Administrative Staff', role: 'NON_TEACHING_STAFF', color: 'bg-indigo-100 text-indigo-900' },
    { email: 'warden@sirmv.edu.in', label: 'Hostel Warden', role: 'WARDEN', color: 'bg-teal-100 text-teal-900' },
    { email: 'headwarden@sirmv.edu.in', label: 'Chief Warden', role: 'HEAD_WARDEN', color: 'bg-emerald-100 text-emerald-900' },
    { email: 'student@sirmv.edu.in', label: 'Student Account', role: 'STUDENT', color: 'bg-cyan-100 text-cyan-900' },
    { email: 'parent@sirmv.edu.in', label: 'Parent Portal', role: 'PARENT', color: 'bg-pink-100 text-pink-900' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#fdfcf9] border-b border-[#ded8cb] shadow-2xs safe-top">
      <div className="px-3 sm:px-4 md:px-6 flex items-center justify-between h-16 gap-2">

        {/* Left: Hamburger (mobile) + Brand & Campus Identification */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile menu toggle — opens the Sidebar drawer */}
          <button
            onClick={onMenuClick}
            className="press md:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:bg-[#ebe7df] transition shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Official Institution Logo */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-2xs shrink-0 border border-[#ded8cb]">
            <img
              src="/logo.png"
              alt="SIR MV Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight font-heading truncate">
                SIR MV <span className="text-blue-600">PU COLLEGE</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#ebe7df] text-slate-700 border border-[#ded8cb] shrink-0">
                CAMPUS ERP
              </span>
            </div>
            <div className="hidden sm:flex text-[11px] text-blue-700 font-bold items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Shivamogga PU Campus</span>
            </div>
          </div>
        </div>

        {/* Right: Active Role Badge + 1-Click Role Switcher + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="press relative p-2 rounded-xl border border-[#ded8cb] bg-white hover:bg-slate-50 transition shadow-2xs"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                {/* Mobile: backdrop + bottom sheet, portaled to <body> so they escape the
                    header's own stacking context (position:sticky + z-index creates one,
                    which otherwise traps position:fixed descendants' paint order) */}
                {createPortal(
                  <div className="sm:hidden">
                    <div
                      className="fixed inset-0 bg-black/40 z-[100] animate-backdrop-in"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-3xl shadow-2xl border-t border-[#ded8cb] animate-sheet-up safe-bottom max-h-[75dvh] flex flex-col">
                      <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                        <div className="w-9 h-1 rounded-full bg-slate-300" />
                      </div>
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <span className="text-sm font-bold text-slate-800">Notifications</span>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="press text-xs font-bold text-blue-600">
                              Mark all read
                            </button>
                          )}
                          <button onClick={() => setShowNotifications(false)} className="press p-1 text-slate-400">
                            <X className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto py-1 flex-1">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-xs text-slate-400 text-center">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`press w-full text-left px-4 py-3 active:bg-slate-100 flex items-start gap-2 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                            >
                              {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />}
                              <div className={`min-w-0 ${n.is_read ? 'pl-3.5' : ''}`}>
                                <p className="text-sm font-bold text-slate-800">{n.title}</p>
                                {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                                <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {/* Desktop / tablet: anchored dropdown — stays in the normal tree since it
                    needs the .relative bell wrapper as its positioning parent */}
                <div className="hidden sm:block absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#ded8cb] py-2 z-50 overflow-hidden animate-scale-in origin-top-right">
                  <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="press text-[10px] font-bold text-blue-600 hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto py-1">
                    {notifications.length === 0 ? (
                      <p className="px-3.5 py-6 text-xs text-slate-400 text-center">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`press w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition flex items-start gap-2 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                        >
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />}
                          <div className={`min-w-0 ${n.is_read ? 'pl-3.5' : ''}`}>
                            <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                            {n.message && <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Active User Role Badge & Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="press flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-[#ded8cb] bg-white hover:bg-slate-50 transition shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs shrink-0">
                {user?.role?.[0] || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                  {user?.role || 'ADMIN'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 hidden sm:block" />
            </button>

            {showRoleSwitcher && (
              <>
                {/* Mobile: backdrop + bottom sheet, portaled to <body> — same stacking-context
                    escape as the notification sheet above */}
                {createPortal(
                  <div className="sm:hidden">
                    <div
                      className="fixed inset-0 bg-black/40 z-[100] animate-backdrop-in"
                      onClick={() => setShowRoleSwitcher(false)}
                    />
                    <div className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-3xl shadow-2xl border-t border-[#ded8cb] animate-sheet-up safe-bottom max-h-[80dvh] flex flex-col">
                      <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                        <div className="w-9 h-1 rounded-full bg-slate-300" />
                      </div>
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-600" /> Switch Role Persona
                        </span>
                        <button onClick={() => setShowRoleSwitcher(false)} className="press p-1 text-slate-400">
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>
                      <div className="overflow-y-auto py-1 flex-1">
                        {institutionalRoles.map((roleItem) => {
                          const isCurrent = user?.role === roleItem.role;
                          return (
                            <button
                              key={roleItem.role}
                              onClick={() => {
                                quickSwitchUser(roleItem.email);
                                setShowRoleSwitcher(false);
                              }}
                              className={`press w-full text-left px-4 py-3 active:bg-slate-100 flex items-center justify-between ${isCurrent ? 'bg-blue-50/50' : ''}`}
                            >
                              <div>
                                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                  <span>{roleItem.label}</span>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{roleItem.email}</div>
                              </div>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${roleItem.color}`}>
                                {roleItem.role}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}

                {/* Desktop / tablet: anchored dropdown — stays in the normal tree since it
                    needs the .relative wrapper as its positioning parent */}
                <div className="hidden sm:block absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#ded8cb] py-2 z-50 overflow-hidden animate-scale-in origin-top-right">
                  <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Switch Role Persona
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Pass: 123456</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1">
                    {institutionalRoles.map((roleItem) => {
                      const isCurrent = user?.role === roleItem.role;
                      return (
                        <button
                          key={roleItem.role}
                          onClick={() => {
                            quickSwitchUser(roleItem.email);
                            setShowRoleSwitcher(false);
                          }}
                          className={`press w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between transition ${isCurrent ? 'bg-blue-50/50' : ''}`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{roleItem.label}</span>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {roleItem.email}
                            </div>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${roleItem.color}`}>
                            {roleItem.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="press p-2 rounded-xl border border-[#ded8cb] bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 transition shadow-2xs"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
