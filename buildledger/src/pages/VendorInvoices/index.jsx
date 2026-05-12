import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllVendors } from '../../api/vendors';
import { getContractsByVendor } from '../../api/contracts';
import { getAllDeliveries } from '../../api/deliveries';
import { getAllInvoices, createInvoice } from '../../api/invoices';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Button, FormInput, FormSelect, FormTextarea, PageHeader } from '../../components/ui';
import toast from 'react-hot-toast';

const EMPTY_FORM = { contractId: '', amount: '', date: '', dueDate: '', description: '' };

export default function VendorInvoices() {
  const { user } = useAuth();
  const [vendor,    setVendor]    = useState(null);
  const [contracts, setContracts] = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vendorRes = await getAllVendors();
      const mine = (vendorRes.data?.data || []).find(v => v.userId === user.userId || v.username === user.username);
      if (!mine) { setLoading(false); return; }
      setVendor(mine);
      const [contractRes, deliveryRes, invoiceRes] = await Promise.allSettled([
        getContractsByVendor(mine.vendorId),
        getAllDeliveries(),
        getAllInvoices(),
      ]);
      const myContracts   = contractRes.status === 'fulfilled' ? (contractRes.value.data?.data  || []) : [];
      const allDeliveries = deliveryRes.status === 'fulfilled' ? (deliveryRes.value.data?.data  || []) : [];
      const allInvoices   = invoiceRes.status  === 'fulfilled' ? (invoiceRes.value.data?.data   || []) : [];
      const contractIds   = new Set(myContracts.map(c => c.contractId));

      const eligibleIds = new Set(
        allDeliveries
          .filter(d => contractIds.has(d.contractId) && ['ACCEPTED', 'MARKED_DELIVERED'].includes(d.status))
          .map(d => d.contractId)
      );

      setContracts(myContracts.filter(c => c.status === 'ACTIVE' && eligibleIds.has(c.contractId)));
      setInvoices(allInvoices.filter(i => contractIds.has(i.contractId)));
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setErrors({}); };

  const handleSubmit = async () => {
    const e = {};
    if (!form.contractId) e.contractId = 'Please select a contract';
    if (!form.amount)     e.amount     = 'Amount is required';
    if (!form.date)       e.date       = 'Invoice date is required';
    if (!form.dueDate)    e.dueDate    = 'Due date is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createInvoice({
        contractId:  Number(form.contractId),
        amount:      Number(form.amount),
        date:        form.date,
        dueDate:     form.dueDate,
        description: form.description || undefined,
      });
      toast.success('Invoice submitted for review');
      closeModal();
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit invoice'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading invoices…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="My Invoices"
        subtitle={`${invoices.length} total`}
        actions={
          <>
            <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={load}>Refresh</Button>
            {contracts.length > 0 && (
              <Button variant="primary" size="xs" icon={<Plus size={13} />} onClick={() => setShowModal(true)}>
                Submit Invoice
              </Button>
            )}
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending',      value: invoices.filter(i => i.status === 'PENDING').length,      color: '#F59E0B' },
          { label: 'Under Review', value: invoices.filter(i => i.status === 'UNDER_REVIEW').length, color: '#3b82f6' },
          { label: 'Approved',     value: invoices.filter(i => i.status === 'APPROVED').length,     color: '#14B8A6' },
          { label: 'Paid',         value: invoices.filter(i => i.status === 'PAID').length,         color: '#22C55E' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Invoices list */}
      {invoices.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16 text-slate-400">
          <CreditCard size={32} className="opacity-20" />
          <p className="text-sm font-medium">No invoices yet</p>
          {contracts.length > 0
            ? <p className="text-xs">Click <strong className="text-blue-500">Submit Invoice</strong> to add your first invoice.</p>
            : <p className="text-xs">You can submit an invoice once a delivery has been accepted by the project manager.</p>
          }
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.invoiceId} className="glass-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{inv.invoiceId}</p>
                  </div>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                    ${(inv.amount || 0).toLocaleString()}
                  </p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    <p className="text-[10px] text-slate-400">Contract #{inv.contractId}</p>
                    {inv.date    && <p className="text-[10px] text-slate-400">Date: {inv.date}</p>}
                    {inv.dueDate && <p className="text-[10px] text-slate-400">Due: {inv.dueDate}</p>}
                  </div>
                  {inv.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{inv.description}</p>
                  )}
                </div>
                <Badge status={inv.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Invoice modal */}
      <Modal open={showModal} onClose={closeModal} title="Submit Invoice">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-700/40">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Invoice will be reviewed by the <strong>Finance Officer</strong> before payment is processed.
            </p>
          </div>
          <FormSelect
            label="Contract"
            required
            hint="Only contracts with accepted deliveries are listed"
            value={form.contractId}
            onChange={e => { setForm(p => ({ ...p, contractId: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, contractId: '' })); }}
            error={errors.contractId}
          >
            <option value="">Select contract…</option>
            {contracts.map(c => (
              <option key={c.contractId} value={c.contractId}>
                {c.title || c.projectName || 'Contract'} (#{c.contractId})
              </option>
            ))}
          </FormSelect>
          <FormInput
            label="Amount ($)"
            required
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={e => { setForm(p => ({ ...p, amount: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, amount: '' })); }}
            placeholder="0.00"
            error={errors.amount}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Invoice Date"
              required
              type="date"
              max={today}
              value={form.date}
              onChange={e => { setForm(p => ({ ...p, date: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, date: '' })); }}
              error={errors.date}
            />
            <FormInput
              label="Due Date"
              required
              type="date"
              min={tomorrow}
              value={form.dueDate}
              onChange={e => { setForm(p => ({ ...p, dueDate: e.target.value })); if (e.target.value) setErrors(p => ({ ...p, dueDate: '' })); }}
              error={errors.dueDate}
            />
          </div>
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Optional description…"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="xs" onClick={handleSubmit} loading={saving}>Submit Invoice</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
