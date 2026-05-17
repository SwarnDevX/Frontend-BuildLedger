import { MapPin, Calendar, User, IndianRupee, Briefcase, ChevronRight } from 'lucide-react';
import { ProgressBar } from '../ui';
import { statusMeta, TERMINAL_PROJECT } from '../../constants/projectConstants';
import { formatINR } from '../../utils/format';
import { useBudgetSummary } from '../../hooks/useProjectBudget';

export default function ProjectCard({ p, canManage, onClick }) {
  const meta = statusMeta(p.status);
  const { summary, loading } = useBudgetSummary(p.projectId);

  const budgetINR    = formatINR(summary?.totalBudget ?? p.budget);
  const remainingINR = summary ? formatINR(summary.remaining) : null;
  const isOver       = summary?.overBudget ?? false;

  return (
    <div className="glass-card p-5 cursor-pointer hover:shadow-md transition-all" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
            <MapPin size={10} className="shrink-0" /> {p.location}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: meta.bg, color: meta.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1"><IndianRupee size={10} /> Budget</span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold">{budgetINR}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1"><IndianRupee size={10} /> Remaining</span>
          {loading
            ? <span className="text-slate-400">…</span>
            : remainingINR
              ? <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-green-600'}`}>{remainingINR}</span>
              : <span className="text-green-600 font-semibold">{budgetINR}</span>
          }
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1"><Calendar size={10} /> Duration</span>
          <span className="text-slate-500">{p.startDate || '—'} → {p.endDate || '—'}</span>
        </div>
        {p.managerName && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1"><User size={10} /> Manager</span>
            <span className="text-slate-500 truncate max-w-[120px]">{p.managerName}</span>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Progress</span>
          <span className="text-slate-600 dark:text-slate-400 font-semibold">{meta.progress}%</span>
        </div>
        <ProgressBar value={meta.progress} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Briefcase size={10} /><span>Click to view details</span>
        </div>
        {canManage && !TERMINAL_PROJECT.includes(p.status) && (
          <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
            Manage <ChevronRight size={10} />
          </span>
        )}
      </div>
    </div>
  );
}
