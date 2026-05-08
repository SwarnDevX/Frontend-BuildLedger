import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Clock, User, Truck, CreditCard,
  Plus, Loader2, RefreshCw, CheckCheck, XCircle, Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllVendors, getVendorDocuments } from '../../api/vendors';
import { getContractsByVendor, vendorContractResponse } from '../../api/contracts';
import { getAllDeliveries, createDelivery } from '../../api/deliveries';
import { getAllInvoices, createInvoice } from '../../api/invoices';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Button, FormInput, FormSelect, FormTextarea } from '../../components/ui';
import toast from 'react-hot-toast';

const toArray = (v) => Array.isArray(v) ? v : Array.isArray(v?.documents) ? v.documents : Array.isArray(v?.items) ? v.items : [];

const normalizeDocument = (doc = {}) => ({
  ...doc,
  documentType: doc.documentType || doc.docType || 'OTHER',
  status: doc.status || doc.verificationStatus || 'PENDING',
  uploadedAt: doc.uploadedAt || doc.uploadedDate || doc.createdAt,
});

const CONTRACT_STATUS_COLOR = {
  DRAFT:      'text-slate-600 bg-slate-100 dark:bg-slate-700/40 dark:text-slate-300',
  PENDING:    'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  ACTIVE:     'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  REJECTED:   'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  COMPLETED:  'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  TERMINATED: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  EXPIRED:    'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
};

const EMPTY_INVOICE   = { contractId: '', amount: '', date: '', dueDate: '', description: '' };
const EMPTY_DELIVERY  = { contractId: '', description: '', scheduledDate: '' };

