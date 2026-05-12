import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, Circle, Shield,
  FileText, ChevronRight, ClipboardList, AlertTriangle,
} from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import { Button, PageHeader } from '../../components/ui';
import { getContractsByVendor, getContractTerms, vendorRespondToContract } from '../../api/contracts';
import { getAllVendors } from '../../api/vendors';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusMeta(status) {
  return {
    DRAFT:      { label: 'Draft',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  progress: 5   },
    PENDING:    { label: 'Pending',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  progress: 30  },
    ACTIVE:     { label: 'Active',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   progress: 55  },
    COMPLETED:  { label: 'Completed',  color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   progress: 100 },
    TERMINATED: { label: 'Terminated', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   progress: 100 },
    EXPIRED:    { label: 'Expired',    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', progress: 100 },
    REJECTED:   { label: 'Rejected',   color: '#DC2626', bg: 'rgba(220,38,38,0.12)',   progress: 0   },
  }[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', progress: 10 };
}

const TIMELINE_STAGES = ['Draft', 'Pending', 'Active', 'Closed'];

function stageIndex(status) {
  if (status === 'DRAFT')   return 0;
  if (status === 'PENDING') return 1;
  if (status === 'ACTIVE')  return 2;
  return 3;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function ContractTimeline({ status }) {
  const activeIdx    = stageIndex(status);
  const isTerminated = status === 'TERMINATED';
  const isExpired    = status === 'EXPIRED';
  const isCompleted  = status === 'COMPLETED';
  const isRejected   = status === 'REJECTED';
  const closeLabel   = isTerminated ? 'Terminated'
    : isExpired   ? 'Expired'
    : isCompleted ? 'Completed'
    : isRejected  ? 'Rejected'
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
                {done ? <CheckCircle2 size={13} />
                  : curr && (isTerminated || isExpired || isRejected) ? <XCircle size={13} />
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

// ─── Contract Detail Modal ────────────────────────────────────────────────────

function VendorContractModal({ contract, vendorId, onClose, onRefresh }) {
  const [terms, setTerms]           = useState([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [rejecting, setRejecting]   = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [remarks, setRemarks]       = useState('');
  const [loading, setLoading]       = useState(null);

  useEffect(() => {
    if (!contract) return;
    setTermsLoading(true);
    getContractTerms(contract.contractId)
      .then(res => setTerms(res.data?.data || []))
      .catch(() => setTerms([]))
      .finally(() => setTermsLoading(false));
  }, [contract?.contractId]);

  if (!contract) return null;

  const meta      = statusMeta(contract.status);
  const isPending = contract.status === 'PENDING';

  const handleAccept = async () => {
    setLoading('ACCEPT');
    try {
      await vendorRespondToContract(contract.contractId, 'ACCEPT', vendorId, null);
      toast.success('Contract accepted! It is now ACTIVE.');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept contract');
    } finally { setLoading(null); }
  };

  const handleReject = async () => {
    if (!remarks.trim()) { toast.error('Please provide a reason for rejection'); return; }
    setLoading('REJECT');
    try {
      await vendorRespondToContract(contract.contractId, 'REJECT', vendorId, remarks.trim());
      toast.success('Contract rejected.');
      setRejectModal(false);
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject contract');
    } finally { setLoading(null); }
  };

  return (
    <>
      <Modal open={!!contract} onClose={onClose} title={`Contract #${contract.contractId}`} wide>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

          {/* Status + progress */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </span>
            <div className="flex-1 min-w-[140px]">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Progress</span><span className="font-semibold">{meta.progress}%</span>
              </div>
              <ProgressBar value={meta.progress} />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Lifecycle</p>
            <ContractTimeline status={contract.status} />
          </div>

          {/* Pending action banner */}
          {isPending && (
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">
                ⚡ Action Required
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                This contract is awaiting your response. Review the details and terms below, then Accept or Reject.
              </p>
            </div>
          )}

          {/* Rejection reason */}
          {contract.status === 'REJECTED' && contract.vendorRemarks && (
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Your Rejection Reason</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{contract.vendorRemarks}</p>
            </div>
          )}

          {/* Contract details */}
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Project',    contract.projectName || `Project #${contract.projectId}`],
              ['Value',      contract.value ? `$${Number(contract.value).toLocaleString()}` : '—'],
              ['Start Date', contract.startDate || '—'],
              ['End Date',   contract.endDate   || '—'],
              ['Status',     meta.label],
              ['Created',    contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{k}</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{v}</p>
              </div>
            ))}
          </div>

          {contract.description && (
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{contract.description}</p>
            </div>
          )}

          {/* Contract Terms */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contract Terms</p>
            {termsLoading
              ? <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
              : terms.length === 0
                ? <p className="text-xs text-slate-400 italic">No terms have been added to this contract.</p>
                : terms.map((t, i) => (
                  <div key={t.termId} className="flex items-start gap-3 p-3 rounded-xl mb-2"
                    style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-200">{t.description}</p>
                      {t.complianceFlag && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          <Shield size={9} /> Compliance Required
                        </span>
                      )}
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-1 border-t border-slate-100 dark:border-slate-700/50">
            {isPending && (
              <>
                <Button variant="secondary" size="xs"
                  onClick={() => { setRejectModal(true); setRemarks(''); }}
                  disabled={!!loading}
                  className="border-red-300 text-red-600 hover:bg-red-50">
                  <XCircle size={13} className="mr-1" /> Reject
                </Button>
                <Button variant="primary" size="xs"
                  loading={loading === 'ACCEPT'}
                  disabled={!!loading}
                  onClick={handleAccept}
                  style={{ background: '#22C55E' }}>
                  <CheckCircle2 size={13} className="mr-1" /> Accept Contract
                </Button>
              </>
            )}
            <Button variant="secondary" size="xs" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Reject confirmation modal */}
      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Contract">
        <div className="space-y-4">
          <div className="p-3 rounded-xl"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <p className="text-xs text-red-600 font-semibold mb-1">⚠ Are you sure?</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Rejecting this contract is permanent. The contract will be marked as REJECTED and cannot be reactivated.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
              placeholder="Please explain why you are rejecting this contract…"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {!remarks.trim() && (
              <p className="text-xs text-red-500 mt-1">Reason is required to reject</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="xs" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button size="xs" loading={loading === 'REJECT'} disabled={!remarks.trim() || !!loading}
              onClick={handleReject}
              style={{ background: '#DC2626', color: 'white' }}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorContracts() {
  const { user }                      = useAuth();
  const [contracts, setContracts]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [vendorId, setVendorId]       = useState(null);
  const [selected, setSelected]       = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Find the vendorId for the logged-in user
      const vendorRes = await getAllVendors();
      const allVendors = vendorRes.data?.data || [];
      const mine = allVendors.find(v => v.userId === user?.userId || v.username === user?.username);
      if (!mine) { toast.error('Vendor profile not found'); setLoading(false); return; }
      setVendorId(mine.vendorId);

      const contractRes = await getContractsByVendor(mine.vendorId);
      setContracts(contractRes.data?.data || []);
    } catch { toast.error('Failed to load contracts'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'DRAFT', 'COMPLETED', 'TERMINATED', 'EXPIRED', 'REJECTED'];
  const displayed = filterStatus === 'ALL' ? contracts : contracts.filter(c => c.status === filterStatus);

  const pendingCount = contracts.filter(c => c.status === 'PENDING').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading your contracts…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="My Contracts"
        subtitle={`${contracts.length} contract${contracts.length !== 1 ? 's' : ''} assigned to you`}
        actions={
          <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={fetchData}>
            Refresh
          </Button>
        }
      />

      {/* Pending action banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <AlertTriangle size={18} className="text-purple-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
              {pendingCount} contract{pendingCount > 1 ? 's' : ''} awaiting your response
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click on a PENDING contract to review and accept or reject it.
            </p>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => {
          const meta  = statusMeta(s);
          const count = s === 'ALL' ? contracts.length : contracts.filter(c => c.status === s).length;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filterStatus === s
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-transparent border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}
              style={filterStatus === s ? { background: s === 'ALL' ? '#64748b' : meta.color } : {}}>
              {s === 'ALL' ? 'All' : meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Contract cards */}
      {displayed.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400 text-sm">
          {filterStatus === 'ALL'
            ? 'No contracts assigned to you yet.'
            : `No ${filterStatus.toLowerCase()} contracts.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(c => {
            const meta      = statusMeta(c.status);
            const isPending = c.status === 'PENDING';
            return (
              <div key={c.contractId}
                className={`glass-card p-5 cursor-pointer transition-all hover:shadow-md ${
                  isPending ? 'ring-2 ring-purple-400 ring-offset-1' : ''
                }`}
                onClick={() => setSelected(c)}>

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold mb-0.5">
                      #{c.contractId}
                      {isPending && (
                        <span className="ml-2 text-[10px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full font-semibold">
                          Action needed
                        </span>
                      )}
                    </p>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {c.projectName || `Project #${c.projectId}`}
                    </h3>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: meta.bg, color: meta.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-4">
                  {c.value && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Contract Value</span>
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">
                        ${Number(c.value).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {c.startDate || '—'} → {c.endDate || '—'}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-400 truncate">{c.description}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">{meta.progress}%</span>
                  </div>
                  <ProgressBar value={meta.progress} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <ClipboardList size={10} />
                    <span>Click to view details & terms</span>
                  </div>
                  <span className="text-[10px] font-medium flex items-center gap-0.5"
                    style={{ color: isPending ? '#8B5CF6' : '#3B82F6' }}>
                    {isPending ? 'Respond' : 'View'} <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VendorContractModal
        contract={selected}
        vendorId={vendorId}
        onClose={() => setSelected(null)}
        onRefresh={fetchData}
      />
    </div>
  );
}