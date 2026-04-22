import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { auditLogs, complianceScores } from '../../data/mockData';

const severityColors = { High: '#EF4444', Medium: '#F97316', Low: '#22C55E', Info: '#2563EB' };
const severityBg = { High: 'bg-red-50 border-red-100', Medium: 'bg-orange-50 border-orange-100', Low: 'bg-green-50 border-green-100', Info: 'bg-blue-50 border-blue-100' };

const overallScore = Math.round(complianceScores.reduce((a, b) => a + b.score, 0) / complianceScores.length);

const pieData = [
  { name: 'Compliant', value: complianceScores.filter(c => c.risk === 'None' || c.risk === 'Low').length },
  { name: 'Medium Risk', value: complianceScores.filter(c => c.risk === 'Medium').length },
  { name: 'High Risk', value: complianceScores.filter(c => c.risk === 'High').length },
];
const PIE_COLORS = ['#22C55E', '#F59E0B', '#EF4444'];

export default function ComplianceAudit() {
  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Compliance & Audit</h2>
        <p className="text-sm text-slate-400">Last full audit: April 14, 2026</p>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall score */}
        <div className="glass-card p-5 flex flex-col items-center justify-center text-center">
          <div className="relative w-32 h-32 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ value: overallScore }, { value: 100 - overallScore }]} cx="50%" cy="50%"
                  innerRadius={42} outerRadius={54} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                  <Cell fill="#2563EB" />
                  <Cell fill="rgba(0,0,0,0.05)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-slate-800">{overallScore}%</p>
              <p className="text-[9px] text-slate-400 font-medium">OVERALL</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-700">Compliance Score</p>
          <p className="text-xs text-slate-400">Across all active vendors</p>
        </div>

        {/* Pie breakdown */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Risk Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="glass-card px-2 py-1 text-xs"><p className="font-semibold">{payload[0].name}: {payload[0].value}</p></div>
                ) : null} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-xs text-slate-600">{d.name}</span>
                  <span className="text-xs font-bold text-slate-800 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vendor compliance scores */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Vendor Scores</h3>
          <div className="space-y-2.5">
            {complianceScores.map(v => (
              <div key={v.vendor}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 truncate max-w-[120px]">{v.vendor}</span>
                  <span className={`font-semibold ${v.score >= 90 ? 'text-green-600' : v.score >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{v.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${v.score}%`, background: v.score >= 90 ? '#22C55E' : v.score >= 75 ? '#F59E0B' : '#EF4444' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-500" /> Active Risk Alerts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {auditLogs.filter(l => l.severity === 'High').map(log => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-800">{log.event}</p>
                <p className="text-[10px] text-red-400 mt-0.5">{log.timestamp} · {log.module}</p>
              </div>
            </div>
          ))}
          {auditLogs.filter(l => l.severity === 'Medium').map(log => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
              <Clock size={14} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-orange-800">{log.event}</p>
                <p className="text-[10px] text-orange-400 mt-0.5">{log.timestamp} · {log.module}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Audit Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                {['ID', 'Event', 'User', 'Timestamp', 'Module', 'Severity'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-slate-400">{log.id}</td>
                  <td className="px-5 py-3 text-xs text-slate-700 max-w-xs">{log.event}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{log.user}</td>
                  <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{log.module}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityBg[log.severity]}`}
                      style={{ color: severityColors[log.severity] }}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