export default function VendorDashboard() {
  const { user } = useAuth();

  const [vendor,    setVendor]    = useState(null);
  const [docs,      setDocs]      = useState([]);
  const [contracts, setContracts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Contract reject modal
  const [rejectContractId, setRejectContractId] = useState(null);
  const [rejectRemarks,    setRejectRemarks]    = useState('');
  const [savingContract,   setSavingContract]   = useState(false);

  // Delivery modal
  const [showDeliveryModal,  setShowDeliveryModal]  = useState(false);
  const [deliveryForm,       setDeliveryForm]       = useState(EMPTY_DELIVERY);
  const [deliveryErrors,     setDeliveryErrors]     = useState({});
  const [savingDelivery,     setSavingDelivery]     = useState(false);

  // Invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm,      setInvoiceForm]      = useState(EMPTY_INVOICE);
  const [invoiceErrors,    setInvoiceErrors]    = useState({});
  const [savingInvoice,    setSavingInvoice]    = useState(false);

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vendorRes = await getAllVendors();
      const allVendors = vendorRes.data?.data || [];
      const mine = allVendors.find(v => v.userId === user.userId || v.username === user.username);
      if (!mine) { setLoading(false); return; }
      setVendor(mine);

      const [docRes, contractRes, deliveryRes, invoiceRes] = await Promise.allSettled([
        getVendorDocuments(mine.vendorId),
        getContractsByVendor(mine.vendorId),
        getAllDeliveries(),
        getAllInvoices(),
      ]);

      const myDocs      = docRes.status      === 'fulfilled' ? toArray(docRes.value.data?.data).map(normalizeDocument) : [];
      const myContracts = contractRes.status === 'fulfilled' ? (contractRes.value.data?.data || []) : [];
      const allDeliveries = deliveryRes.status === 'fulfilled' ? (deliveryRes.value.data?.data || []) : [];
      const allInvoices   = invoiceRes.status  === 'fulfilled' ? (invoiceRes.value.data?.data  || []) : [];

      const contractIds = new Set(myContracts.map(c => c.contractId));
      const myDeliveries = allDeliveries.filter(d => contractIds.has(d.contractId));
      const myInvoices   = allInvoices.filter(i => contractIds.has(i.contractId));

      setDocs(myDocs);
      setContracts(myContracts);
      setDeliveries(myDeliveries);
      setInvoices(myInvoices);
    } catch {
      toast.error('Failed to load vendor profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Contract accept/reject ──────────────────────────────────────
  const handleAcceptContract = async (contractId) => {
    setSavingContract(true);
    try {
      await vendorContractResponse(contractId, 'ACCEPT', vendor.vendorId);
      toast.success('Contract accepted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to accept contract'); }
    finally { setSavingContract(false); }
  };

  const handleRejectContract = async () => {
    if (!rejectRemarks.trim()) { toast.error('Please provide a reason for rejection'); return; }
    setSavingContract(true);
    try {
      await vendorContractResponse(rejectContractId, 'REJECT', vendor.vendorId, rejectRemarks.trim());
      toast.success('Contract rejected');
      setRejectContractId(null);
      setRejectRemarks('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject contract'); }
    finally { setSavingContract(false); }
  };

  // ── Delivery submit ─────────────────────────────────────────────
  const handleSubmitDelivery = async () => {
    const e = {};
    if (!deliveryForm.contractId)   e.contractId   = 'Please select a contract';
    if (!deliveryForm.description)  e.description  = 'Description is required';
    setDeliveryErrors(e);
    if (Object.keys(e).length) return;
    setSavingDelivery(true);
    try {
      await createDelivery({
        contractId:    Number(deliveryForm.contractId),
        description:   deliveryForm.description,
        ...(deliveryForm.scheduledDate && { scheduledDate: deliveryForm.scheduledDate }),
      });
      toast.success('Delivery submitted for review');
      setShowDeliveryModal(false);
      setDeliveryForm(EMPTY_DELIVERY);
      setDeliveryErrors({});
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit delivery');
    } finally {
      setSavingDelivery(false);
    }
  };

  // ── Invoice submit ──────────────────────────────────────────────
  const handleSubmitInvoice = async () => {
    const e = {};
    if (!invoiceForm.contractId) e.contractId = 'Please select a contract';
    if (!invoiceForm.amount)     e.amount     = 'Amount is required';
    if (!invoiceForm.date)       e.date       = 'Invoice date is required';
    if (!invoiceForm.dueDate)    e.dueDate    = 'Due date is required';
    setInvoiceErrors(e);
    if (Object.keys(e).length) return;
    setSavingInvoice(true);
    try {
      await createInvoice({
        contractId:  Number(invoiceForm.contractId),
        amount:      Number(invoiceForm.amount),
        date:        invoiceForm.date,
        dueDate:     invoiceForm.dueDate,
        description: invoiceForm.description || undefined,
      });
      toast.success('Invoice submitted for review');
      setShowInvoiceModal(false);
      setInvoiceForm(EMPTY_INVOICE);
      setInvoiceErrors({});
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit invoice');
    } finally {
      setSavingInvoice(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const activeContracts  = contracts.filter(c => c.status === 'ACTIVE');
  const pendingContracts = contracts.filter(c => c.status === 'PENDING');

  // Contracts with at least one ACCEPTED or MARKED_DELIVERED delivery (eligible for invoice)
  const eligibleContractIds = new Set(
    deliveries
      .filter(d => d.status === 'ACCEPTED' || d.status === 'MARKED_DELIVERED')
      .map(d => d.contractId)
  );
  const invoiceEligibleContracts = activeContracts.filter(c => eligibleContractIds.has(c.contractId));

  const statusColor = vendor?.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600';

  return (
    <div className="animate-fadeIn space-y-6">

      {/* Welcome banner */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.15) 0%,rgba(20,184,166,0.15) 100%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Vendor Portal</p>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{vendor?.name || user?.name || 'Welcome'}</h2>
            <p className="text-sm text-slate-500 mt-1">Category: {vendor?.category || '—'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="btn-secondary text-xs">
              <RefreshCw size={12} /> Refresh
            </button>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Account Status</p>
              <span className={`text-lg font-bold ${statusColor}`}>{vendor?.status || 'PENDING'}</span>
            </div>
          </div>
        </div>
        {pendingContracts.length > 0 && (
          <div className="relative mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/15 dark:border-amber-700/40">
            <Clock size={14} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              You have <strong>{pendingContracts.length}</strong> contract{pendingContracts.length > 1 ? 's' : ''} awaiting your acceptance.
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Contracts',  value: activeContracts.length,                                             icon: FileText,     color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
          { label: 'Documents',         value: docs.length,                                                        icon: Package,      color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
          { label: 'Pending Deliveries',value: deliveries.filter(d => d.status === 'PENDING').length,             icon: Truck,        color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Invoices Submitted',value: invoices.length,                                                    icon: CreditCard,   color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Profile + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><User size={15} />Vendor Profile</h3>
          <div className="space-y-3">
            {[
              ['Vendor ID', vendor?.vendorId],
              ['Company Name', vendor?.name],
              ['Email', vendor?.email],
              ['Phone', vendor?.phone],
              ['Category', vendor?.category],
              ['Address', vendor?.address],
              ['Status', vendor?.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/30">
                <span className="text-xs text-slate-400">{k}</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[180px] text-right truncate">{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><FileText size={15} />My Documents</h3>
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <FileText size={28} className="opacity-30" />
              <p className="text-xs">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100 dark:border-slate-700/40">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{d.documentType || `Document ${i + 1}`}</p>
                      <p className="text-[10px] text-slate-400">{d.uploadedAt?.slice(0, 10) || '—'}</p>
                    </div>
                  </div>
                  <Badge status={d.status === 'APPROVED' || d.status === 'VERIFIED' ? 'Completed' : d.status === 'REJECTED' ? 'Overdue' : 'Pending'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Contracts */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={15} />My Contracts
          <span className="ml-auto text-[10px] font-normal text-slate-400">{contracts.length} total</span>
        </h3>
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <FileText size={28} className="opacity-30" />
            <p className="text-xs">No contracts assigned yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => (
              <div key={c.contractId} className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{c.contractId}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONTRACT_STATUS_COLOR[c.status] || 'text-slate-500 bg-slate-100'}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate">{c.title || c.projectName || 'Contract'}</p>
                    <div className="flex gap-4 mt-1.5 flex-wrap">
                      {c.startDate && <p className="text-[10px] text-slate-400">Start: {c.startDate}</p>}
                      {c.endDate   && <p className="text-[10px] text-slate-400">End: {c.endDate}</p>}
                      {c.value     && <p className="text-[10px] text-slate-400">Value: ${Number(c.value).toLocaleString()}</p>}
                    </div>
                  </div>
                  {c.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAcceptContract(c.contractId)}
                        disabled={savingContract}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/35 disabled:opacity-50 transition-all"
                      >
                        {savingContract ? <Loader2 size={10} className="animate-spin" /> : <CheckCheck size={11} />} Accept
                      </button>
                      <button
                        onClick={() => { setRejectContractId(c.contractId); setRejectRemarks(''); }}
                        disabled={savingContract}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/40 hover:bg-red-100 dark:hover:bg-red-900/35 disabled:opacity-50 transition-all"
                      >
                        <XCircle size={11} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Deliveries */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Truck size={15} />My Deliveries
            <span className="ml-1 text-[10px] font-normal text-slate-400">{deliveries.length} total</span>
          </h3>
          {activeContracts.length > 0 && (
            <Button variant="primary" size="xs" icon={<Plus size={12} />} onClick={() => setShowDeliveryModal(true)}>
              Submit Delivery
            </Button>
          )}
        </div>

        {activeContracts.length === 0 && deliveries.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-400">
            <Truck size={28} className="opacity-30" />
            <p className="text-xs font-medium">No deliveries yet</p>
            <p className="text-[10px]">Accept a contract first before submitting a delivery.</p>
          </div>
        )}

        {deliveries.length > 0 && (
          <div className="space-y-2">
            {deliveries.map(d => (
              <div key={d.deliveryId} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40">
                <div>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{d.deliveryId}</p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-0.5 line-clamp-1">{d.description || '—'}</p>
                  <p className="text-[10px] text-slate-400">Contract #{d.contractId}{d.scheduledDate ? ` · Due ${d.scheduledDate}` : ''}</p>
                </div>
                <Badge status={d.status === 'ACCEPTED' ? 'Completed' : d.status === 'REJECTED' ? 'Overdue' : 'Pending'} />
              </div>
            ))}
          </div>
        )}

        {activeContracts.length > 0 && deliveries.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            You have {activeContracts.length} active contract{activeContracts.length > 1 ? 's' : ''}. Click <strong>Submit Delivery</strong> to record a delivery.
          </p>
        )}
      </div>

      {/* Submit Delivery Modal */}
      <Modal
        open={showDeliveryModal}
        onClose={() => { setShowDeliveryModal(false); setDeliveryForm(EMPTY_DELIVERY); setDeliveryErrors({}); }}
        title="Submit Delivery"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-700/40">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Select one of your accepted contracts below. The delivery will be reviewed by the project manager.
            </p>
          </div>
          <FormSelect
            label="Contract"
            required
            hint="Only your accepted (active) contracts are listed"
            value={deliveryForm.contractId}
            onChange={e => {
              const selectedId = e.target.value;
              const selectedC  = activeContracts.find(c => String(c.contractId) === selectedId);
              setDeliveryForm(p => ({
                ...p,
                contractId:    selectedId,
                scheduledDate: p.scheduledDate && selectedC?.endDate && p.scheduledDate > selectedC.endDate
                  ? ''
                  : p.scheduledDate,
              }));
              if (selectedId) setDeliveryErrors(p => ({ ...p, contractId: '' }));
            }}
            error={deliveryErrors.contractId}
          >
            <option value="">Select contract…</option>
            {activeContracts.map(c => (
              <option key={c.contractId} value={c.contractId}>
                {c.title || c.projectName || 'Contract'} (#{c.contractId}{c.endDate ? ` · ends ${c.endDate}` : ''})
              </option>
            ))}
          </FormSelect>
          <FormTextarea
            label="Delivery Description"
            required
            value={deliveryForm.description}
            onChange={e => { setDeliveryForm(p => ({ ...p, description: e.target.value })); if (e.target.value) setDeliveryErrors(p => ({ ...p, description: '' })); }}
            rows={3}
            placeholder="Describe what is being delivered…"
            error={deliveryErrors.description}
          />
          {(() => {
            const sel = activeContracts.find(c => String(c.contractId) === String(deliveryForm.contractId));
            return (
              <FormInput
                label="Delivery Date"
                type="date"
                min={today}
                max={sel?.endDate || undefined}
                hint={sel?.endDate ? `Must be between today and the contract end date (${sel.endDate})` : undefined}
                value={deliveryForm.scheduledDate}
                onChange={e => setDeliveryForm(p => ({ ...p, scheduledDate: e.target.value }))}
              />
            );
          })()}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setShowDeliveryModal(false); setDeliveryForm(EMPTY_DELIVERY); setDeliveryErrors({}); }}>
              Cancel
            </Button>
            <Button variant="primary" size="xs" onClick={handleSubmitDelivery} loading={savingDelivery}>
              Submit Delivery
            </Button>
          </div>
        </div>
      </Modal>

      {/* My Invoices */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <CreditCard size={15} />My Invoices
          </h3>
          {invoiceEligibleContracts.length > 0 && (
            <Button variant="primary" size="xs" icon={<Plus size={12} />} onClick={() => setShowInvoiceModal(true)}>
              Submit Invoice
            </Button>
          )}
        </div>
        {invoiceEligibleContracts.length === 0 && invoices.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-400">
            <Truck size={28} className="opacity-30" />
            <p className="text-xs font-medium">No invoices yet</p>
            <p className="text-[10px]">You can submit an invoice once a delivery has been accepted by the project manager.</p>
          </div>
        )}
        {invoices.length > 0 && (
          <div className="space-y-2 mb-4">
            {invoices.map(inv => (
              <div key={inv.invoiceId} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40">
                <div>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{inv.invoiceId}</p>
                  <p className="text-[10px] text-slate-400">Contract #{inv.contractId} · Due {inv.dueDate || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">${(inv.amount || 0).toLocaleString()}</p>
                  <Badge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        )}
        {invoiceEligibleContracts.length > 0 && invoices.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            You have {invoiceEligibleContracts.length} contract{invoiceEligibleContracts.length > 1 ? 's' : ''} with accepted deliveries. Click <strong>Submit Invoice</strong> to proceed.
          </p>
        )}
      </div>

      {/* Contract Reject Modal */}
      <Modal
        open={rejectContractId !== null}
        onClose={() => { setRejectContractId(null); setRejectRemarks(''); }}
        title="Reject Contract"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please provide a reason for rejecting contract <span className="font-semibold text-slate-700 dark:text-slate-200">#{rejectContractId}</span>. This will be recorded.
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
            <Button variant="danger" size="xs" onClick={handleRejectContract} loading={savingContract}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Invoice Modal */}
      <Modal
        open={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); setInvoiceForm(EMPTY_INVOICE); setInvoiceErrors({}); }}
        title="Submit Invoice"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-700/40">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Invoice will be reviewed by the Finance Officer before payment is processed.
            </p>
          </div>
          <FormSelect
            label="Contract"
            required
            hint="Only contracts with accepted deliveries are shown"
            value={invoiceForm.contractId}
            onChange={e => { setInvoiceForm(p => ({ ...p, contractId: e.target.value })); if (e.target.value) setInvoiceErrors(p => ({ ...p, contractId: '' })); }}
            error={invoiceErrors.contractId}
          >
            <option value="">Select contract…</option>
            {invoiceEligibleContracts.map(c => (
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
            value={invoiceForm.amount}
            onChange={e => { setInvoiceForm(p => ({ ...p, amount: e.target.value })); if (e.target.value) setInvoiceErrors(p => ({ ...p, amount: '' })); }}
            placeholder="0.00"
            error={invoiceErrors.amount}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Invoice Date"
              required
              type="date"
              max={today}
              value={invoiceForm.date}
              onChange={e => { setInvoiceForm(p => ({ ...p, date: e.target.value })); if (e.target.value) setInvoiceErrors(p => ({ ...p, date: '' })); }}
              error={invoiceErrors.date}
            />
            <FormInput
              label="Due Date"
              required
              type="date"
              min={tomorrow}
              value={invoiceForm.dueDate}
              onChange={e => { setInvoiceForm(p => ({ ...p, dueDate: e.target.value })); if (e.target.value) setInvoiceErrors(p => ({ ...p, dueDate: '' })); }}
              error={invoiceErrors.dueDate}
            />
          </div>
          <FormTextarea
            label="Description"
            value={invoiceForm.description}
            onChange={e => setInvoiceForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Optional description…"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setShowInvoiceModal(false); setInvoiceForm(EMPTY_INVOICE); setInvoiceErrors({}); }}>
              Cancel
            </Button>
            <Button variant="primary" size="xs" onClick={handleSubmitInvoice} loading={savingInvoice}>
              Submit Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
