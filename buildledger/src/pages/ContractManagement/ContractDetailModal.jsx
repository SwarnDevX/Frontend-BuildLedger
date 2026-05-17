import { useState, useEffect, useCallback } from 'react';
import { Edit3, Loader2, Shield, Pencil, Check, Plus, XCircle } from 'lucide-react';
import {
  Button, FormInput, FormSelect, FormTextarea, Modal, ProgressBar,
} from '../../components/ui';
import {
  updateContract, deleteContract, updateContractStatus,
  getContractTerms, addContractTerm, updateContractTerm,
} from '../../api/contracts';
import ContractTimeline from './ContractTimeline';
import ContractLifecycleActions from './ContractLifecycleActions';
import BudgetBreakdown from './BudgetBreakdown';
import { statusMeta, formatINR, TERMINAL_STATUSES, validateTermCard, newCard } from './contractConstants';
import toast from 'react-hot-toast';

/**
 * ContractDetailModal — full contract view with tabs:
 *   - Details & Terms: view details, view/edit terms (DRAFT only)
 *   - Lifecycle Actions: role-aware status transitions
 */
export default function ContractDetailModal({
  contract, vendors, projects, onClose, onRefresh, canManage, isAdmin,
}) {
  const [tab, setTab]               = useState('details');
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editBudgetExceeded, setEditBudgetExceeded] = useState(false);

  // Terms state
  const [terms, setTerms]                     = useState([]);
  const [termsLoading, setTermsLoading]       = useState(false);
  const [editingTermId, setEditingTermId]     = useState(null);
  const [editingTermText, setEditingTermText] = useState('');
  const [editingTermFlag, setEditingTermFlag] = useState(false);
  const [savingTerm, setSavingTerm]           = useState(false);
  const [termCards, setTermCards]             = useState([newCard()]);
  const [submittingTerms, setSubmittingTerms] = useState(false);

  const loadTerms = useCallback(async () => {
    if (!contract) return;
    setTermsLoading(true);
    try { const res = await getContractTerms(contract.contractId); setTerms(res.data?.data || []); }
    catch { setTerms([]); }
    finally { setTermsLoading(false); }
  }, [contract?.contractId]);

  useEffect(() => { loadTerms(); }, [loadTerms]);
  useEffect(() => {
    if (!editing) {
      setTermCards([newCard()]); setEditingTermId(null); setEditBudgetExceeded(false);
    }
  }, [editing]);

  if (!contract) return null;

  const meta    = statusMeta(contract.status);
  const isDraft = contract.status === 'DRAFT';

  const activeVendors      = vendors.filter(v => v.status === 'ACTIVE');
  const activeProjects     = projects.filter(p => p.status === 'ACTIVE' || p.status === 'PLANNING');
  const editSelectedProject = projects.find(p => String(p.projectId) === String(editForm.projectId));

  // ── Edit validation ─────────────────────────────────────────────────────────

  const validateEdit = () => {
    const e = {};
    if (!editForm.vendorId)  e.vendorId  = 'Please select a vendor';
    if (!editForm.projectId) e.projectId = 'Please select a project';
    if (!editForm.value)     e.value     = 'Contract value is required';
    if (editForm.value && Number(editForm.value) <= 0) e.value = 'Must be greater than 0';
    if (!editForm.startDate) e.startDate = 'Start date is required';
    if (!editForm.endDate)   e.endDate   = 'End date is required';
    const proj = projects.find(p => String(p.projectId) === String(editForm.projectId));
    if (proj) {
      if (editForm.startDate && editForm.startDate < proj.startDate)
        e.startDate = `Cannot be before project start (${proj.startDate})`;
      if (editForm.endDate && editForm.endDate > proj.endDate)
        e.endDate = `Cannot exceed project end (${proj.endDate})`;
    }
    if (editForm.startDate && editForm.endDate && editForm.endDate <= editForm.startDate)
      e.endDate = 'End date must be after start date';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openEdit = () => {
    setEditForm({
      vendorId: contract.vendorId || '', projectId: contract.projectId || '',
      startDate: contract.startDate || '', endDate: contract.endDate || '',
      value: contract.value || '', description: contract.description || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!validateEdit()) return;
    if (editBudgetExceeded) {
      toast.error('Contract value exceeds remaining budget.');
      return;
    }
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
      toast.success('Contract updated'); setEditing(false); onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === '__DELETE__') {
      if (!window.confirm('Delete this DRAFT contract?')) return;
      try { await deleteContract(contract.contractId); toast.success('Contract deleted'); onClose(); onRefresh(); }
      catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
      return;
    }
    try {
      await updateContractStatus(contract.contractId, newStatus);
      toast.success(`Contract → ${newStatus}`);
      onRefresh(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Status transition failed'); }
  };

  // ── Term handlers ──────────────────────────────────────────────────────────

  const startEditTerm = (t) => {
    setEditingTermId(t.termId); setEditingTermText(t.description); setEditingTermFlag(t.complianceFlag || false);
  };

  const saveEditTerm = async (termId) => {
    if (!editingTermText.trim() || editingTermText.trim().length < 3) {
      toast.error('Term must be at least 3 characters'); return;
    }
    setSavingTerm(true);
    try {
      await updateContractTerm(termId, { description: editingTermText.trim(), complianceFlag: editingTermFlag });
      toast.success('Term updated'); setEditingTermId(null); await loadTerms();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update term'); }
    finally { setSavingTerm(false); }
  };

  const updateCard   = (id, f, v) => setTermCards(prev => prev.map(c => c.id === id ? { ...c, [f]: v, error: '' } : c));
  const addCard      = () => setTermCards(prev => [...prev, newCard()]);
  const removeCard   = (id) => setTermCards(prev => prev.filter(c => c.id !== id));

  const handleSubmitTerms = async () => {
    let hasError = false;
    setTermCards(prev => prev.map(c => {
      const err = validateTermCard(c);
      if (err) { hasError = true; return { ...c, error: err }; }
      return c;
    }));
    if (hasError) return;
    setSubmittingTerms(true);
    try {
      for (const card of termCards)
        await addContractTerm(contract.contractId, { description: card.description.trim(), complianceFlag: card.complianceFlag });
      toast.success(`${termCards.length} term${termCards.length > 1 ? 's' : ''} added`);
      setTermCards([newCard()]); await loadTerms();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add terms'); }
    finally { setSubmittingTerms(false); }
  };

  const setF = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal open={!!contract} onClose={onClose} title={`Contract #${contract.contractId}`} wide>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

        {/* Status badge + progress */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />{meta.label}
          </span>
          <div className="flex-1 min-w-[140px]">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Progress</span><span className="font-semibold">{meta.progress}%</span>
            </div>
            <ProgressBar value={meta.progress} />
          </div>
        </div>

        {/* Lifecycle timeline */}
        <div>
          <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Lifecycle</p>
          <ContractTimeline status={contract.status} />
        </div>

        {/* Rejection reason */}
        {contract.status === 'REJECTED' && contract.vendorRemarks && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Rejection Reason</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{contract.vendorRemarks}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 dark:border-slate-700/50">
          {['details', 'actions'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold capitalize transition-all rounded-t-lg ${
                tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}>
              {t === 'actions' ? 'Lifecycle Actions' : 'Details & Terms'}
            </button>
          ))}
        </div>

        {/* ── Details & Terms tab ── */}
        {tab === 'details' && (
          <div className="space-y-4">
            {!editing ? (
              <>
                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    ['Vendor',     contract.vendorName  || `Vendor #${contract.vendorId}`],
                    ['Project',    contract.projectName || `Project #${contract.projectId}`],
                    ['Value',      contract.value ? formatINR(contract.value) : '—'],
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

                {/* Terms list */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contract Terms</p>
                  {termsLoading
                    ? <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
                    : terms.length === 0
                      ? <p className="text-xs text-slate-400 italic">No terms added yet.</p>
                      : terms.map((t, i) => (
                        <div key={t.termId} className="flex items-start gap-3 p-3 rounded-xl mb-2"
                          style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
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

                <div className="flex gap-2 justify-end pt-1">
                  {canManage && (isDraft || (!isAdmin && contract.status === 'ACTIVE')) && (
                    <Button variant="secondary" size="xs" icon={<Edit3 size={12} />} onClick={openEdit}>Edit Contract</Button>
                  )}
                  <Button variant="secondary" size="xs" onClick={onClose}>Close</Button>
                </div>
              </>
            ) : (
              /* Edit form — DRAFT only */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormSelect label="Vendor" required value={editForm.vendorId} onChange={setF('vendorId')} error={editErrors.vendorId}>
                    <option value="">Select vendor…</option>
                    {activeVendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
                  </FormSelect>
                  <FormSelect label="Project" required value={editForm.projectId} onChange={setF('projectId')} error={editErrors.projectId}>
                    <option value="">Select project…</option>
                    {activeProjects.map(p => <option key={p.projectId} value={p.projectId}>{p.name}</option>)}
                  </FormSelect>
                  <FormInput label="Start Date" required type="date" value={editForm.startDate}
                    min={editSelectedProject?.startDate} max={editSelectedProject?.endDate}
                    onChange={setF('startDate')} error={editErrors.startDate} />
                  <FormInput label="End Date" required type="date" value={editForm.endDate}
                    min={editForm.startDate || editSelectedProject?.startDate} max={editSelectedProject?.endDate}
                    onChange={setF('endDate')} error={editErrors.endDate} />
                </div>
                <FormInput label="Contract Value (₹)" required type="number" min="0.01" step="0.01"
                  value={editForm.value} onChange={setF('value')} placeholder="0.00" error={editErrors.value} />
                {editSelectedProject && <p className="text-xs text-slate-400">Dates: {editSelectedProject.startDate} → {editSelectedProject.endDate}</p>}
                <BudgetBreakdown project={editSelectedProject} currentValue={editForm.value} onBudgetStatus={setEditBudgetExceeded} />
                <FormTextarea label="Description" value={editForm.description} onChange={setF('description')} rows={2} />

                {/* Edit existing terms */}
                {terms.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Edit Existing Terms</p>
                    {terms.map((t, i) => (
                      <div key={t.termId} className="p-3 rounded-xl mb-2" style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
                        {editingTermId === t.termId ? (
                          <div className="space-y-2">
                            <FormTextarea value={editingTermText} onChange={e => setEditingTermText(e.target.value)} rows={2} placeholder="Term description…" />
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                                <input type="checkbox" checked={editingTermFlag} onChange={e => setEditingTermFlag(e.target.checked)} className="accent-amber-500" /> Compliance-required
                              </label>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingTermId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
                                <button onClick={() => saveEditTerm(t.termId)} disabled={savingTerm}
                                  className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                  {savingTerm ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <div className="flex-1">
                              <p className="text-sm text-slate-700 dark:text-slate-200">{t.description}</p>
                              {t.complianceFlag && <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full"><Shield size={9} /> Compliance Required</span>}
                            </div>
                            <button onClick={() => startEditTerm(t)} className="shrink-0 text-slate-400 hover:text-blue-600 transition-colors p-1"><Pencil size={13} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new terms */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add New Terms</p>
                  <div className="space-y-2">
                    {termCards.map((card, idx) => (
                      <div key={card.id} className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 space-y-2" style={{ background: 'rgba(148,163,184,0.05)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400">Term {terms.length + idx + 1}</span>
                          {termCards.length > 1 && <button onClick={() => removeCard(card.id)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1"><XCircle size={12} /> Remove</button>}
                        </div>
                        <FormTextarea value={card.description} onChange={e => updateCard(card.id, 'description', e.target.value)} placeholder="Enter term description… (min 3 characters)" rows={2} error={card.error} />
                        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                          <input type="checkbox" checked={card.complianceFlag} onChange={e => updateCard(card.id, 'complianceFlag', e.target.checked)} className="accent-amber-500" /> Mark as compliance-required
                        </label>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <button onClick={addCard} className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"><Plus size={13} /> Add another term</button>
                      <Button variant="primary" size="xs" loading={submittingTerms} disabled={submittingTerms} onClick={handleSubmitTerms}>
                        Submit {termCards.length > 1 ? `All ${termCards.length} Terms` : 'Term'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-700/50 pt-3">
                  <Button variant="secondary" size="xs" onClick={() => { setEditing(false); setEditErrors({}); }}>Cancel</Button>
                  <Button variant="primary" size="xs" onClick={handleSave} loading={saving} disabled={saving || editBudgetExceeded}>
                    Save Contract
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Lifecycle Actions tab ── */}
        {tab === 'actions' && (
          <ContractLifecycleActions
            contract={contract} onStatusChange={handleStatusChange}
            canManage={canManage} isAdmin={isAdmin}
          />
        )}
      </div>
    </Modal>
  );
}