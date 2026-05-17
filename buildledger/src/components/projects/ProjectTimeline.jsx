import { CheckCircle2, Circle, XCircle, Pause } from 'lucide-react';

const TIMELINE_STAGES = ['Planning', 'Active', 'Closed'];

function stageIndex(status) {
  if (status === 'PLANNING') return 0;
  if (status === 'ACTIVE' || status === 'ON_HOLD') return 1;
  return 2;
}

export default function ProjectTimeline({ status }) {
  const activeIdx   = stageIndex(status);
  const isCancelled = status === 'CANCELLED';
  const isOnHold    = status === 'ON_HOLD';
  const isCompleted = status === 'COMPLETED';
  const closeLabel  = isCancelled ? 'Cancelled' : isCompleted ? 'Completed' : 'Closed';

  return (
    <div className="flex items-center gap-0 py-2">
      {TIMELINE_STAGES.map((s, i) => {
        const label = i === 2 ? closeLabel : i === 1 && isOnHold ? 'On Hold' : s;
        const done  = i < activeIdx;
        const curr  = i === activeIdx;

        let dotColor = 'bg-slate-200 dark:bg-slate-700';
        if (done) dotColor = 'bg-blue-600';
        if (curr) {
          if (isCancelled)   dotColor = 'bg-red-500';
          else if (isOnHold) dotColor = 'bg-orange-400';
          else               dotColor = 'bg-blue-600';
        }

        let textColor = 'text-slate-400';
        if (done) textColor = 'text-blue-500';
        if (curr) {
          if (isCancelled)   textColor = 'text-red-500';
          else if (isOnHold) textColor = 'text-orange-500';
          else               textColor = 'text-blue-600';
        }

        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all ${dotColor} shadow-sm`}>
                {done                        ? <CheckCircle2 size={13} />
                  : curr && isCancelled      ? <XCircle size={13} />
                  : curr && isOnHold         ? <Pause size={11} />
                  : <Circle size={11} fill="white" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${textColor}`}>{label}</span>
            </div>
            {i < TIMELINE_STAGES.length - 1 && (
              <div className={`h-0.5 w-14 mb-5 mx-1 transition-all ${done ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
