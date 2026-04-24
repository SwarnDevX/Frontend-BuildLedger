import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Truck,
  CreditCard, ShieldCheck, Settings, Bell,
  ChevronLeft, ChevronRight, HardHat, LogOut, Package
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ALL_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/',                 roles: ['ADMIN','PROJECT_MANAGER','FINANCE_OFFICER','COMPLIANCE_OFFICER'] },
  { icon: Package,          label: 'My Portal',    path: '/vendor/dashboard', roles: ['VENDOR'] },
  { icon: Users,            label: 'Vendors',      path: '/vendors',          roles: ['ADMIN','PROJECT_MANAGER','COMPLIANCE_OFFICER'] },
  { icon: FileText,         label: 'Contracts',    path: '/contracts',        roles: ['ADMIN','PROJECT_MANAGER'] },
  { icon: Truck,            label: 'Deliveries',   path: '/deliveries',       roles: ['ADMIN','PROJECT_MANAGER','VENDOR'] },
  { icon: CreditCard,       label: 'Invoices',     path: '/invoices',         roles: ['ADMIN','FINANCE_OFFICER'] },
  { icon: ShieldCheck,      label: 'Compliance',   path: '/compliance',       roles: ['ADMIN','COMPLIANCE_OFFICER','PROJECT_MANAGER'] },
  { icon: Settings,         label: 'Admin',        path: '/admin',            roles: ['ADMIN'] },
  { icon: Bell,             label: 'Notifications',path: '/notifications',    roles: ['ADMIN','PROJECT_MANAGER','FINANCE_OFFICER','COMPLIANCE_OFFICER','VENDOR'] },
];

const ROLE_LABELS = {
  ADMIN: 'Administrator', PROJECT_MANAGER: 'Project Manager',
  FINANCE_OFFICER: 'Finance Officer', COMPLIANCE_OFFICER: 'Compliance Officer', VENDOR: 'Vendor',
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const role = user?.role || '';
  const navItems = ALL_NAV.filter(n => n.roles.includes(role));
  const initials = (user?.name || user?.username || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="glass-sidebar fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300"
      style={{ width: collapsed ? 72 : 240 }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/60">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#2563EB,#14B8A6)' }}>
          <HardHat size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fadeIn overflow-hidden">
            <p className="font-bold text-slate-800 text-sm leading-tight">BuildLedger</p>
            <p className="text-xs text-slate-400 leading-tight">Construction Suite</p>
          </div>
        )}
      </div>
      {/* Role badge */}
      {!collapsed && role && (
        <div className="mx-3 mt-3 px-3 py-1.5 rounded-xl text-center animate-fadeIn"
          style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.12)' }}>
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">{ROLE_LABELS[role] || role}</p>
        </div>
      )}
      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink key={path} to={path} end={path === '/' || path === '/vendor/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 mb-1 px-3 py-2.5 rounded-xl transition-all duration-200
              ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}`
            }>
            {({ isActive }) => (
              <>
                <Icon size={18} className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && <span className="text-sm font-medium animate-fadeIn whitespace-nowrap">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {/* Footer */}
      <div className="border-t border-white/60 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/40 mb-2 animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.name || user?.username}</p>
              <p className="text-[10px] text-slate-400 truncate">{ROLE_LABELS[role] || role}</p>
            </div>
            <button onClick={logout} title="Logout" className="text-slate-400 shrink-0 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
              <LogOut size={14} />
            </button>
          </div>
        )}
        {collapsed && (
          <button onClick={logout} className="w-full flex items-center justify-center p-2 mb-1 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={16} />
          </button>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:bg-white/60 hover:text-slate-700 transition-all">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
