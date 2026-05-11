import { useState, useEffect, useCallback } from 'react';
import {
  Plus, CheckCircle2, Circle, XCircle, Clock, Loader2, RefreshCw,
  FileText, ChevronRight, AlertTriangle, Zap, Archive, Trash2, Edit3,
  ClipboardList, ArrowRight, Shield, CheckCheck,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import {
  Button, FormInput, FormSelect, FormTextarea, InfoBox, Modal, PageHeader, StatusCards,
} from '../../components/ui';
import {
  getAllContracts, getMyContracts, createContract, updateContract, deleteContract,
  updateContractStatus, getContractTerms, addContractTerm,
  getContractsByVendor, vendorRespondToContract,
} from '../../api/contracts';
import { getAllVendors } from '../../api/vendors';
import { getAllProjects } from '../../api/projects';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import BudgetBreakdown from './BudgetBreakdown';
import { validateTermCard, newCard } from './contractConstants';

// ── Status helpers ───────────────────────────────────────────────────────────

function statusMeta(status) {
  return {
    DRAFT:      { label: 'Draft',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  idx: 0, progress: 5   },
    PENDING:    { label: 'Pending',    color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', idx: 0, progress: 20  },
    ACTIVE:     { label: 'Active',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   idx: 1, progress: 55  },
    COMPLETED:  { label: 'Completed',  color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   idx: 2, progress: 100 },
    TERMINATED: { label: 'Terminated', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   idx: 2, progress: 100 },
    EXPIRED:    { label: 'Expired',    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', idx: 2, progress: 100 },
    REJECTED:   { label: 'Rejected',   color: '#F97316', bg: 'rgba(249,115,22,0.12)',  idx: 2, progress: 100 },
  }[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', idx: 0, progress: 10 };
}

const TIMELINE_STAGES = ['Draft', 'Active', 'Closed'];
function stageIndex(status) {
  if (status === 'DRAFT')  return 0;
  if (status === 'ACTIVE') return 1;
  return 2;
}

const ADMIN_STATUS_OPTIONS = [
  { key: 'ALL',        label: 'All',        color: '#64748b' },
  { key: 'DRAFT',      label: 'Draft',      color: '#F59E0B' },
  { key: 'ACTIVE',     label: 'Active',     color: '#22C55E' },
  { key: 'COMPLETED',  label: 'Completed',  color: '#2563EB' },
  { key: 'TERMINATED', label: 'Terminated', color: '#EF4444' },
  { key: 'EXPIRED',    label: 'Expired',    color: '#94a3b8' },
];

const VENDOR_STATUS_OPTIONS = [
  { key: 'ALL',        label: 'All',        color: '#64748b' },
  { key: 'PENDING',    label: 'Pending',    color: '#A78BFA' },
  { key: 'ACTIVE',     label: 'Active',     color: '#22C55E' },
  { key: 'COMPLETED',  label: 'Completed',  color: '#2563EB' },
  { key: 'TERMINATED', label: 'Terminated', color: '#EF4444' },
  { key: 'REJECTED',   label: 'Rejected',   color: '#F97316' },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function ContractTimeline({ status }) {
  const activeIdx    = stageIndex(status);
  const isTerminated = status === 'TERMINATED';
  const isExpired    = status === 'EXPIRED';
  const isCompleted  = status === 'COMPLETED';
  const closeLabel   = isTerminated ? 'Terminated' : isExpired ? 'Expired' : isCompleted ? 'Completed' : 'Closed';

  return (
    <div className="flex items-center gap-0 py-2">
      {TIMELINE_STAGES.map((s, i) => {
        const label = i === 2 ? closeLabel : s;
        const done  = i < activeIdx;
        const curr  = i === activeIdx;
        let dotColor = 'bg-slate-200 dark:bg-slate-700';
        if (done) dotColor = 'bg-blue-600';
        if (curr) {
          if (isTerminated) dotColor = 'bg-red-500';
          else if (isExpired) dotColor = 'bg-slate-400';
          else dotColor = 'bg-blue-600';
        }
        let textColor = 'text-slate-400';
        if (curr) {
          if (isTerminated) textColor = 'text-red-500';
          else if (isExpired) textColor = 'text-slate-500';
          else textColor = 'text-blue-600';
        }
        if (done) textColor = 'text-blue-500';

        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all ${dotColor} shadow-sm`}>
                {done ? <CheckCircle2 size={13} /> : curr && (isTerminated || isExpired)
                  ? <XCircle size={13} />
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

function LifecycleActions({ contract, onStatusChange, canManage }) {
  const [loading, setLoading] = useState(null);

  if (!canManage) return null;

  const actions = [];
  if (contract.status === 'DRAFT') {
    actions.push({ label: 'Activate Contract', status: 'ACTIVE',     color: '#22C55E', icon: Zap      });
    actions.push({ label: 'Delete Draft',       status: '__DELETE__', color: '#EF4444', icon: Trash2   });
  } else if (contract.status === 'ACTIVE') {
    actions.push({ label: 'Mark Completed', status: 'COMPLETED',  color: '#2563EB', icon: CheckCircle2 });
    actions.push({ label: 'Terminate',      status: 'TERMINATED', color: '#EF4444', icon: XCircle      });
    actions.push({ label: 'Mark Expired',   status: 'EXPIRED',    color: '#94a3b8', icon: Archive      });
  }

  if (actions.length === 0) return (
    <p className="text-xs text-slate-400 italic">This contract is in a terminal state — no further transitions available.</p>
  );

  const handle = async (action) => {
    setLoading(action.status);
    try { await onStatusChange(action.status); }
    finally { setLoading(null); }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.status}
            onClick={() => handle(a)}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: a.color, boxShadow: `0 2px 8px ${a.color}55` }}
          >
            {loading === a.status ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

function ContractTermsTab({ contractId, isDraft, canManage }) {
  const [terms, setTerms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newTerm, setNewTerm]     = useState('');
  const [flag, setFlag]           = useState(false);
  const [adding, setAdding]       = useState(false);
  const [termError, setTermError] = useState('');

  const loadTerms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContractTerms(contractId);
      setTerms(res.data?.data || []);
    } catch { setTerms([]); }
    finally { setLoading(false); }
  }, [contractId]);

  useEffect(() => { loadTerms(); }, [loadTerms]);

  const handleAdd = async () => {
    if (!newTerm.trim()) { setTermError('Description is required'); return; }
    setTermError('');
    setAdding(true);
    try {
      await addContractTerm(contractId, { description: newTerm, complianceFlag: flag });
      setNewTerm('');
      setFlag(false);
      toast.success('Term added');
      loadTerms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add term');
    } finally { setAdding(false); }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-3">
      {terms.length === 0
        ? <p className="text-sm text-slate-400 text-center py-4">No contract terms yet.</p>
        : terms.map((t, i) => (
          <div key={t.termId} className="flex items-start gap-3 p-3 rounded-xl"
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

      {canManage && isDraft && (
        <div className="pt-2 space-y-2">
          <FormTextarea
            value={newTerm}
            onChange={e => { setNewTerm(e.target.value); if (e.target.value.trim()) setTermError(''); }}
            placeholder="Add a new contract term…"
            rows={2}
            error={termError}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={flag} onChange={e => setFlag(e.target.checked)} className="accent-amber-500" />
              Mark as compliance-required
            </label>
            <Button variant="primary" size="xs" onClick={handleAdd} disabled={adding || !newTerm.trim()} loading={adding}>
              Add Term
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractDetailModal({ contract, vendors, projects, onClose, onRefresh, canManage }) {
  const [tab, setTab]               = useState('details');
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const validateEdit = () => {
    const e = {};
    if (!editForm.vendorId)  e.vendorId  = 'Please select a vendor';
    if (!editForm.projectId) e.projectId = 'Please select a project';
    if (!editForm.value)     e.value     = 'Contract value is required';
    if (!editForm.startDate) e.startDate = 'Start date is required';
    if (!editForm.endDate)   e.endDate   = 'End date is required';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!contract) return null;

  const meta     = statusMeta(contract.status);
  const progress = meta.progress;
  const isDraft  = contract.status === 'DRAFT';

  const openEdit = () => {
    setEditForm({
      vendorId:    contract.vendorId || '',
      projectId:   contract.projectId || '',
      startDate:   contract.startDate || '',
      endDate:     contract.endDate || '',
      value:       contract.value || '',
      description: contract.description || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!validateEdit()) return;
    setSaving(true);
    try {
      await updateContract(contract.contractId, {
        vendorId:    Number(editForm.vendorId),
        projectId:   Number(editForm.projectId),
        startDate:   editForm.startDate,
        endDate:     editForm.endDate,
        value:       Number(editForm.value),
        description: editForm.description || undefined,
      });
      toast.success('Contract updated');
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === '__DELETE__') {
      if (!window.confirm('Delete this DRAFT contract? This cannot be undone.')) return;
      try {
        await deleteContract(contract.contractId);
        toast.success('Contract deleted');
        onClose();
        onRefresh();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete');
      }
      return;
    }
    try {
      await updateContractStatus(contract.contractId, newStatus);
      toast.success(`Contract moved to ${newStatus}`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  const setF = (k) => (e) => setEditForm((p) => ({ ...p, [k]: e.target.value }));
  const activeVendors = vendors.filter(v => v.status === 'ACTIVE');

  const visibleTabs = ['details', 'terms', ...(canManage ? ['actions'] : [])];

  return (
    <Modal open={!!contract} onClose={onClose} title={`Contract #${contract.contractId}`} wide>
      <div className="space-y-5">
        {/* Status badge + progress */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
          <div className="flex-1 min-w-[140px]">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Progress</span><span className="font-semibold">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Lifecycle</p>
          <ContractTimeline status={contract.status} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 dark:border-slate-700/50">
          {visibleTabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold capitalize transition-all rounded-t-lg ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              {t === 'terms' ? 'Contract Terms' : t === 'actions' ? 'Lifecycle Actions' : 'Details'}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            {!editing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Vendor',     contract.vendorName  || `Vendor #${contract.vendorId}`],
                    ['Project',    contract.projectName || `Project #${contract.projectId}`],
                    ['Value',      contract.value ? `$${Number(contract.value).toLocaleString()}` : '—'],
                    ['Start Date', contract.startDate || '—'],
                    ['End Date',   contract.endDate   || '—'],
                    ['Created',    contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{k}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{v}</p>
                    </div>
                  ))}
                </div>
                {contract.description && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{contract.description}</p>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  {canManage && isDraft && (
                    <Button variant="secondary" size="xs" icon={<Edit3 size={12} />} onClick={openEdit}>Edit</Button>
                  )}
                  <Button variant="secondary" size="xs" onClick={onClose}>Close</Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect label="Vendor" required value={editForm.vendorId} onChange={setF('vendorId')} error={editErrors.vendorId}>
                    <option value="">Select vendor…</option>
                    {activeVendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
                  </FormSelect>
                  <FormSelect label="Project" required value={editForm.projectId} onChange={setF('projectId')} error={editErrors.projectId}>
                    <option value="">Select project…</option>
                    {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.name}</option>)}
                  </FormSelect>
                  <FormInput label="Start Date" required type="date" value={editForm.startDate} onChange={setF('startDate')} error={editErrors.startDate} />
                  <FormInput label="End Date" required type="date" value={editForm.endDate} onChange={setF('endDate')} error={editErrors.endDate} />
                </div>
                <FormInput label="Contract Value ($)" required type="number" value={editForm.value} onChange={setF('value')} placeholder="0.00" error={editErrors.value} />
                <FormTextarea label="Description" value={editForm.description} onChange={setF('description')} rows={3} />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="xs" onClick={() => { setEditing(false); setEditErrors({}); }}>Cancel</Button>
                  <Button variant="primary" size="xs" onClick={handleSave} loading={saving}>Save Changes</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terms tab */}
        {tab === 'terms' && (
          <ContractTermsTab contractId={contract.contractId} isDraft={isDraft} canManage={canManage} />
        )}

        {/* Lifecycle Actions tab */}
        {tab === 'actions' && canManage && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-sm"
              style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">Allowed Transitions</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {contract.status === 'DRAFT'     && 'DRAFT → ACTIVE (activate), or delete this draft.'}
                {contract.status === 'ACTIVE'    && 'ACTIVE → COMPLETED, TERMINATED, or EXPIRED.'}
                {['COMPLETED','TERMINATED','EXPIRED'].includes(contract.status) && 'This contract is in a terminal state.'}
              </p>
            </div>
            <LifecycleActions contract={contract} onStatusChange={handleStatusChange} canManage={canManage} />
          </div>
        )}
      </div>
    </Modal>
  );
}

const EMPTY_FORM = {
  vendorId: '', projectId: '', startDate: '', endDate: '', value: '', description: '',
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function ContractManagement() {
  const { user }                            = useAuth();
  const [contracts, setContracts]           = useState([]);
  const [vendors, setVendors]               = useState([]);
  const [projects, setProjects]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selected, setSelected]             = useState(null);
  const [showCreate, setShowCreate]         = useState(false);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);
  const [filterStatus, setFilterStatus]     = useState('ALL');
  const [formErrors, setFormErrors]         = useState({});
  const [createCards, setCreateCards]       = useState([newCard()]);
  const [budgetExceeded, setBudgetExceeded] = useState(false);

  // Vendor-specific state
  const [vendorRecord,     setVendorRecord]     = useState(null);
  const [rejectContractId, setRejectContractId] = useState(null);
  const [rejectRemarks,    setRejectRemarks]    = useState('');

  const isAdmin   = user?.role === 'ADMIN';
  const isVendor  = user?.role === 'VENDOR';
  const canManage = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);

  // ── Validation ───────────────────────────────────────────────────────────────

  const validateCreate = () => {
    const e = {};
    if (!form.vendorId)  e.vendorId  = 'Please select a vendor';
    if (!form.projectId) e.projectId = 'Please select a project';
    if (!form.value)     e.value     = 'Contract value is required';
    if (form.value && Number(form.value) <= 0) e.value = 'Must be greater than 0';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate)   e.endDate   = 'End date is required';
    if (budgetExceeded)  e.value     = 'Contract value exceeds remaining project budget';
    const proj = projects.find(p => String(p.projectId) === String(form.projectId));
    if (proj) {
      if (form.startDate && form.startDate < proj.startDate)
        e.startDate = `Cannot be before project start (${proj.startDate})`;
      if (form.endDate && form.endDate > proj.endDate)
        e.endDate = `Cannot exceed project end (${proj.endDate})`;
    }
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      e.endDate = 'End date must be after start date';
    let cardError = false;
    setCreateCards(prev => prev.map(c => {
      const err = validateTermCard(c);
      if (err) { cardError = true; return { ...c, error: err }; }
      return c;
    }));
    setFormErrors(e);
    return Object.keys(e).length === 0 && !cardError;
  };

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isVendor) {
        const vendorRes  = await getAllVendors();
        const allVendors = vendorRes.data?.data || [];
        const mine       = allVendors.find(v => v.userId === user.userId || v.username === user.username);
        if (mine) {
          setVendorRecord(mine);
          const vcRes = await getContractsByVendor(mine.vendorId);
          setContracts(vcRes.data?.data || []);
        } else {
          setContracts([]);
        }
      } else {
        // ADMIN → all contracts; PM → their project contracts only
        const contractFn = isAdmin ? getAllContracts : getMyContracts;
        const [c, v, p] = await Promise.allSettled([contractFn(), getAllVendors(), getAllProjects()]);
        setContracts(c.status === 'fulfilled' ? (c.value.data?.data ?? []) : []);
        setVendors(v.status === 'fulfilled'   ? (v.value.data?.data ?? []) : []);
        setProjects(p.status === 'fulfilled'  ? (p.value.data?.data ?? []) : []);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [user, isVendor, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create contract ──────────────────────────────────────────────────────────

  const resetCreate = () => {
    setShowCreate(false); setForm(EMPTY_FORM); setFormErrors({});
    setCreateCards([newCard()]); setBudgetExceeded(false);
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setSaving(true);
    try {
      await createContract({
        vendorId:    Number(form.vendorId),
        projectId:   Number(form.projectId),
        startDate:   form.startDate,
        endDate:     form.endDate,
        value:       Number(form.value),
        description: form.description || undefined,
        terms: createCards
          .filter(c => c.description.trim())
          .map(c => ({ description: c.description.trim(), complianceFlag: c.complianceFlag })),
      });
      toast.success('Contract created in DRAFT status');
      resetCreate(); fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create contract');
    } finally { setSaving(false); }
  };

  // ── Vendor actions ───────────────────────────────────────────────────────────

  const handleVendorAccept = async (contractId) => {
    setSaving(true);
    try {
      await vendorRespondToContract(contractId, 'ACCEPT', vendorRecord.vendorId);
      toast.success('Contract accepted');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to accept contract'); }
    finally { setSaving(false); }
  };

  const handleVendorReject = async () => {
    if (!rejectRemarks.trim()) { toast.error('Rejection reason is required'); return; }
    setSaving(true);
    try {
      await vendorRespondToContract(rejectContractId, 'REJECT', vendorRecord.vendorId, rejectRemarks.trim());
      toast.success('Contract rejected');
      setRejectContractId(null);
      setRejectRemarks('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject contract'); }
    finally { setSaving(false); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const set            = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const updateCreateCard = (id, f, v) => setCreateCards(prev => prev.map(c => c.id === id ? { ...c, [f]: v, error: '' } : c));
  const addCreateCard    = () => setCreateCards(prev => [...prev, newCard()]);
  const removeCreateCard = (id) => setCreateCards(prev => prev.filter(c => c.id !== id));

  const statusOptions = isVendor ? VENDOR_STATUS_OPTIONS : ADMIN_STATUS_OPTIONS;

  const counts = { ALL: contracts.length, DRAFT: 0, PENDING: 0, ACTIVE: 0, COMPLETED: 0, TERMINATED: 0, EXPIRED: 0, REJECTED: 0 };
  contracts.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });

  const displayed             = filterStatus === 'ALL' ? contracts : contracts.filter(c => c.status === filterStatus);
  const activeVendors         = vendors.filter(v => v.status === 'ACTIVE');
  const activeProjects        = projects.filter(p => p.status === 'ACTIVE' || p.status === 'PLANNING');
  const createSelectedProject = projects.find(p => String(p.projectId) === String(form.projectId));

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading contracts…</span>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fadeIn space-y-5">

      <PageHeader
        title={isVendor ? 'My Contracts' : 'Contract Management'}
        subtitle={
          isVendor
            ? `${contracts.length} total · ${contracts.filter(c => c.status === 'ACTIVE').length} active`
            : isAdmin
              ? `${contracts.length} contracts · Lifecycle: DRAFT → PENDING → ACTIVE → CLOSED`
              : `${contracts.length} contract${contracts.length !== 1 ? 's' : ''} for your projects`
        }
        actions={
          <>
            <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={fetchData}>Refresh</Button>
            {canManage && (
              <Button variant="primary" size="xs" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
                New Contract
              </Button>
            )}
          </>
        }
      />

      <StatusCards
        options={statusOptions}
        counts={counts}
        value={filterStatus}
        onChange={setFilterStatus}
        cols={6}
      />

      {displayed.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400 text-sm">
          {filterStatus === 'ALL'
            ? (isVendor ? 'No contracts assigned yet.' : 'No contracts found.')
            : `No ${filterStatus.toLowerCase()} contracts.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(c => {
            const meta = statusMeta(c.status);
            return (
              <div key={c.contractId}
                className="glass-card p-5 cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelected(c)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold mb-0.5">#{c.contractId}</p>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {isVendor ? (c.title || c.projectName || 'Contract') : (c.vendorName || `Vendor #${c.vendorId}`)}
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

                <div className="space-y-1.5 mb-4">
                  {c.value && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Contract Value</span>
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">${Number(c.value).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-slate-500 dark:text-slate-400">{c.startDate || '—'} → {c.endDate || '—'}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">{meta.progress}%</span>
                  </div>
                  <ProgressBar value={meta.progress} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <ClipboardList size={10} />
                    <span>Click to view details & terms</span>
                  </div>
                  {/* Vendor accept/reject inline actions */}
                  {isVendor && c.status === 'PENDING' && (
                    <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleVendorAccept(c.contractId)}
                        disabled={saving}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/40 hover:bg-green-100 disabled:opacity-50 transition-all"
                      >
                        {saving ? <Loader2 size={9} className="animate-spin" /> : <CheckCheck size={10} />} Accept
                      </button>
                      <button
                        onClick={() => { setRejectContractId(c.contractId); setRejectRemarks(''); }}
                        disabled={saving}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/40 hover:bg-red-100 disabled:opacity-50 transition-all"
                      >
                        <XCircle size={10} /> Reject
                      </button>
                    </div>
                  )}
                  {canManage && (c.status === 'DRAFT' || c.status === 'ACTIVE') && (
                    <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                      Manage <ChevronRight size={10} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <ContractDetailModal
        contract={selected} vendors={vendors} projects={projects}
        onClose={() => setSelected(null)} onRefresh={fetchData}
        canManage={canManage}
      />

      {/* Create Contract Modal (admin/PM only) */}
      {canManage && (
        <Modal open={showCreate} onClose={resetCreate} title="Create New Contract" wide>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <InfoBox variant="info" icon={AlertTriangle}>
              New contracts are created in <strong className="text-blue-600 dark:text-blue-400 mx-1">DRAFT</strong> status.
              Add terms below, then activate from the detail view.
            </InfoBox>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FormSelect label="Vendor" required value={form.vendorId}
                  onChange={e => { set('vendorId')(e); if (e.target.value) setFormErrors(p => ({ ...p, vendorId: '' })); }}
                  error={formErrors.vendorId || (activeVendors.length === 0 ? 'No active vendors.' : '')}>
                  <option value="">Select vendor…</option>
                  {activeVendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.name} (#{v.vendorId})</option>)}
                </FormSelect>
              </div>
              <div className="col-span-2">
                <FormSelect label="Project" required value={form.projectId}
                  onChange={e => {
                    set('projectId')(e);
                    if (e.target.value) { setFormErrors(p => ({ ...p, projectId: '' })); setBudgetExceeded(false); }
                  }}
                  error={formErrors.projectId || (activeProjects.length === 0 ? 'No active projects.' : '')}>
                  <option value="">Select project…</option>
                  {activeProjects.map(p => (
                    <option key={p.projectId} value={p.projectId}>{p.name || `Project #${p.projectId}`} ({p.status})</option>
                  ))}
                </FormSelect>
              </div>
              <div className="col-span-2">
                <FormInput label="Contract Value (₹)" required type="number" min="0.01" step="0.01"
                  value={form.value}
                  onChange={e => { set('value')(e); if (e.target.value) setFormErrors(p => ({ ...p, value: '' })); }}
                  placeholder="0.00" error={formErrors.value} />
                {createSelectedProject && (
                  <p className="text-xs text-slate-400 mt-1">
                    Project dates: {createSelectedProject.startDate} → {createSelectedProject.endDate}
                  </p>
                )}
                <BudgetBreakdown
                  project={createSelectedProject}
                  currentValue={form.value}
                  onBudgetStatus={setBudgetExceeded}
                />
              </div>
              <FormInput label="Start Date" required type="date" value={form.startDate}
                min={createSelectedProject?.startDate} max={createSelectedProject?.endDate}
                onChange={e => { set('startDate')(e); if (e.target.value) setFormErrors(p => ({ ...p, startDate: '' })); }}
                error={formErrors.startDate} />
              <FormInput label="End Date" required type="date" value={form.endDate}
                min={form.startDate || createSelectedProject?.startDate} max={createSelectedProject?.endDate}
                onChange={e => { set('endDate')(e); if (e.target.value) setFormErrors(p => ({ ...p, endDate: '' })); }}
                error={formErrors.endDate} />
              <div className="col-span-2">
                <FormTextarea label="Description" value={form.description} onChange={set('description')}
                  rows={2} placeholder="Optional description…" />
              </div>
            </div>

            {/* Contract terms */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contract Terms</p>
              <div className="space-y-2">
                {createCards.map((card, idx) => (
                  <div key={card.id} className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 space-y-2"
                    style={{ background: 'rgba(148,163,184,0.05)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Term {idx + 1}</span>
                      {createCards.length > 1 && (
                        <button onClick={() => removeCreateCard(card.id)}
                          className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                          <XCircle size={12} /> Remove
                        </button>
                      )}
                    </div>
                    <FormTextarea value={card.description}
                      onChange={e => updateCreateCard(card.id, 'description', e.target.value)}
                      placeholder="Enter term description… (min 3 characters)" rows={2} error={card.error} />
                    <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={card.complianceFlag}
                        onChange={e => updateCreateCard(card.id, 'complianceFlag', e.target.checked)}
                        className="accent-amber-500" />
                      Mark as compliance-required
                    </label>
                  </div>
                ))}
                <button onClick={addCreateCard}
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-1">
                  <Plus size={13} /> Add another term
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="secondary" size="xs" onClick={resetCreate}>Cancel</Button>
              <Button variant="primary" size="xs" icon={<FileText size={12} />}
                onClick={handleCreate} loading={saving}
                disabled={saving || budgetExceeded}>
                Create Contract
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Vendor reject contract modal */}
      {isVendor && (
        <Modal
          open={rejectContractId !== null}
          onClose={() => { setRejectContractId(null); setRejectRemarks(''); }}
          title="Reject Contract"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide a reason for rejecting contract{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">#{rejectContractId}</span>.
            </p>
            <FormTextarea
              label="Rejection Reason"
              required
              value={rejectRemarks}
              onChange={e => setRejectRemarks(e.target.value)}
              rows={3}
              placeholder="Explain why you are rejecting this contract…"
            />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" size="xs" onClick={() => { setRejectContractId(null); setRejectRemarks(''); }}>
                Cancel
              </Button>
              <Button variant="danger" size="xs" onClick={handleVendorReject} loading={saving}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
