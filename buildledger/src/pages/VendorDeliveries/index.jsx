import { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, Loader2, RefreshCw, Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllVendors } from '../../api/vendors';
import { getContractsByVendor } from '../../api/contracts';
import { getAllDeliveries, createDelivery } from '../../api/deliveries';
import Modal from '../../components/ui/Modal';
import { Button, FormInput, FormSelect, FormTextarea, PageHeader } from '../../components/ui';
import toast from 'react-hot-toast';

const STATUS_META = {
  PENDING:          { color: '#F59E0B', label: 'Pending',          Icon: Clock        },
  MARKED_DELIVERED: { color: '#2563EB', label: 'Marked Delivered', Icon: Truck        },
  DELAYED:          { color: '#F97316', label: 'Delayed',          Icon: Calendar     },
  ACCEPTED:         { color: '#22C55E', label: 'Accepted',         Icon: CheckCircle2 },
  REJECTED:         { color: '#EF4444', label: 'Rejected',         Icon: XCircle      },
};

const EMPTY_FORM = { contractId: '', item: '', quantity: '', unit: '', date: '', remarks: '' };

export default function VendorDeliveries() {
  const { user } = useAuth();
  const [vendor,     setVendor]     = useState(null);
  const [contracts,  setContracts]  = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vendorRes = await getAllVendors();
      const mine = (vendorRes.data?.data || []).find(v => v.userId === user.userId || v.username === user.username);
      if (!mine) { setLoading(false); return; }
      setVendor(mine);
      const [contractRes, deliveryRes] = await Promise.allSettled([
        getContractsByVendor(mine.vendorId),
        getAllDeliveries(),
      ]);
      const myContracts   = contractRes.status  === 'fulfilled' ? (contractRes.value.data?.data  || []) : [];
      const allDeliveries = deliveryRes.status  === 'fulfilled' ? (deliveryRes.value.data?.data  || []) : [];
      const contractIds   = new Set(myContracts.map(c => c.contractId));
      setContracts(myContracts.filter(c => c.status === 'ACTIVE'));
      setDeliveries(allDeliveries.filter(d => contractIds.has(d.contractId)));
    } catch { toast.error('Failed to load deliveries'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setErrors({}); };

  const handleSubmit = async () => {
    const e = {};
    if (!form.contractId)  e.contractId = 'Please select a contract';
    if (!form.item.trim()) e.item       = 'Item name is required';
    if (!form.quantity)    e.quantity   = 'Quantity is required';
    if (!form.date)        e.date       = 'Delivery date is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createDelivery({
        contractId: Number(form.contractId),
        item:       form.item.trim(),
        quantity:   Number(form.quantity),
        unit:       form.unit || undefined,
        date:       form.date,
        remarks:    form.remarks || undefined,
      });
      toast.success('Delivery submitted — now visible to Admin & Project Manager');
      closeModal();
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit delivery'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading deliveries…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="My Deliveries"
        subtitle={`${deliveries.length} total`}
        actions={
          <>
            <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={load}>Refresh</Button>
            {contracts.length > 0 && (
              <Button variant="primary" size="xs" icon={<Plus size={13} />} onClick={() => setShowModal(true)}>
                Submit Delivery
              </Button>
            )}
          </>
        }
      />

      {/* Status stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_META).map(([s, cfg]) => {
          const { Icon } = cfg;
          return (
            <div key={s} className="glass-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cfg.color}18` }}>
                <Icon size={15} style={{ color: cfg.color }} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {deliveries.filter(d => d.status === s).length}
                </p>
                <p className="text-[10px] text-slate-400">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deliveries list */}
      {deliveries.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16 text-slate-400">
          <Truck size={32} className="opacity-20" />
          <p className="text-sm font-medium">No deliveries yet</p>
          {contracts.length > 0
            ? <p className="text-xs">Click <strong className="text-blue-500">Submit Delivery</strong> to add your first delivery.</p>
            : <p className="text-xs">Accept a contract first before submitting a delivery.</p>
          }
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map(d => {
            const meta = STATUS_META[d.status] || STATUS_META.PENDING;
            return (
              <div key={d.deliveryId} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{d.deliveryId}</p>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ background: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.item || '—'}</p>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <p className="text-[10px] text-slate-400">Contract #{d.contractId}</p>
                      {d.quantity && <p className="text-[10px] text-slate-400">Qty: {d.quantity}{d.unit ? ` ${d.unit}` : ''}</p>}
                      {d.date     && <p className="text-[10px] text-slate-400">Date: {d.date}</p>}
                    </div>
                    {d.remarks && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{d.remarks}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create delivery modal */}
      <Modal open={showModal} onClose={closeModal} title="Submit Delivery">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-700/40">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Your delivery will be immediately visible to the <strong>Admin and Project Manager</strong> for review.
            </p>
          </div>
          <FormSelect
            label="Contract"
            required
            hint="Only your active contracts are listed"
            value={form.contractId}
            onChange={e => { setForm(p => ({ ...p, contractId: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, contractId: '' })); }}
            error={errors.contractId}
          >
            <option value="">Select contract…</option>
            {contracts.map(c => (
              <option key={c.contractId} value={c.contractId}>
                {c.title || c.projectName || 'Contract'} (#{c.contractId}{c.endDate ? ` · ends ${c.endDate}` : ''})
              </option>
            ))}
          </FormSelect>
          <FormInput
            label="Item / Description"
            required
            value={form.item}
            onChange={e => { setForm(p => ({ ...p, item: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, item: '' })); }}
            placeholder="What is being delivered?"
            error={errors.item}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Quantity"
              required
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => { setForm(p => ({ ...p, quantity: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, quantity: '' })); }}
              placeholder="e.g. 10"
              error={errors.quantity}
            />
            <FormInput
              label="Unit"
              value={form.unit}
              onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              placeholder="e.g. bags, pcs"
            />
          </div>
          <FormInput
            label="Delivery Date"
            required
            type="date"
            min={today}
            value={form.date}
            onChange={e => { setForm(p => ({ ...p, date: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, date: '' })); }}
            error={errors.date}
          />
          <FormTextarea
            label="Remarks"
            value={form.remarks}
            onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
            rows={2}
            placeholder="Optional remarks…"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="xs" onClick={handleSubmit} loading={saving}>Submit Delivery</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
