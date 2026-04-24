import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart, Bar, Cell } from 'recharts';
import { FileText, Users, Truck, CreditCard, Plus, UserPlus, Bell, Clock, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { getAllContracts } from '../../api/contracts';
import { getAllVendors } from '../../api/vendors';
import { getAllDeliveries } from '../../api/deliveries';
import { getAllInvoices } from '../../api/invoices';
import { useNavigate } from 'react-router-dom';

// NOTE: contractTrendData (monthly aggregated chart) and vendorPerformanceData (score per vendor)
// are not available from any backend endpoint. These require:
//   GET /analytics/contracts/trend?year=2026   → { month, value, count }[]
//   GET /analytics/vendors/performance          → { name, score, deliveries }[]
// Until those endpoints exist, we derive a simple bar chart from vendor count and a placeholder trend.

const COLORS_PERF = ['#22C55E', '#2563EB', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-blue-600">${(payload[0].value / 1000000).toFixed(2)}M</p>
      </div>
    );
  }
  return null;
};

const alertIcons = { warning: AlertTriangle, error: AlertTriangle, info: Clock, success: CheckCircle2 };
const alertColors = { warning: 'text-amber-500', error: 'text-red-500', info: 'text-blue-500', success: 'text-green-500' };

function deriveAlerts(invoices, deliveries) {
  const alerts = [];
  const now = new Date();
  invoices.forEach(inv => {
    const due = inv.dueDate ? new Date(inv.dueDate) : null;
    if (inv.status === 'PENDING' && due && due < now) {
      alerts.push({ id: `inv-${inv.invoiceId}`, severity: 'error', message: `Invoice #${inv.invoiceId} is overdue`, time: inv.dueDate });
    }
  });
  deliveries.forEach(del => {
    if (del.status === 'PENDING') {
      alerts.push({ id: `del-${del.deliveryId}`, severity: 'warning', message: `Delivery #${del.deliveryId} is pending`, time: del.scheduledDate || del.expectedDate || '—' });
    }
  });
  return alerts.slice(0, 4);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors]     = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, v, d, i] = await Promise.allSettled([
        getAllContracts(), getAllVendors(), getAllDeliveries(), getAllInvoices(),
      ]);
      setContracts(c.status === 'fulfilled' ? (c.value.data?.data || []) : []);
      setVendors(v.status === 'fulfilled' ? (v.value.data?.data || []) : []);
      setDeliveries(d.status === 'fulfilled' ? (d.value.data?.data || []) : []);
      setInvoices(i.status === 'fulfilled' ? (i.value.data?.data || []) : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // KPIs
  const activeVendors   = vendors.filter(v => v.status === 'ACTIVE').length;
  const pendingDeliveries = deliveries.filter(d => d.status === 'PENDING').length;
  const outstandingAmt  = invoices.filter(i => i.status !== 'PAID').reduce((s, i) => s + (i.amount || 0), 0);

  const kpiData = [
    { label: 'Total Contracts', value: String(contracts.length), color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Active Vendors', value: String(activeVendors), color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
    { label: 'Pending Deliveries', value: String(pendingDeliveries), color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Outstanding Payments', value: `$${(outstandingAmt / 1000).toFixed(0)}K`, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  ];
  const kpiIcons = [FileText, Users, Truck, CreditCard];

  // Trend: group contracts by month of createdAt (best effort)
  const trendMap = {};
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  contracts.forEach(c => {
    const d = c.createdAt || c.startDate;
    if (!d) return;
    const m = months[new Date(d).getMonth()];
    trendMap[m] = (trendMap[m] || 0) + (c.value || c.contractValue || 0);
  });
  const contractTrendData = months.map(m => ({ month: m, value: trendMap[m] || 0 }));

  // Vendor performance: derived from vendors (active vs total)
  const vendorPerformanceData = vendors.slice(0, 6).map(v => ({
    name: (v.name || 'Vendor').slice(0, 10),
    score: v.status === 'ACTIVE' ? 85 : v.status === 'PENDING' ? 50 : 30,
  }));

  // Recent contracts
  const recentContracts = contracts.slice(0, 6);
  const alerts = deriveAlerts(invoices, deliveries);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading dashboard…</span>
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
        {/* Line chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Contract Value Over Time</h2>
              <p className="text-xs text-slate-400">Monthly contract value (current year)</p>
            </div>
            <button onClick={fetchAll} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={contractTrendData}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `$${v / 1000000}M` : `$${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5}
                fill="url(#blueGrad)" dot={false} activeDot={{ r: 4, fill: '#2563EB' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart – vendor activity */}
        <div className="glass-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Vendor Status Overview</h2>
            <p className="text-xs text-slate-400">Active vendors snapshot</p>
          </div>
          {vendorPerformanceData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">No vendor data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendorPerformanceData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="glass-card px-2 py-1.5 text-xs">
                      <p className="font-semibold text-slate-700">{payload[0].payload.name}</p>
                      <p className="text-blue-600">Score: {payload[0].value}</p>
                    </div>
                  ) : null} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {vendorPerformanceData.map((e, i) => (
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
            <h2 className="text-sm font-semibold text-slate-700">Recent Contracts</h2>
            <a href="/contracts" className="text-xs text-blue-600 hover:underline font-medium">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Contract ID', 'Title', 'Vendor', 'Value', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentContracts.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400">No contracts found</td></tr>
                ) : recentContracts.map(c => (
                  <tr key={c.contractId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                    <td className="py-2.5 pr-4 text-xs font-mono text-blue-600 font-semibold">#{c.contractId}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-700 font-medium max-w-[140px] truncate">{c.title || c.name || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">{c.vendorName || c.vendorId || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs font-semibold text-slate-700">
                      {c.value || c.contractValue ? `$${(c.value || c.contractValue).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5"><Badge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications + Quick Actions */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
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
              <h2 className="text-sm font-semibold text-slate-700">Alerts</h2>
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{alerts.length}</span>
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
                        <p className="text-xs text-slate-700 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
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
