import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Zap, Pause } from 'lucide-react';
import { TERMINAL_PROJECT } from '../../constants/projectConstants';

/**
 * Renders lifecycle transition buttons for a project.
 *
 * Role rules:
 * - ADMIN: can activate/cancel from PLANNING, complete/cancel from ACTIVE,
 *          cancel from ON_HOLD
 * - PROJECT_MANAGER: can put ACTIVE on hold, resume ON_HOLD → ACTIVE only
 */
export default function LifecycleActions({ project, onStatusChange, canManage, isAdmin }) {
  const [loadingKey, setLoadingKey] = useState(null);
  if (!canManage) return null;

  const actions = [];

  if (project.status === 'PLANNING' && isAdmin) {
    actions.push({ label: 'Activate Project', status: 'ACTIVE',    color: '#22C55E', icon: Zap          });
    actions.push({ label: 'Cancel Project',   status: 'CANCELLED', color: '#EF4444', icon: XCircle      });
  } else if (project.status === 'ACTIVE') {
    actions.push({ label: 'Put On Hold',      status: 'ON_HOLD',   color: '#F97316', icon: Pause        });
    if (isAdmin) {
      actions.push({ label: 'Mark Completed', status: 'COMPLETED', color: '#2563EB', icon: CheckCircle2 });
      actions.push({ label: 'Cancel Project', status: 'CANCELLED', color: '#EF4444', icon: XCircle      });
    }
  } else if (project.status === 'ON_HOLD') {
    actions.push({ label: 'Resume Project',   status: 'ACTIVE',    color: '#22C55E', icon: Zap          });
    if (isAdmin)
      actions.push({ label: 'Cancel Project', status: 'CANCELLED', color: '#EF4444', icon: XCircle      });
  }

  if (actions.length === 0) {
    if (TERMINAL_PROJECT.includes(project.status))
      return <p className="text-xs text-slate-400 italic">Terminal state — no further transitions.</p>;
    return <p className="text-xs text-slate-400 italic">No actions available for your role at this stage.</p>;
  }

  const handle = async (a) => {
    setLoadingKey(a.status);
    try { await onStatusChange(a.status); }
    finally { setLoadingKey(null); }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button key={a.status} onClick={() => handle(a)} disabled={!!loadingKey}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: a.color, boxShadow: `0 2px 8px ${a.color}55` }}>
            {loadingKey === a.status
              ? <Loader2 size={12} className="animate-spin" />
              : <Icon size={12} />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
