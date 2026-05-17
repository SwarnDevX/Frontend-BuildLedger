import { CheckCircle2, Circle, XCircle } from 'lucide-react';

const TIMELINE_STAGES = ['Draft', 'Pending', 'Active', 'Closed'];

function stageIndex(status) {
  if (status === 'DRAFT')   return 0;
  if (status === 'PENDING') return 1;
  if (status === 'ACTIVE')  return 2;
  return 3;
}

/**
 * ContractTimeline — visual lifecycle: Draft → Pending → Active → Closed.
 * Closed label changes based on terminal status (Completed/Terminated/Expired/Rejected).
 */
export default function ContractTimeline({ status }) {
  const activeIdx    = stageIndex(status);
  const isTerminated = status === 'TERMINATED';
  const isExpired    = status === 'EXPIRED';
  const isCompleted  = status === 'COMPLETED';
  const isRejected   = status === 'REJECTED';

  const closeLabel = isTerminated ? 'Terminated'
    : isExpired    ? 'Expired'
    : isCompleted  ? 'Completed'
    : isRejected   ? 'Rejected'
    : 'Closed';

  return (
    <div className="flex items-center gap-0 py-2">
      {TIMELINE_STAGES.map((s, i) => {
        const label = i === 3 ? closeLabel : s;
        const done  = i < activeIdx;
        const curr  = i === activeIdx;

        let dotColor = 'bg-slate-200 dark:bg-slate-700';
        if (done) dotColor = 'bg-blue-600';
        if (curr) {
          if (isTerminated || isRejected) dotColor = 'bg-red-500';
          else if (isExpired)             dotColor = 'bg-slate-400';
          else if (status === 'PENDING')  dotColor = 'bg-purple-500';
          else                            dotColor = 'bg-blue-600';
        }

        let textColor = 'text-slate-400';
        if (done) textColor = 'text-blue-500';
        if (curr) {
          if (isTerminated || isRejected) textColor = 'text-red-500';
          else if (isExpired)             textColor = 'text-slate-500';
          else if (status === 'PENDING')  textColor = 'text-purple-500';
          else                            textColor = 'text-blue-600';
        }

        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all ${dotColor} shadow-sm`}>
                {done
                  ? <CheckCircle2 size={13} />
                  : curr && (isTerminated || isExpired || isRejected)
                    ? <XCircle size={13} />
                    : <Circle size={11} fill="white" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${textColor}`}>{label}</span>
            </div>
            {i < TIMELINE_STAGES.length - 1 && (
              <div className={`h-0.5 w-12 mb-5 mx-1 transition-all ${done ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
