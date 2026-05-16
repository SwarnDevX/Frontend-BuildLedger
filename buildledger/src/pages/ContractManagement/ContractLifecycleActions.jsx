import { useState } from 'react';
import {
  CheckCircle2, XCircle, Loader2, Zap, Archive, Trash2, FileText,
} from 'lucide-react';
import { TERMINAL_STATUSES } from './contractConstants';

/**
 * ContractLifecycleActions — role-aware status transition buttons.
 *
 * Lifecycle:
 *   ADMIN creates → DRAFT
 *   ADMIN/PM submits → PENDING       (Submit for Review)
 *   VENDOR accepts  → ACTIVE         (from VendorContracts page)
 *   VENDOR rejects  → REJECTED       (from VendorContracts page)
 *   ADMIN marks     → COMPLETED / TERMINATED / EXPIRED
 *
 * Role rules:
 *   ADMIN:   DRAFT→PENDING, DRAFT delete, PENDING→ACTIVE, ACTIVE→COMPLETED/TERMINATED/EXPIRED
 *   PM:      DRAFT→PENDING, DRAFT delete only
 *   VENDOR:  handled in VendorContracts page (accept/reject PENDING)
 */
export default function ContractLifecycleActions({ contract, onStatusChange, canManage, isAdmin }) {
  const [loading, setLoading] = useState(null);
  if (!canManage) return null;

  const actions = [];

  if (contract.status === 'DRAFT') {
    // Both ADMIN and PM can submit or delete a draft
    actions.push({ label: 'Submit for Review', status: 'PENDING',    color: '#8B5CF6', icon: FileText });
    actions.push({ label: 'Delete Draft',      status: '__DELETE__', color: '#EF4444', icon: Trash2   });
  }

  if (contract.status === 'PENDING' && isAdmin) {
    // Only ADMIN can manually activate — vendor activates via their dashboard
    actions.push({ label: 'Activate Contract', status: 'ACTIVE', color: '#22C55E', icon: Zap });
  }

  if (contract.status === 'ACTIVE') {
    // ADMIN and PM can complete or terminate (reject) an active contract
    actions.push({ label: 'Mark Completed', status: 'COMPLETED',  color: '#2563EB', icon: CheckCircle2 });
    actions.push({ label: 'Terminate',      status: 'TERMINATED', color: '#EF4444', icon: XCircle      });
    if (isAdmin) {
      // Only ADMIN can mark an active contract as expired
      actions.push({ label: 'Mark Expired', status: 'EXPIRED', color: '#94a3b8', icon: Archive });
    }
  }

  const isTerminal = TERMINAL_STATUSES.includes(contract.status);

  const handle = async (action) => {
    setLoading(action.status);
    try { await onStatusChange(action.status); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-3">
      {/* Allowed transitions info box */}
      <div className="p-3 rounded-xl"
        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">
          Allowed Transitions
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {contract.status === 'DRAFT'   && 'Submit for vendor review, or delete this draft.'}
          {contract.status === 'PENDING' && isAdmin  && 'You can activate directly. Alternatively, vendor will accept or reject from their dashboard.'}
          {contract.status === 'PENDING' && !isAdmin && 'Waiting for vendor response. Vendor will accept or reject from their dashboard.'}
          {contract.status === 'ACTIVE'  && isAdmin  && 'ACTIVE → COMPLETED, TERMINATED, or EXPIRED.'}
          {contract.status === 'ACTIVE'  && !isAdmin && 'ACTIVE → COMPLETED or TERMINATED. Only admin can mark as EXPIRED.'}
          {isTerminal && 'This contract is in a terminal state — no further transitions available.'}
        </p>
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.status} onClick={() => handle(a)} disabled={!!loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: a.color, boxShadow: `0 2px 8px ${a.color}55` }}>
                {loading === a.status ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                {a.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No actions available for your role at this stage.</p>
      )}
    </div>
  );
}