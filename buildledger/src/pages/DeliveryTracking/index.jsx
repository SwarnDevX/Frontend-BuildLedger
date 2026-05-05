import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Truck, Package, RotateCcw, Calendar, Loader2, Plus, Wrench, AlertCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import { getAllDeliveries, createDelivery, updateDeliveryStatus } from '../../api/deliveries';
import { getAllServices, createService, updateServiceStatus } from '../../api/services';
import { getAllContracts } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Delivery config ────────────────────────────────────────────────────────────

const DELIVERY_STATUS_MAP = {
  PENDING:          { icon: Clock,        color: '#F59E0B', label: 'Pending' },
  MARKED_DELIVERED: { icon: Truck,        color: '#2563EB', label: 'Marked Delivered' },
  DELAYED:          { icon: Calendar,     color: '#F97316', label: 'Delayed' },
  ACCEPTED:         { icon: CheckCircle2, color: '#22C55E', label: 'Accepted' },
  REJECTED:         { icon: Package,      color: '#EF4444', label: 'Rejected' },
};

const DELIVERY_TRANSITIONS = {
  PENDING:          ['MARKED_DELIVERED', 'DELAYED'],
  MARKED_DELIVERED: ['ACCEPTED', 'REJECTED'],
  DELAYED:          ['MARKED_DELIVERED'],
  ACCEPTED:         [],
  REJECTED:         [],
};

const DELIVERY_ROLE_RULES = {
  MARKED_DELIVERED: ['VENDOR', 'ADMIN'],
  DELAYED:          ['VENDOR', 'ADMIN'],
  ACCEPTED:         ['PROJECT_MANAGER', 'ADMIN'],
  REJECTED:         ['PROJECT_MANAGER', 'ADMIN'],
};

function deliveryProgress(status) {
  return { PENDING: 20, DELAYED: 35, MARKED_DELIVERED: 70, ACCEPTED: 100, REJECTED: 100 }[status] ?? 10;
}

const DELIVERY_STEPS = ['PENDING', 'MARKED_DELIVERED', 'ACCEPTED'];

// ── Service config ─────────────────────────────────────────────────────────────

const SERVICE_STATUS_MAP = {
  PENDING:     { color: '#F59E0B', label: 'Pending' },
  IN_PROGRESS: { color: '#2563EB', label: 'In Progress' },
  COMPLETED:   { color: '#14B8A6', label: 'Completed' },
  VERIFIED:    { color: '#22C55E', label: 'Verified' },
};

const SERVICE_TRANSITIONS = {
  PENDING:     ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED:   ['VERIFIED'],
  VERIFIED:    [],
};

const SERVICE_ROLE_RULES = {
  IN_PROGRESS: ['VENDOR', 'ADMIN'],
  COMPLETED:   ['VENDOR', 'ADMIN'],
  VERIFIED:    ['PROJECT_MANAGER', 'ADMIN'],
};

