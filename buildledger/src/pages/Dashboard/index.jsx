import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart, Bar, Cell } from 'recharts';
import { FileText, Users, Truck, CreditCard, Plus, UserPlus, Clock, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { getDashboardSummary } from '../../api/reports';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const COLORS_PERF = ['#22C55E', '#3b82f6', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs shadow-xl">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
        <p className="text-blue-500 font-semibold">${(payload[0].value / 1000000).toFixed(2)}M</p>
      </div>
    );
  }
  return null;
};

const alertIcons  = { warning: AlertTriangle, error: AlertTriangle, info: Clock, success: CheckCircle2 };
const alertColors = { warning: 'text-amber-500', error: 'text-red-500', info: 'text-blue-500', success: 'text-green-500' };

export default function Dashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSummary();
      setSummary(res.data);
    } catch (e) {
      console.error('Dashboard summary failed:', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const kpiData = [
    { label: 'Total Contracts',      value: String(summary?.totalContracts ?? 0),                                         color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    { label: 'Active Vendors',       value: String(summary?.activeVendors ?? 0),                                          color: '#14B8A6', bg: 'rgba(20,184,166,0.1)'  },
    { label: 'Pending Deliveries',   value: String(summary?.pendingDeliveries ?? 0),                                      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
    { label: 'Outstanding Payments', value: `$${((summary?.outstandingPayments ?? 0) / 1000).toFixed(0)}K`,              color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
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
                tickFormatter={v => v >= 1000000 ? `$${v / 1000000}M` : `$${v / 1000}K`} />
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendorStatusData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  cursor={{ fill: barCursor }}
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="glass-card px-2 py-1.5 text-xs">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{payload[0].payload.name}</p>
                      <p className="text-blue-500">Score: {payload[0].value}</p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {vendorStatusData.map((e, i) => (
                    <Cell key={i} fill={COLORS_PERF[i % COLORS_PERF.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                      {c.value || c.contractValue ? `$${(c.value || c.contractValue).toLocaleString()}` : '—'}
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

          <div className="glass-card p-5">
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
          </div>
        </div>
      </div>
    </div>
  );
}
