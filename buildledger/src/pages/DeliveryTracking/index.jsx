import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Truck, Package, RotateCcw, Calendar, Loader2, Plus } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import { getAllDeliveries, createDelivery, updateDeliveryStatus } from '../../api/deliveries';
import { getAllContracts } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// NOTE: delivery.progress (0–100%) is not a field in the backend response.
//   Progress is derived from status. Future endpoint needed:
//   GET /deliveries/{id}/progress → { progress: number }

const STATUS_MAP = {
  PENDING:          { icon: Clock,       color: '#F59E0B', label: 'Pending' },
  MARKED_DELIVERED: { icon: Truck,       color: '#2563EB', label: 'Marked Delivered' },
  DELAYED:          { icon: Calendar,    color: '#F97316', label: 'Delayed' },
  ACCEPTED:         { icon: CheckCircle2,color: '#22C55E', label: 'Accepted' },
  REJECTED:         { icon: Package,     color: '#EF4444', label: 'Rejected' },
};

const ALLOWED_TRANSITIONS = {
  PENDING: ['MARKED_DELIVERED', 'DELAYED'],
  MARKED_DELIVERED: ['ACCEPTED', 'REJECTED'],
  DELAYED: ['MARKED_DELIVERED'],
  ACCEPTED: [],
  REJECTED: [],
};

const STATUS_ROLE_RULES = {
  MARKED_DELIVERED: ['VENDOR', 'ADMIN'],
  DELAYED: ['VENDOR', 'ADMIN'],
  ACCEPTED: ['PROJECT_MANAGER', 'ADMIN'],
  REJECTED: ['PROJECT_MANAGER', 'ADMIN'],
};

function statusProgress(status) {
  return { PENDING: 20, DELAYED: 35, MARKED_DELIVERED: 70, ACCEPTED: 100, REJECTED: 100 }[status] ?? 10;
}

const STEPS = ['PENDING', 'MARKED_DELIVERED', 'ACCEPTED'];

const canTransitionTo = (currentStatus, nextStatus, role) => {
  const next = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!next.includes(nextStatus)) return false;
  return (STATUS_ROLE_RULES[nextStatus] || []).includes(role);
};

const transitionLabel = (status) => STATUS_MAP[status]?.label || status.replace(/_/g, ' ');

function Stepper({ status }) {
  const idx = STEPS.indexOf(status);
  const color = STATUS_MAP[status]?.color || '#94a3b8';
  return (
    <div className="flex items-center gap-1 mt-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all
            ${i <= idx ? 'text-white' : 'bg-slate-100 text-slate-400'}`}
            style={i <= idx ? { background: color } : {}}>
            {i < idx ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 ${i < idx ? '' : 'bg-slate-200'}`}
              style={i < idx ? { background: color } : {}} />
          )}
        </div>
      ))}
    </div>
  );
}

const EMPTY_FORM = { contractId: '', item: '', quantity: '', scheduledDate: '', notes: '' };