function serviceProgress(status) {
  return { PENDING: 10, IN_PROGRESS: 40, COMPLETED: 75, VERIFIED: 100 }[status] ?? 10;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function contractLabel(contracts, contractId) {
  const c = contracts.find(x => x.contractId === contractId);
  if (!c) return `#${contractId}`;
  return `${c.vendorName || 'Unknown'} — ${c.projectName || 'Unknown'} (#${contractId})`;
}

function canDoTransition(transitions, roleRules, currentStatus, nextStatus, role) {
  if (!(transitions[currentStatus] || []).includes(nextStatus)) return false;
  return (roleRules[nextStatus] || []).includes(role);
}

function showErrors(err) {
  const apiErrors = err.response?.data?.data;
  if (apiErrors && typeof apiErrors === 'object') {
    const msgs = Object.entries(apiErrors).map(([f, m]) => `${f}: ${m}`).join(' | ');
    toast.error(msgs);
  } else {
    toast.error(err.response?.data?.message || 'Request failed');
  }
}

function Stepper({ status, steps }) {
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
            ${i <= idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {i < idx ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && <div className={`w-5 h-0.5 ${i < idx ? 'bg-blue-500' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

function ActionButtons({ transitions, roleRules, currentStatus, role, onTransition, loadingKey, itemKey }) {
  const available = (transitions[currentStatus] || []).filter(next =>
    canDoTransition(transitions, roleRules, currentStatus, next, role));
  if (available.length === 0) return <span className="text-[11px] text-slate-400">—</span>;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {available.map(next => {
        const label = Object.assign({}, DELIVERY_STATUS_MAP, SERVICE_STATUS_MAP)[next]?.label || next;
        const color = Object.assign({}, DELIVERY_STATUS_MAP, SERVICE_STATUS_MAP)[next]?.color || '#64748b';
        return (
          <button key={next} onClick={() => onTransition(itemKey, next)} disabled={loadingKey}
            className="text-[11px] px-2.5 py-1 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: color }}>
            {loadingKey ? <Loader2 size={10} className="animate-spin inline" /> : label}
          </button>
        );
      })}
    </div>
  );
}

// ── Empty forms ────────────────────────────────────────────────────────────────

const EMPTY_DELIVERY = { contractId: '', item: '', quantity: '', unit: '', date: '', remarks: '' };
const EMPTY_SERVICE  = { contractId: '', description: '', completionDate: '', remarks: '' };

// ── Main component ─────────────────────────────────────────────────────────────

export default function DeliveryTracking() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('deliveries');
  const [deliveries, setDeliveries] = useState([]);
  const [services, setServices]     = useState([]);
  const [contracts, setContracts]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [svcFilter, setSvcFilter]   = useState('All');
  const [showCreateD, setShowCreateD] = useState(false);
  const [showCreateS, setShowCreateS] = useState(false);
  const [formD, setFormD]           = useState(EMPTY_DELIVERY);
  const [formS, setFormS]           = useState(EMPTY_SERVICE);
  const [saving, setSaving]         = useState(false);
  const [updating, setUpdating]     = useState({});
  const [dErrors, setDErrors] = useState({});
  const [sErrors, setSErrors] = useState({});

  const canCreate = ['ADMIN', 'VENDOR'].includes(user?.role);
  const today     = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, s, c] = await Promise.allSettled([getAllDeliveries(), getAllServices(), getAllContracts()]);
      setDeliveries(d.status === 'fulfilled' ? (d.value.data?.data || []) : []);
      setServices(s.status === 'fulfilled'   ? (s.value.data?.data || []) : []);
      setContracts(c.status === 'fulfilled'  ? (c.value.data?.data || []) : []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Delivery handlers ──────────────────────────────────────────────────────

  const handleCreateDelivery = async () => {
    const e = {};
    if (!formD.contractId)    e.contractId = 'Please select a contract';
    if (!formD.item.trim())   e.item       = 'Item is required';
    if (!formD.quantity)      e.quantity   = 'Quantity is required';
    if (!formD.date)          e.date       = 'Delivery date is required';
    setDErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createDelivery({
        contractId: Number(formD.contractId),
        item:       formD.item,
        quantity:   Number(formD.quantity),
        unit:       formD.unit || undefined,
        date:       formD.date,
        remarks:    formD.remarks || undefined,
      });
      toast.success('Delivery created');
      setShowCreateD(false);
      setFormD(EMPTY_DELIVERY);
      setDErrors({});
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleDeliveryTransition = async (deliveryId, nextStatus) => {
    setUpdating(p => ({ ...p, [`d-${deliveryId}`]: true }));
    try {
      await updateDeliveryStatus(deliveryId, nextStatus);
      toast.success(`Delivery → ${DELIVERY_STATUS_MAP[nextStatus]?.label || nextStatus}`);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setUpdating(p => ({ ...p, [`d-${deliveryId}`]: false })); }
  };

  // ── Service handlers ───────────────────────────────────────────────────────

  const handleCreateService = async () => {
    const e = {};
    if (!formS.contractId)                         e.contractId    = 'Please select a contract';
    if (!formS.description || formS.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!formS.completionDate)                     e.completionDate = 'Completion date is required';
    setSErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createService({
        contractId:     Number(formS.contractId),
        description:    formS.description,
        completionDate: formS.completionDate,
        remarks:        formS.remarks || undefined,
      });
      toast.success('Service created');
      setShowCreateS(false);
      setFormS(EMPTY_SERVICE);
      setSErrors({});
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleServiceTransition = async (serviceId, nextStatus) => {
    setUpdating(p => ({ ...p, [`s-${serviceId}`]: true }));
    try {
      await updateServiceStatus(serviceId, nextStatus);
      toast.success(`Service → ${SERVICE_STATUS_MAP[nextStatus]?.label || nextStatus}`);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setUpdating(p => ({ ...p, [`s-${serviceId}`]: false })); }
  };

  const setD = k => e => setFormD(p => ({ ...p, [k]: e.target.value }));
  const setS = k => e => setFormS(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading…</span>
    </div>
  );

  const filteredDeliveries = filter === 'All' ? deliveries : deliveries.filter(d => d.status === filter);
  const filteredServices   = svcFilter === 'All' ? services : services.filter(s => s.status === svcFilter);

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Delivery & Service Tracking</h2>
          <p className="text-sm text-slate-400">{deliveries.length} deliveries · {services.length} services</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RotateCcw size={13} /> Refresh</button>
          {canCreate && tab === 'deliveries' && (
            <button onClick={() => setShowCreateD(true)} className="btn-primary text-xs"><Plus size={13} /> New Delivery</button>
          )}
          {canCreate && tab === 'services' && (
            <button onClick={() => setShowCreateS(true)} className="btn-primary text-xs"><Plus size={13} /> New Service</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: 'deliveries', label: 'Deliveries', icon: Truck },
          { key: 'services',   label: 'Services',   icon: Wrench },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all
                ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── DELIVERIES TAB ── */}
      {tab === 'deliveries' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(DELIVERY_STATUS_MAP).map(([s, cfg]) => {
              const Icon = cfg.icon;
              const count = deliveries.filter(d => d.status === s).length;
              return (
                <div key={s} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800">{count}</p>
                    <p className="text-[10px] text-slate-400">{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['All', ...Object.keys(DELIVERY_STATUS_MAP)].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                  ${filter === s ? 'bg-blue-600 text-white shadow-sm' : 'glass text-slate-500 hover:bg-white'}`}>
                {DELIVERY_STATUS_MAP[s]?.label || s}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/60 border-b border-slate-100">
                  <tr>
                    {['ID', 'Item', 'Contract', 'Qty / Unit', 'Delivery Date', 'Status', 'Progress', 'Steps', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.length === 0 ? (
                    <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">No deliveries found</td></tr>
                  ) : filteredDeliveries.map(d => {
                    const cfg      = DELIVERY_STATUS_MAP[d.status] || DELIVERY_STATUS_MAP.PENDING;
                    const progress = deliveryProgress(d.status);
                    return (
                      <tr key={d.deliveryId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-blue-600 font-semibold">#{d.deliveryId}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-slate-800">{d.item || '—'}</p>
                          {d.remarks && <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{d.remarks}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px]">
                          <span className="truncate block">{contractLabel(contracts, d.contractId)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium whitespace-nowrap">
                          {d.quantity ? `${d.quantity}${d.unit ? ` ${d.unit}` : ''}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{d.date || '—'}</td>
                        <td className="px-4 py-3"><Badge status={d.status} /></td>
                        <td className="px-4 py-3 w-28">
                          <ProgressBar value={progress} color={cfg.color} showLabel />
                        </td>
                        <td className="px-4 py-3">
                          <Stepper status={d.status} steps={DELIVERY_STEPS} />
                        </td>
                        <td className="px-4 py-3">
                          <ActionButtons
                            transitions={DELIVERY_TRANSITIONS}
                            roleRules={DELIVERY_ROLE_RULES}
                            currentStatus={d.status}
                            role={user?.role}
                            onTransition={(_, next) => handleDeliveryTransition(d.deliveryId, next)}
                            loadingKey={updating[`d-${d.deliveryId}`]}
                            itemKey={d.deliveryId}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SERVICES TAB ── */}
      {tab === 'services' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(SERVICE_STATUS_MAP).map(([s, cfg]) => {
              const count = services.filter(x => x.status === s).length;
              return (
                <div key={s} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                    <Wrench size={16} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800">{count}</p>
                    <p className="text-[10px] text-slate-400">{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['All', ...Object.keys(SERVICE_STATUS_MAP)].map(s => (
              <button key={s} onClick={() => setSvcFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                  ${svcFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'glass text-slate-500 hover:bg-white'}`}>
                {SERVICE_STATUS_MAP[s]?.label || s}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/60 border-b border-slate-100">
                  <tr>
                    {['ID', 'Description', 'Contract', 'Completion Date', 'Status', 'Progress', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No services found</td></tr>
                  ) : filteredServices.map(s => {
                    const progress = serviceProgress(s.status);
                    const cfg      = SERVICE_STATUS_MAP[s.status] || SERVICE_STATUS_MAP.PENDING;
                    return (
                      <tr key={s.serviceId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-blue-600 font-semibold">#{s.serviceId}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-700 max-w-[200px] truncate">{s.description || '—'}</p>
                          {s.remarks && <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{s.remarks}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px]">
                          <span className="truncate block">{contractLabel(contracts, s.contractId)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{s.completionDate || '—'}</td>
                        <td className="px-4 py-3"><Badge status={s.status} /></td>
                        <td className="px-4 py-3 w-28">
                          <ProgressBar value={progress} color={cfg.color} showLabel />
                        </td>
                        <td className="px-4 py-3">
                          <ActionButtons
                            transitions={SERVICE_TRANSITIONS}
                            roleRules={SERVICE_ROLE_RULES}
                            currentStatus={s.status}
                            role={user?.role}
                            onTransition={(_, next) => handleServiceTransition(s.serviceId, next)}
                            loadingKey={updating[`s-${s.serviceId}`]}
                            itemKey={s.serviceId}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Create Delivery Modal ── */}
      <Modal open={showCreateD} onClose={() => { setShowCreateD(false); setFormD(EMPTY_DELIVERY); setDErrors({}); }} title="Create Delivery">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract *</label>
            <select value={formD.contractId} onChange={e => { setD('contractId')(e); if (e.target.value) setDErrors(p => ({ ...p, contractId: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${dErrors.contractId ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <option value="">Select contract…</option>
              {contracts.filter(c => c.status === 'ACTIVE').map(c => (
                <option key={c.contractId} value={c.contractId}>
                  {c.vendorName || 'Unknown'} — {c.projectName || 'Unknown'} (#{c.contractId})
                </option>
              ))}
            </select>
            {dErrors.contractId
              ? <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{dErrors.contractId}</p>
              : contracts.filter(c => c.status === 'ACTIVE').length === 0 && <p className="text-xs text-amber-500 mt-1">No active contracts. Activate a contract first.</p>
            }
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Item *</label>
            <input value={formD.item} onChange={e => { setD('item')(e); if (e.target.value.trim()) setDErrors(p => ({ ...p, item: '' })); }} placeholder="Item description (min 2 chars)"
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${dErrors.item ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
            {dErrors.item && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{dErrors.item}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Quantity *</label>
              <input type="number" min="0.01" step="0.01" value={formD.quantity} onChange={e => { setD('quantity')(e); if (e.target.value) setDErrors(p => ({ ...p, quantity: '' })); }} placeholder="0.00"
                className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${dErrors.quantity ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
              {dErrors.quantity && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{dErrors.quantity}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Unit</label>
              <input value={formD.unit} onChange={setD('unit')} placeholder="tons, kg, pcs…"
                className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Delivery Date * <span className="text-slate-400 font-normal">(today or earlier)</span>
            </label>
            <input type="date" max={today} value={formD.date} onChange={e => { setD('date')(e); if (e.target.value) setDErrors(p => ({ ...p, date: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${dErrors.date ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
            {dErrors.date && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{dErrors.date}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
            <textarea value={formD.remarks} onChange={setD('remarks')} rows={2} placeholder="Optional remarks…"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none transition-all" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowCreateD(false); setFormD(EMPTY_DELIVERY); setDErrors({}); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreateDelivery} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : 'Create Delivery'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Create Service Modal ── */}
      <Modal open={showCreateS} onClose={() => { setShowCreateS(false); setFormS(EMPTY_SERVICE); setSErrors({}); }} title="Create Service">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract *</label>
            <select value={formS.contractId} onChange={e => { setS('contractId')(e); if (e.target.value) setSErrors(p => ({ ...p, contractId: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${sErrors.contractId ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <option value="">Select contract…</option>
              {contracts.filter(c => c.status === 'ACTIVE').map(c => (
                <option key={c.contractId} value={c.contractId}>
                  {c.vendorName || 'Unknown'} — {c.projectName || 'Unknown'} (#{c.contractId})
                </option>
              ))}
            </select>
            {sErrors.contractId && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{sErrors.contractId}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description * <span className="text-slate-400 font-normal">(min 10 chars)</span></label>
            <textarea value={formS.description} onChange={e => { setS('description')(e); if (e.target.value.trim().length >= 10) setSErrors(p => ({ ...p, description: '' })); }} rows={3} placeholder="Describe the service to be provided…"
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none transition-all ${sErrors.description ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
            {sErrors.description && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{sErrors.description}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Expected Completion Date * <span className="text-slate-400 font-normal">(today or later)</span>
            </label>
            <input type="date" min={today} value={formS.completionDate} onChange={e => { setS('completionDate')(e); if (e.target.value) setSErrors(p => ({ ...p, completionDate: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${sErrors.completionDate ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
            {sErrors.completionDate && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{sErrors.completionDate}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
            <textarea value={formS.remarks} onChange={setS('remarks')} rows={2} placeholder="Optional remarks…"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none transition-all" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowCreateS(false); setFormS(EMPTY_SERVICE); setSErrors({}); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreateService} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : 'Create Service'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
