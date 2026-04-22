import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notifications } from '../../data/mockData';

const pageTitles = {
  '/': 'Dashboard', '/vendors': 'Vendor Management', '/contracts': 'Contract Management',
  '/deliveries': 'Delivery Tracking', '/invoices': 'Invoices & Payments',
  '/compliance': 'Compliance & Audit', '/admin': 'Admin Panel',
  '/notifications': 'Notifications', '/vendor/dashboard': 'Vendor Portal',
};

export default function Topbar({ sidebarWidth }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const unread = notifications.filter(n => !n.read).length;
  const title  = pageTitles[location.pathname] || 'BuildLedger';
  const initials = (user?.name || user?.username || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <header className="glass-topbar fixed top-0 right-0 z-20 flex items-center gap-4 px-6"
      style={{ left: sidebarWidth, height: 64 }}>
      <div className="flex-1">
        <h1 className="text-base font-semibold text-slate-700">{title}</h1>
        <p className="text-xs text-slate-400">{today}</p>
      </div>
      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-3 py-2 w-56 shadow-sm">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full" placeholder="Search…" />
      </div>
      {/* Dark mode */}
      <button onClick={() => setDark(!dark)}
        className="w-9 h-9 rounded-xl bg-white/60 border border-white/80 flex items-center justify-center text-slate-500 hover:bg-white transition-all shadow-sm">
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      {/* Notifications */}
      <button onClick={() => navigate('/notifications')}
        className="relative w-9 h-9 rounded-xl bg-white/60 border border-white/80 flex items-center justify-center text-slate-500 hover:bg-white transition-all shadow-sm">
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>
      {/* User menu */}
      <div className="relative">
        <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.name || user?.username}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user?.role?.replace('_', ' ')}</p>
          </div>
          <ChevronDown size={13} className="text-slate-400" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 glass-card py-1 shadow-xl animate-fadeIn z-50">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-700">{user?.name || user?.username}</p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <button onClick={() => { setShowMenu(false); logout(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
