import { useState, useEffect } from 'react';
import { Plus, X, CheckCircle2, Circle, Clock, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import { getAllContracts, createContract, updateContractStatus } from '../../api/contracts';
import { getAllVendors } from '../../api/vendors';
import { getAllProjects } from '../../api/projects';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// NOTE: The following analytics are not available from the backend:
//   - Contract progress percentage (field not in response) — derived from status
//   - Compliance flag per contract — no dedicated field returned by GET /contracts
//   Future endpoint needed: GET /contracts/{id}/compliance-summary

const CONTRACT_TYPES = ['FIXED_PRICE', 'LUMP_SUM', 'UNIT_PRICE', 'COST_PLUS'];

function statusToProgress(status) {
  const map = { DRAFT: 5, ACTIVE: 55, COMPLETED: 100, TERMINATED: 100, ON_HOLD: 40 };
  return map[status] || 10;
}

function ContractTimeline({ status }) {
  const stages = ['Draft', 'Active', 'Review', 'Completed'];
  const idxMap = { DRAFT: 0, ACTIVE: 1, ON_HOLD: 1, TERMINATED: 2, COMPLETED: 3 };
  const activeIdx = idxMap[status] ?? 0;
  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-all ${i <= activeIdx ? 'bg-blue-600' : 'bg-slate-200'}`}>
              {i < activeIdx ? <CheckCircle2 size={12} /> : i === activeIdx ? <Circle size={12} fill="white" /> : <div className="w-2 h-2 rounded-full bg-white/60" />}
            </div>
            <span className="text-[9px] text-slate-400 whitespace-nowrap">{s}</span>
          </div>
          {i < stages.length - 1 && (
            <div className={`h-0.5 w-12 mb-4 transition-all ${i < activeIdx ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ContractDetailModal({ contract, onClose }) {
  if (!contract) return null;
  const progress = statusToProgress(contract.status);
  return (
    <Modal open={!!contract} onClose={onClose} title={`Contract #${contract.contractId}`} wide>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Title', contract.title || contract.name || '—'],
            ['Vendor ID', contract.vendorId || '—'],
            ['Project ID', contract.projectId || '—'],
            ['Contract Type', contract.contractType || contract.type || '—'],
            ['Contract Value', contract.value || contract.contractValue ? `$${(contract.value || contract.contractValue).toLocaleString()}` : '—'],
            ['Start Date', contract.startDate || '—'],
            ['End Date', contract.endDate || '—'],
            ['Status', contract.status || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-slate-400 mb-0.5">{k}</p>
              <p className="text-sm font-semibold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2">Progress</p>
          <ProgressBar value={progress} showLabel />
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2">Timeline</p>
          <ContractTimeline status={contract.status} />
        </div>
        {contract.description && (
          <div className="glass p-4 rounded-xl">
            <p className="text-xs text-slate-500 leading-relaxed">{contract.description}</p>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary text-xs" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

const EMPTY_FORM = { title: '', vendorId: '', projectId: '', contractType: 'FIXED_PRICE', value: '', startDate: '', endDate: '', description: '' };

export default function ContractManagement() {
  const { user } = useAuth();
  const [contracts, setContracts]   = useState([]);
  const [vendors, setVendors]       = useState([]);
  const [projects, setProjects]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const canCreate = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, v, p] = await Promise.allSettled([getAllContracts(), getAllVendors(), getAllProjects()]);
      setContracts(c.status === 'fulfilled' ? (c.value.data?.data || []) : []);
      setVendors(v.status === 'fulfilled' ? (v.value.data?.data || []) : []);
      setProjects(p.status === 'fulfilled' ? (p.value.data?.data || []) : []);
    } catch { toast.error('Failed to load contracts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.vendorId) { toast.error('Title and Vendor are required'); return; }
    setSaving(true);
    try {
      await createContract({
        title: form.title,
        vendorId: Number(form.vendorId),
        projectId: form.projectId ? Number(form.projectId) : undefined,
        contractType: form.contractType,
        value: form.value ? Number(form.value) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        description: form.description || undefined,
        status: 'DRAFT',
      });
      toast.success('Contract created successfully');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create contract');
    } finally { setSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Summary counts
  const statusCounts = { ACTIVE: 0, DRAFT: 0, ON_HOLD: 0, COMPLETED: 0 };
  contracts.forEach(c => { if (statusCounts[c.status] !== undefined) statusCounts[c.status]++; });

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading contracts…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Contract Management</h2>
          <p className="text-sm text-slate-400">{contracts.length} contracts total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RefreshCw size={13} /> Refresh</button>
          {canCreate && (
            <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create New Contract
            </button>
          )}
        </div>
      </div>

      {/* Summary bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: statusCounts.ACTIVE, color: '#22C55E' },
          { label: 'Draft', count: statusCounts.DRAFT, color: '#F59E0B' },
          { label: 'On Hold', count: statusCounts.ON_HOLD, color: '#94a3b8' },
          { label: 'Completed', count: statusCounts.COMPLETED, color: '#2563EB' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Contract Cards */}
      {contracts.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400 text-sm">No contracts found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contracts.map(c => {
            const progress = statusToProgress(c.status);
            const vendor = vendors.find(v => v.vendorId === c.vendorId);
            const project = projects.find(p => p.projectId === c.projectId);
            return (
              <div key={c.contractId} className="glass-card p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => setSelected(c)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono text-blue-600 font-semibold">#{c.contractId}</p>
                    <h3 className="text-sm font-semibold text-slate-800 mt-0.5">{c.title || c.name || 'Untitled Contract'}</h3>
                  </div>
                  <Badge status={c.status} />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Vendor</span>
                    <span className="text-slate-700 font-medium">{vendor?.name || `#${c.vendorId}` || '—'}</span>
                  </div>
                  {c.value || c.contractValue ? (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Value</span>
                      <span className="text-slate-700 font-semibold">${(c.value || c.contractValue).toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Type</span>
                    <span className="text-slate-500">{c.contractType || c.type || '—'}</span>
                  </div>
                  {project && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Project</span>
                      <span className="text-slate-500 truncate max-w-[120px]">{project.name || `#${c.projectId}`}</span>
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-600 font-semibold">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={10} />
                    <span>{c.startDate || '—'} → {c.endDate || '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ContractDetailModal contract={selected} onClose={() => setSelected(null)} />

      {/* Create Contract Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Contract">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Title *</label>
            <input value={form.title} onChange={set('title')} placeholder="Contract title"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Vendor *</label>
            <select value={form.vendorId} onChange={set('vendorId')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
              <option value="">Select vendor…</option>
              {vendors.filter(v => v.status === 'ACTIVE').map(v => (
                <option key={v.vendorId} value={v.vendorId}>{v.name} (#{v.vendorId})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Project</label>
            <select value={form.projectId} onChange={set('projectId')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
              <option value="">Select project…</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.name || `Project #${p.projectId}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract Type</label>
            <select value={form.contractType} onChange={set('contractType')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
              {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract Value ($)</label>
            <input type="number" value={form.value} onChange={set('value')} placeholder="0.00"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={set('startDate')}
                className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={set('endDate')}
                className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Optional description…"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : 'Create Contract'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
