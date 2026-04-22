import { useState } from 'react';
import { CheckCircle2, Clock, Truck, Package, RotateCcw, Calendar } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import { deliveries } from '../../data/mockData';

const statusIcons = {
  'Completed': CheckCircle2,
  'In Transit': Truck,
  'Pending': Clock,
  'Scheduled': Calendar,
};
const statusColors = {
  'Completed': '#22C55E',
  'In Transit': '#2563EB',
  'Pending': '#F59E0B',
  'Scheduled': '#94a3b8',
};

function Stepper({ status }) {
  const steps = ['Scheduled', 'Pending', 'In Transit', 'Completed'];
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all
            ${i <= idx ? 'text-white' : 'bg-slate-100 text-slate-400'}`}
            style={i <= idx ? { background: statusColors[status] } : {}}>
            {i < idx ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-6 h-0.5 ${i < idx ? '' : 'bg-slate-200'}`}
              style={i < idx ? { background: statusColors[status] } : {}} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function DeliveryTracking() {
  const [filter, setFilter] = useState('All');
  const statuses = ['All', 'Scheduled', 'Pending', 'In Transit', 'Completed'];

  const filtered = filter === 'All' ? deliveries : deliveries.filter(d => d.status === filter);

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Delivery Tracking</h2>
          <p className="text-sm text-slate-400">{deliveries.length} active deliveries</p>
        </div>
        <button className="btn-secondary text-xs"><RotateCcw size={13} /> Refresh</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Scheduled','Pending','In Transit','Completed'].map(s => {
          const Icon = statusIcons[s];
          const count = deliveries.filter(d => d.status === s).length;
          return (
            <div key={s} className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${statusColors[s]}18` }}>
                <Icon size={18} style={{ color: statusColors[s] }} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{count}</p>
                <p className="text-[10px] text-slate-400">{s}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${filter === s ? 'bg-blue-600 text-white shadow-sm' : 'glass text-slate-500 hover:bg-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Timeline table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60 border-b border-slate-100">
              <tr>
                {['Delivery ID', 'Item', 'Vendor', 'Quantity', 'Expected Date', 'Status', 'Progress', 'Stepper'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const Icon = statusIcons[d.status] || Package;
                return (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-blue-600 font-semibold">{d.id}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-slate-800">{d.item}</p>
                      <p className="text-[10px] text-slate-400">{d.contract}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{d.vendor}</td>
                    <td className="px-5 py-4 text-xs text-slate-600 font-medium">{d.quantity}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{d.date}</td>
                    <td className="px-5 py-4"><Badge status={d.status} /></td>
                    <td className="px-5 py-4 w-32">
                      <ProgressBar value={d.progress} color={statusColors[d.status]} showLabel />
                    </td>
                    <td className="px-5 py-4">
                      <Stepper status={d.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

