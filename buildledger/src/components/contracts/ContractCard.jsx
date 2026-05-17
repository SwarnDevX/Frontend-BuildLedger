import { ClipboardList, ChevronRight } from 'lucide-react';
import { ProgressBar } from '../ui';
import { statusMeta, TERMINAL_STATUSES } from '../../constants/contractConstants';
import { formatINR } from '../../utils/format';
import { useContractBudgetSummary } from '../../hooks/useContractBudget';

export default function ContractCard({ contract: c, canManage, onClick }) {
  const meta = statusMeta(c.status);
  const { summary } = useContractBudgetSummary(c.contractId, c.status);

  const isActive   = c.status === 'ACTIVE';
  const spent      = summary?.spent          ?? 0;
  const total      = summary?.contractValue  ?? (c.value ?? 0);
  const overBudget = summary?.overBudget     ?? false;
  const spentPct   = total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0;

  return (
    <div className="glass-card p-5 cursor-pointer hover:shadow-md transition-all" onClick={onClick}>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs font-mono text-blue-600 font-semibold mb-0.5">#{c.contractId}</p>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {c.vendorName || `Vendor #${c.vendorId}`}
          </h3>
          <p className="text-xs text-slate-400 truncate">
            {c.projectName || `Project #${c.projectId}`}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: meta.bg, color: meta.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
      </div>

      {/* Budget rows */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Contract Value</span>
          <span className="text-slate-700 dark:text-slate-200 font-semibold">{formatINR(c.value)}</span>
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Duration</span>
          <span className="text-slate-500 dark:text-slate-400">{c.startDate || '—'} → {c.endDate || '—'}</span>
        </div>
      </div>

      {/* Budget bar — shows spent % for ACTIVE, progress % for others */}
      <div className="mb-3">
        {isActive && summary ? (
          <>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Budget Used</span>
              <span className={`font-semibold ${overBudget ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {spentPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${spentPct}%`,
                  background: overBudget ? '#EF4444' : spentPct > 80 ? '#F97316' : '#22C55E',
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Progress</span>
              <span className="text-slate-600 dark:text-slate-300 font-semibold">{meta.progress}%</span>
            </div>
            <ProgressBar value={meta.progress} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <ClipboardList size={10} /><span>Click to view details & terms</span>
        </div>
        {canManage && !TERMINAL_STATUSES.includes(c.status) && (
          <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
            Manage <ChevronRight size={10} />
          </span>
        )}
      </div>
    </div>
  );
}
