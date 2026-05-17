import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, RefreshCw, FileText, AlertTriangle, XCircle } from 'lucide-react';
import {
  Button, FormInput, FormSelect, FormTextarea, InfoBox, Modal, PageHeader, StatusCards,
} from '../../components/ui';
import {
  getAllContracts, getMyContracts, createContract,
} from '../../api/contracts';
import { getAllVendors } from '../../api/vendors';
import { getAllProjects, getMyProjects } from '../../api/projects';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import ContractCard from '../../components/contracts/ContractCard';
import ContractDetailModal from '../../components/contracts/ContractDetailModal';
import BudgetBreakdown from '../../components/contracts/BudgetBreakdown';
import { STATUS_OPTIONS, TERMINAL_STATUSES, EMPTY_FORM, validateTermCard, newCard } from '../../constants/contractConstants';
import { formatINR } from '../../utils/format';

/**
 * ContractManagement — main page.
 *
 * Contract lifecycle:
 *   ADMIN/PM creates → DRAFT
 *   ADMIN/PM submits → PENDING
 *   VENDOR accepts   → ACTIVE    (from VendorContracts page)
 *   VENDOR rejects   → REJECTED  (from VendorContracts page)
 *   ADMIN marks      → COMPLETED / TERMINATED / EXPIRED
 *
 * Role behaviour:
 *   ADMIN: sees all contracts, all lifecycle actions
 *   PM:    sees only their project contracts, DRAFT actions only
 *   VENDOR: handled in VendorContracts page
 */
export default function ContractManagement() {
  const { user }                        = useAuth();
  const [contracts, setContracts]       = useState([]);
  const [vendors, setVendors]           = useState([]);
  const [projects, setProjects]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [formErrors, setFormErrors]     = useState({});
  const [createCards, setCreateCards]   = useState([newCard()]);
  const [budgetExceeded, setBudgetExceeded] = useState(false);

  const isAdmin   = user?.role === 'ADMIN';
  const canManage = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);

  // ── Validation ──────────────────────────────────────────────────────────────

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

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ADMIN → GET /contracts (all)         + GET /projects (all)
      // PM    → GET /contracts/manager/my     + GET /projects/my (assigned only)
      const contractFn = isAdmin ? getAllContracts : getMyContracts;
      const projectFn  = isAdmin ? getAllProjects  : getMyProjects;
      const [c, v, p] = await Promise.allSettled([contractFn(), getAllVendors(), projectFn()]);
      setContracts(c.status === 'fulfilled' ? (c.value.data?.data ?? []) : []);
      setVendors(v.status === 'fulfilled'   ? (v.value.data?.data ?? []) : []);
      setProjects(p.status === 'fulfilled'  ? (p.value.data?.data ?? []) : []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create contract ─────────────────────────────────────────────────────────

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

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const updateCreateCard = (id, f, v) => setCreateCards(prev => prev.map(c => c.id === id ? { ...c, [f]: v, error: '' } : c));
  const addCreateCard    = () => setCreateCards(prev => [...prev, newCard()]);
  const removeCreateCard = (id) => setCreateCards(prev => prev.filter(c => c.id !== id));

  // ── Counts for filter cards ─────────────────────────────────────────────────

  const counts = { ALL: contracts.length, DRAFT: 0, PENDING: 0, ACTIVE: 0, COMPLETED: 0, TERMINATED: 0, EXPIRED: 0, REJECTED: 0 };
  contracts.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });

  const displayed      = filterStatus === 'ALL' ? contracts : contracts.filter(c => c.status === filterStatus);
  const activeVendors  = vendors.filter(v => v.status === 'ACTIVE');
  const activeProjects = projects.filter(p => p.status === 'ACTIVE');
  const createSelectedProject = projects.find(p => String(p.projectId) === String(form.projectId));

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading contracts…</span>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fadeIn space-y-5">

      <PageHeader
        title="Contract Management"
        subtitle={
          isAdmin
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

      <StatusCards options={STATUS_OPTIONS} counts={counts} value={filterStatus} onChange={setFilterStatus} cols={8} />

      {displayed.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400 text-sm">
          {filterStatus === 'ALL' ? 'No contracts found.' : `No ${filterStatus.toLowerCase()} contracts.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(c => (
            <ContractCard
              key={c.contractId} contract={c} canManage={canManage}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {/* Detail modal — opens when a card is clicked */}
      <ContractDetailModal
        contract={selected} vendors={vendors} projects={projects}
        onClose={() => setSelected(null)} onRefresh={fetchData}
        canManage={canManage} isAdmin={isAdmin}
      />

      {/* ── Create Contract Modal ── */}
      <Modal open={showCreate} onClose={resetCreate} title="Create New Contract" wide>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <InfoBox variant="info" icon={AlertTriangle}>
            New contracts are created in <strong className="text-blue-600 dark:text-blue-400 mx-1">DRAFT</strong> status.
            Add terms below, then submit for vendor review.
          </InfoBox>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-1 sm:col-span-2">
              <FormSelect label="Vendor" required value={form.vendorId}
                onChange={e => { set('vendorId')(e); if (e.target.value) setFormErrors(p => ({ ...p, vendorId: '' })); }}
                error={formErrors.vendorId || (activeVendors.length === 0 ? 'No active vendors.' : '')}>
                <option value="">Select vendor…</option>
                {activeVendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.name} (#{v.vendorId})</option>)}
              </FormSelect>
            </div>
            <div className="col-span-1 sm:col-span-2">
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
            <div className="col-span-1 sm:col-span-2">
              <FormInput label="Contract Value (₹)" required type="number" min="0.01" step="0.01"
                value={form.value}
                onChange={e => { set('value')(e); if (e.target.value) setFormErrors(p => ({ ...p, value: '' })); }}
                placeholder="0.00" error={formErrors.value} />
              {createSelectedProject && (
                <p className="text-xs text-slate-400 mt-1">
                  Dates: {createSelectedProject.startDate} → {createSelectedProject.endDate}
                </p>
              )}
              {/* Budget breakdown — hard blocks when exceeded */}
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
            <div className="col-span-1 sm:col-span-2">
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
            {/* Hard block: disabled when budget exceeded */}
            <Button variant="primary" size="xs" icon={<FileText size={12} />}
              onClick={handleCreate} loading={saving}
              disabled={saving || budgetExceeded}>
              Create Contract
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}