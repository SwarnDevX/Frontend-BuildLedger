import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getProjectBudgetSummary } from '../../api/contracts';
import { formatINR } from '../../utils/format';

/**
 * BudgetBreakdown — fetches remaining budget from backend and shows live preview.
 *
 * Props:
 *   project        — selected project object (needs projectId)
 *   currentValue   — the contract value being typed (for live preview)
 *   onBudgetStatus — callback(exceeded: boolean) to enable/disable the submit button
 */
export default function BudgetBreakdown({ project, currentValue = 0, onBudgetStatus }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project) { setSummary(null); onBudgetStatus?.(false); return; }
    setLoading(true);
    getProjectBudgetSummary(project.projectId)
      .then(res => setSummary(res.data?.data ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [project?.projectId]);

  useEffect(() => {
    if (!summary) { onBudgetStatus?.(false); return; }
    const val      = Number(currentValue || 0);
    const avail    = Number(summary.remaining ?? 0);
    const exceeded = val > 0 && val > avail;
    onBudgetStatus?.(exceeded);
  }, [summary, currentValue]);

  if (!project) return null;

  const available = summary?.remaining ?? null;
  const val       = Number(currentValue || 0);
  const afterThis = available !== null ? available - val : null;
  const isOver    = afterThis !== null && val > 0 && afterThis < 0;

  return (
    <div className="mt-1 space-y-1">
      {loading ? (
        <p className="text-xs text-slate-400">Calculating available budget…</p>
      ) : available !== null && (
        <>
          <p className="text-xs font-semibold text-green-600">
            ✓ Available budget: {formatINR(available)}
          </p>

          {val > 0 && (
            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold ${
              isOver
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 border border-green-200 dark:border-green-800'
            }`}>
              {isOver
                ? <AlertTriangle size={12} className="shrink-0" />
                : <CheckCircle2 size={12} className="shrink-0" />}
              {isOver
                ? `Exceeds budget by ${formatINR(Math.abs(afterThis))} — reduce value or increase project budget`
                : `After this contract: ${formatINR(afterThis)} remaining`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
