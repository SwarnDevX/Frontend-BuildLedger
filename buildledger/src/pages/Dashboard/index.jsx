import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart, Bar, Cell } from 'recharts';
import { FileText, Users, Truck, CreditCard, Plus, UserPlus, Bell, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { kpiData, contractTrendData, vendorPerformanceData, recentContracts, notifications } from '../../data/mockData';

const kpiIcons = [FileText, Users, Truck, CreditCard];

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

export default function Dashboard() {
  const recent = notifications.filter(n => !n.read).slice(0, 4);

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
              <p className="text-xs text-slate-400">Monthly contract value (2025)</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">2025</span>
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
                tickFormatter={v => `$${v / 1000000}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5}
                fill="url(#blueGrad)" dot={false} activeDot={{ r: 4, fill: '#2563EB' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="glass-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Vendor Performance</h2>
            <p className="text-xs text-slate-400">Score out of 100</p>
          </div>
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
                  <Cell key={i} fill={e.score >= 90 ? '#22C55E' : e.score >= 80 ? '#2563EB' : e.score >= 70 ? '#F59E0B' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
                  {['Contract ID', 'Project', 'Vendor', 'Value', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentContracts.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                    <td className="py-2.5 pr-4 text-xs font-mono text-blue-600 font-semibold">{c.id}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-700 font-medium max-w-[140px] truncate">{c.project}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">{c.vendor}</td>
                    <td className="py-2.5 pr-4 text-xs font-semibold text-slate-700">{c.value}</td>
                    <td className="py-2.5"><Badge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications + Quick Actions */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button className="btn-primary w-full justify-center text-xs py-2.5">
                <Plus size={14} /> Create Contract
              </button>
              <button className="btn-secondary w-full justify-center text-xs py-2.5">
                <UserPlus size={14} /> Assign Vendor
              </button>
            </div>
          </div>

          {/* Alerts */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Alerts</h2>
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{recent.length}</span>
            </div>
            <div className="space-y-3">
              {recent.map(n => {
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
          </div>
        </div>
      </div>
    </div>
  );
}


