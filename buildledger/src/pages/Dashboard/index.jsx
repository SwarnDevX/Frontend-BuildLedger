import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart, Bar, Cell } from 'recharts';
import { FileText, Users, Truck, CreditCard, Plus, UserPlus, Clock, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { getDashboardSummary } from '../../api/reports';
import { getMyContracts } from '../../api/contracts';
import { getAllVendors } from '../../api/vendors';
import { getDeliveriesByContract } from '../../api/deliveries';
import { getInvoicesByContract } from '../../api/invoices';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const COLORS_PERF = ['#22C55E', '#3b82f6', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs shadow-xl">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
        <p className="text-blue-500 font-semibold">₹{(payload[0].value / 1000000).toFixed(2)}M</p>
      </div>
    );
  }
  return null;
};

const alertIcons  = { warning: AlertTriangle, error: AlertTriangle, info: Clock, success: CheckCircle2 };
const alertColors = { warning: 'text-amber-500', error: 'text-red-500', info: 'text-blue-500', success: 'text-green-500' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Build the dashboard summary client-side for a PROJECT_MANAGER from PM-scoped
// endpoints. The resulting shape matches what the JSX already reads from
// `summary?.*`, so no JSX changes are required.
async function buildPmSummary() {
  let contracts = [];
  let vendors = [];
  const [cRes, vRes] = await Promise.allSettled([getMyContracts(), getAllVendors()]);
  if (cRes.status === 'fulfilled') contracts = cRes.value.data?.data ?? cRes.value.data ?? [];
  if (vRes.status === 'fulfilled') vendors   = vRes.value.data?.data ?? vRes.value.data ?? [];

  // Per-contract deliveries + invoices, in parallel
  const perContract = await Promise.all(contracts.map(async (c) => {
    const [dRes, iRes] = await Promise.allSettled([
      getDeliveriesByContract(c.contractId),
      getInvoicesByContract(c.contractId),
    ]);
    const deliveries = dRes.status === 'fulfilled'
      ? (dRes.value.data?.data ?? dRes.value.data ?? []) : [];
    const invoices = iRes.status === 'fulfilled'
      ? (iRes.value.data?.data ?? iRes.value.data ?? []) : [];
    return { deliveries: Array.isArray(deliveries) ? deliveries : [], invoices: Array.isArray(invoices) ? invoices : [] };
  }));

  const allDeliveries = perContract.flatMap(x => x.deliveries);
  const allInvoices   = perContract.flatMap(x => x.invoices);

  const pendingDeliveries = allDeliveries.filter(d => d.status && d.status !== 'DELIVERED').length;
  const outstandingPayments = allInvoices
    .filter(i => i.status && i.status !== 'PAID')
    .reduce((sum, i) => sum + Number(i.amount ?? i.value ?? i.totalAmount ?? 0), 0);

  // Match the Vendor Management page's definition: vendors whose own status is ACTIVE.
  const activeVendors = vendors.filter(v => v.status === 'ACTIVE').length;

  // Contract value over time — sum by month of startDate for current year
  const currentYear = new Date().getFullYear();
  const trend = MONTHS.map(m => ({ month: m, value: 0 }));
  contracts.forEach(c => {
    if (!c.startDate) return;
    const d = new Date(c.startDate);
    if (d.getFullYear() !== currentYear || Number.isNaN(d.getTime())) return;
    trend[d.getMonth()].value += Number(c.value ?? c.contractValue ?? 0);
  });

  // Top vendors by PM contract count — resolve names via the loaded vendor list
  // when available, falling back to whatever the contract itself carries.
  const counts = contracts.reduce((acc, c) => {
    const key = c.vendorId ?? c.vendorName;
    if (key == null) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const vendorStatusData = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, score]) => {
      const v = vendors.find(x => String(x.vendorId) === String(key));
      const fallback = contracts.find(c => String(c.vendorId) === String(key))?.vendorName;
      return { name: v?.name || fallback || `Vendor #${key}`, score };
    });

  const recentContracts = [...contracts]
    .sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0))
    .slice(0, 5);

  return {
    totalContracts: contracts.length,
    activeVendors,
    pendingDeliveries,
    outstandingPayments,
    contractTrendData: trend,
    vendorStatusData,
    recentContracts,
    alerts: [],
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const isPM = user?.role === 'PROJECT_MANAGER';
  const isFO = user?.role === 'FINANCE_OFFICER';

  // Finance Officer's dashboard IS the Invoices & Payments page
  useEffect(() => {
    if (isFO) navigate('/invoices', { replace: true });
  }, [isFO, navigate]);

  const fetchAll = async () => {
    if (isFO) return;
    setLoading(true);
    try {
      if (isPM) {
        setSummary(await buildPmSummary());
      } else {
        const res = await getDashboardSummary();
        setSummary(res.data);
      }
    } catch (e) {
      console.error('Dashboard summary failed:', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [isPM]);

  const kpiData = [
    { label: 'Total Contracts',      value: String(summary?.totalContracts ?? 0),                                         color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    { label: 'Active Vendors',       value: String(summary?.activeVendors ?? 0),                                          color: '#14B8A6', bg: 'rgba(20,184,166,0.1)'  },
    { label: 'Pending Deliveries',   value: String(summary?.pendingDeliveries ?? 0),                                      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
    { label: 'Outstanding Payments', value: `₹${((summary?.outstandingPayments ?? 0) / 1000).toFixed(0)}K`,              color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  ];
  const kpiIcons = [FileText, Users, Truck, CreditCard];

  const contractTrendData = summary?.contractTrendData ?? [];
  const vendorStatusData  = summary?.vendorStatusData  ?? [];
  const recentContracts   = summary?.recentContracts   ?? [];
  const alerts            = summary?.alerts            ?? [];

  const axisColor = isDark ? '#8aa4b6' : '#94a3b8';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const barCursor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading dashboard…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, i) => (
          <StatCard key={i} {...kpi} icon={kpiIcons[i]} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contract Value Over Time</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Monthly contract value (current year)</p>
            </div>
            <button onClick={fetchAll} className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={contractTrendData}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={isDark ? 0.25 : 0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `₹${v / 1000000}M` : `₹${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#blueGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="glass-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Vendor Status Overview</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Active vendors snapshot</p>
          </div>
          {vendorStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">No vendor data</div>
          ) : (
            <ul className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {vendorStatusData.map((v, i) => (
                <li
                  key={v.name + i}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: COLORS_PERF[i % COLORS_PERF.length] }}
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                    {v.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent contracts table */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Contracts</h2>
            <a href="/contracts" className="text-xs text-blue-500 hover:underline font-medium">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  {['Contract ID', 'Title', 'Vendor', 'Value', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentContracts.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400">No contracts found</td></tr>
                ) : recentContracts.map(c => (
                  <tr key={c.contractId} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-white/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-2.5 pr-4 text-xs font-mono text-blue-500 font-semibold">#{c.contractId}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-700 dark:text-slate-300 font-medium max-w-[140px] truncate">{c.title || c.name || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500 dark:text-slate-400">{c.vendorName || c.vendorId || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {c.value || c.contractValue ? `₹${(c.value || c.contractValue).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5"><Badge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions + Alerts */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button onClick={() => navigate('/contracts')} className="btn-primary w-full justify-center text-xs py-2.5">
                <Plus size={14} /> Create Contract
              </button>
              <button onClick={() => navigate('/vendors')} className="btn-secondary w-full justify-center text-xs py-2.5">
                <UserPlus size={14} /> Manage Vendors
              </button>
            </div>
          </div>

          {/* <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Alerts</h2>
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {alerts.length}
              </span>
            </div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-4 text-slate-400">
                <CheckCircle2 size={20} className="text-green-400" />
                <p className="text-xs">All clear!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(n => {
                  const Icon = alertIcons[n.severity];
                  return (
                    <div key={n.id} className="flex gap-2.5 items-start">
                      <Icon size={14} className={`${alertColors[n.severity]} shrink-0 mt-0.5`} />
                      <div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div> */}
        </div>
      </div>
    </div>
  );
}