export default function DeliveryTracking() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [contracts, setContracts]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [updating, setUpdating]     = useState({});

  const canCreate = ['ADMIN', 'VENDOR'].includes(user?.role);
  const statuses  = ['All', ...Object.keys(STATUS_MAP)];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.allSettled([getAllDeliveries(), getAllContracts()]);
      setDeliveries(d.status === 'fulfilled' ? (d.value.data?.data || []) : []);
      setContracts(c.status === 'fulfilled' ? (c.value.data?.data || []) : []);
    } catch { toast.error('Failed to load deliveries'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filter === 'All' ? deliveries : deliveries.filter(d => d.status === filter);

  const handleCreate = async () => {
    if (!form.contractId || !form.item) { toast.error('Contract and item are required'); return; }
    setSaving(true);
    try {
      await createDelivery({
        contractId: Number(form.contractId),
        item: form.item,
        quantity: form.quantity || undefined,
        scheduledDate: form.scheduledDate || undefined,
        notes: form.notes || undefined,
        status: 'PENDING',
      });
      toast.success('Delivery created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create delivery');
    } finally { setSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleStatusTransition = async (deliveryId, fromStatus, nextStatus) => {
    if (!canTransitionTo(fromStatus, nextStatus, user?.role)) {
      toast.error('Status transition is not allowed for your role');
      return;
    }
    setUpdating((prev) => ({ ...prev, [deliveryId]: true }));
    try {
      await updateDeliveryStatus(deliveryId, nextStatus);
      toast.success(`Delivery moved to ${transitionLabel(nextStatus)}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setUpdating((prev) => ({ ...prev, [deliveryId]: false }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading deliveries…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Delivery Tracking</h2>
          <p className="text-sm text-slate-400">{deliveries.length} total deliveries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RotateCcw size={13} /> Refresh</button>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs"><Plus size={13} /> New Delivery</button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['PENDING', 'MARKED_DELIVERED', 'DELAYED', 'ACCEPTED', 'REJECTED'].map(s => {
          const cfg = STATUS_MAP[s];
          const Icon = cfg.icon;
          const count = deliveries.filter(d => d.status === s).length;
          return (
            <div key={s} className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                <Icon size={18} style={{ color: cfg.color }} />
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
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${filter === s ? 'bg-blue-600 text-white shadow-sm' : 'glass text-slate-500 hover:bg-white'}`}>
            {STATUS_MAP[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Timeline table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60 border-b border-slate-100">
              <tr>
                {['ID', 'Item', 'Contract', 'Quantity', 'Scheduled Date', 'Status', 'Progress', 'Steps', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">No deliveries found</td></tr>
              ) : filtered.map(d => {
                const cfg = STATUS_MAP[d.status] || STATUS_MAP.PENDING;
                const Icon = cfg.icon;
                const progress = statusProgress(d.status);
                const contract = contracts.find(c => c.contractId === d.contractId);
                const transitions = (ALLOWED_TRANSITIONS[d.status] || []).filter(next => canTransitionTo(d.status, next, user?.role));
                return (
                  <tr key={d.deliveryId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-blue-600 font-semibold">#{d.deliveryId}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-slate-800">{d.item || d.description || '—'}</p>
                      {d.notes && <p className="text-[10px] text-slate-400">{d.notes}</p>}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {contract ? (contract.title || `#${d.contractId}`) : `#${d.contractId || '—'}`}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600 font-medium">{d.quantity || '—'}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{d.scheduledDate || d.expectedDate || '—'}</td>
                    <td className="px-5 py-4"><Badge status={d.status} /></td>
                    <td className="px-5 py-4 w-32">
                      <ProgressBar value={progress} color={cfg.color} showLabel />
                    </td>
                    <td className="px-5 py-4">
                      <Stepper status={d.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {transitions.length === 0 && (
                          <span className="text-[11px] text-slate-400">No actions</span>
                        )}
                        {transitions.map(next => (
                          <button
                            key={next}
                            onClick={() => handleStatusTransition(d.deliveryId, d.status, next)}
                            disabled={updating[d.deliveryId]}
                            className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-60"
                          >
                            {updating[d.deliveryId] ? 'Updating…' : transitionLabel(next)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Delivery Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Delivery">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract *</label>
            <select value={form.contractId} onChange={set('contractId')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
              <option value="">Select contract…</option>
              {contracts.map(c => (
                <option key={c.contractId} value={c.contractId}>{c.title || `Contract #${c.contractId}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Item *</label>
            <input value={form.item} onChange={set('item')} placeholder="Item description"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Quantity</label>
            <input value={form.quantity} onChange={set('quantity')} placeholder="e.g. 100 tons"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Scheduled Date</label>
            <input type="date" value={form.scheduledDate} onChange={set('scheduledDate')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional notes…"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : 'Create Delivery'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
