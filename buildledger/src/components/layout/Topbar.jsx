import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getAllNotifications, getMyNotifications } from '../../api/notifications';

const pageTitles = {
  '/':                   'Dashboard',
  '/vendors':            'Vendor Management',
  '/projects':           'Project Management',
  '/contracts':          'Contract Management',
  '/deliveries':         'Delivery Tracking',
  '/invoices':           'Invoices & Payments',
  '/compliance':         'Compliance & Audit',
  '/admin':              'Admin Panel',
  '/notifications':      'Notifications',
  '/vendor/dashboard':   'Vendor Portal',
  '/vendor/contracts':   'My Contracts',
};

export default function Topbar({ sidebarWidth }) {
  const location             = useLocation();
  const navigate             = useNavigate();
  const { user, logout }     = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showMenu, setShowMenu]               = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unread, setUnread]                   = useState(0);
  const menuRef          = useRef(null);
  const notificationsRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Poll notifications — ADMIN gets all, everyone else gets their own (works for VENDOR too)
  useEffect(() => {
    let isMounted = true;

    const refreshUnread = async () => {
      if (!user?.email) {
        if (isMounted) setUnread(0);
        return;
      }
      try {
        const res = user.role === 'ADMIN'
          ? await getAllNotifications()
          : await getMyNotifications();
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        if (isMounted) setUnread(list.filter((n) => !n.read).length);
      } catch {
        if (isMounted) setUnread(0);
      }
    };

    refreshUnread();
    const interval = setInterval(refreshUnread, 5000);
    window.addEventListener('notif-read-change', refreshUnread);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('notif-read-change', refreshUnread);
    };
  }, [user]);

  const title    = pageTitles[location.pathname] || 'BuildLedger';
  const initials = (user?.name || user?.username || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const today    = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const iconBtn = `w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm
    bg-white/60 border border-white/80 text-slate-500 hover:bg-white
    dark:bg-slate-800/50 dark:border-slate-600/40 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-slate-100`;

  return (
    <>
    <header
      className="glass-topbar fixed top-0 right-0 z-20 flex items-center gap-4 px-6"
      style={{ left: sidebarWidth, height: 64 }}
    >
      <div className="flex-1">
        <h1 className="text-base font-semibold text-slate-700 dark:text-slate-100">{title}</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">{today}</p>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 w-56 shadow-sm
        bg-white/60 border border-white/80
        dark:bg-slate-800/50 dark:border-slate-600/40">
        <Search size={14} className="text-slate-400 dark:text-slate-400 shrink-0" />
        <input
          className="bg-transparent text-sm outline-none w-full
            text-slate-600 placeholder-slate-400
            dark:text-slate-200 dark:placeholder-slate-500"
          placeholder="Search…"
        />
      </div>

      {/* Dark mode toggle */}
      <button onClick={toggleTheme} className={iconBtn}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {isDark
          ? <Sun size={15} className="text-amber-400" />
          : <Moon size={15} />}
      </button>

      {/* Notifications bell */}
      <button
        ref={notificationsRef}
        onClick={() => navigate('/notifications')}
        className={`relative ${iconBtn}`}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {user?.name || user?.username}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <ChevronDown size={13} className="text-slate-400 dark:text-slate-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 glass-card py-1 shadow-xl animate-fadeIn z-50">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/50">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {user?.name || user?.username}
              </p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowLogoutModal(true);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        )}
      </div>

    </header>

    {showLogoutModal && createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(0,0,0,0.45)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowLogoutModal(false);
        }}
      >
        <div
          style={{
            background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 20,
            padding: '32px 28px',
            width: 320,
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <LogOut size={22} color="#ef4444" />
          </div>

          <h3 style={{
            fontSize: 17, fontWeight: 600,
            color: isDark ? '#f1f5f9' : '#1e293b',
            margin: '0 0 8px',
          }}>
            Sign out?
          </h3>

          <p style={{
            fontSize: 13,
            color: isDark ? '#94a3b8' : '#64748b',
            margin: '0 0 24px', lineHeight: 1.5,
          }}>
            Are you sure you want to sign out of BuildLedger?
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowLogoutModal(false)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: isDark ? '#cbd5e1' : '#475569',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
            >
              Cancel
            </button>
            <button
              onClick={() => { setShowLogoutModal(false); logout(); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: 'none', background: '#ef4444', color: 'white',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
