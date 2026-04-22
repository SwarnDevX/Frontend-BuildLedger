import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ label, value, change, trend, color, bg, icon: Icon }) {
  const isUp = trend === 'up';
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg }}>
            <Icon size={20} style={{ color }} strokeWidth={2} />
          </div>
        )}
      </div>
      {change && (
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change}
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );
}

