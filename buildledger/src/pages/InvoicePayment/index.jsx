import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, Clock, CheckCircle2, AlertTriangle, ChevronRight, Plus, Loader2, RefreshCw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getAllInvoices, createInvoice, approveInvoice, rejectInvoice } from '../../api/invoices';
import { getAllPayments, processPayment, updatePaymentStatus } from '../../api/payments';
import { getAllContracts } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// NOTE: Invoice lifecycle: UNDER_REVIEW → APPROVED → PAID (via payment)
// Monthly payment trend chart is derived from payment createdAt dates.

// Invoice statuses returned from backend: UNDER_REVIEW, APPROVED, REJECTED, PAID
const approvalStages  = ['UNDER_REVIEW', 'APPROVED', 'PAID'];
const stageLabels     = { UNDER_REVIEW: 'Under Review', APPROVED: 'Approved', PAID: 'Paid' };
const stageColors     = { UNDER_REVIEW: '#F59E0B', APPROVED: '#14B8A6', PAID: '#22C55E' };
const stageBg         = { UNDER_REVIEW: 'rgba(245,158,11,0.08)', APPROVED: 'rgba(20,184,166,0.08)', PAID: 'rgba(34,197,94,0.08)' };

const PAYMENT_METHODS = ['BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'CASH', 'NEFT', 'RTGS', 'UPI'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildTrend(payments) {
  const map = {};
  MONTHS.forEach(m => { map[m] = { month: m, paid: 0, pending: 0 }; });
  payments.forEach(p => {
    const d = p.createdAt || p.paymentDate;
    if (!d) return;
    const m = MONTHS[new Date(d).getMonth()];
    if (!m) return;
    if (p.status === 'COMPLETED') map[m].paid += p.amount || 0;
    else map[m].pending += p.amount || 0;
  });
  return Object.values(map);
}

function contractLabel(contracts, contractId) {
  const c = contracts.find(x => x.contractId === contractId);
  if (!c) return `#${contractId}`;
  return `${c.vendorName || 'Unknown'} — ${c.projectName || 'Unknown'} (#${contractId})`;
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

function ApprovalPipeline({ invoices, onApprove, onReject, onPayment, canApprove }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Approval Workflow</h3>
      <div className="flex items-start gap-2">
        {approvalStages.map((stage, i) => {
          const items = invoices.filter(inv => inv.status === stage);
          return (
            <div key={stage} className="flex items-start gap-2 flex-1">
              <div className="flex-1 rounded-2xl p-3 border border-dashed"
                style={{ borderColor: `${stageColors[stage]}40`, background: stageBg[stage] }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: stageColors[stage] }}>
                    {stageLabels[stage]}
                  </p>
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stageColors[stage] }}>{items.length}</span>
                </div>
                {items.map(inv => (
                  <div key={inv.invoiceId} className="bg-white/70 rounded-xl p-2 mb-1.5 shadow-sm">
                    <p className="text-[10px] font-mono text-slate-500">#{inv.invoiceId}</p>
                    <p className="text-xs font-semibold text-slate-800">${(inv.amount || 0).toLocaleString()}</p>
                    {stage === 'UNDER_REVIEW' && canApprove && (
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => onApprove(inv.invoiceId)} className="text-[10px] text-green-700 hover:underline font-semibold">Approve</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => onReject(inv.invoiceId)} className="text-[10px] text-red-600 hover:underline font-semibold">Reject</button>
                      </div>
                    )}
                    {stage === 'APPROVED' && canApprove && (
                      <button onClick={() => onPayment(inv)} className="text-[10px] text-teal-700 hover:underline font-semibold mt-1 block">Process Payment</button>
                    )}
                  </div>
                ))}
              </div>
              {i < approvalStages.length - 1 && <ChevronRight size={14} className="text-slate-300 mt-5 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_INVOICE = { contractId: '', amount: '', date: '', dueDate: '', description: '' };
const EMPTY_PAYMENT = { amount: '', date: '', method: 'BANK_TRANSFER', transactionReference: '', remarks: '' };

export default function InvoicePayment() {
  const { user } = useAuth();
  const [invoices, setInvoices]     = useState([]);
  const [payments, setPayments]     = useState([]);
  const [contracts, setContracts]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formI, setFormI]           = useState(EMPTY_INVOICE);
  const [formP, setFormP]           = useState(EMPTY_PAYMENT);
  const [saving, setSaving]         = useState(false);

  const canApprove = ['ADMIN', 'FINANCE_OFFICER'].includes(user?.role);
  const canCreate  = ['ADMIN', 'VENDOR'].includes(user?.role);

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inv, pay, con] = await Promise.allSettled([getAllInvoices(), getAllPayments(), getAllContracts()]);
      setInvoices(inv.status === 'fulfilled'  ? (inv.value.data?.data || []) : []);
      setPayments(pay.status === 'fulfilled'  ? (pay.value.data?.data || []) : []);
      setContracts(con.status === 'fulfilled' ? (con.value.data?.data || []) : []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    try { await approveInvoice(id); toast.success('Invoice approved'); fetchData(); }
    catch (err) { showErrors(err); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try { await rejectInvoice(id, reason); toast.success('Invoice rejected'); fetchData(); }
    catch (err) { showErrors(err); }
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setFormP({ ...EMPTY_PAYMENT, amount: invoice.amount?.toString() || '' });
    setShowPayment(true);
  };

  const handleCreate = async () => {
    if (!formI.contractId || !formI.amount) { toast.error('Contract and amount are required'); return; }
    if (!formI.date)    { toast.error('Invoice date is required'); return; }
    if (!formI.dueDate) { toast.error('Due date is required'); return; }
    setSaving(true);
    try {
      await createInvoice({
        contractId:  Number(formI.contractId),
        amount:      Number(formI.amount),
        date:        formI.date,
        dueDate:     formI.dueDate,
        description: formI.description || undefined,
      });
      toast.success('Invoice submitted for review');
      setShowCreate(false);
      setFormI(EMPTY_INVOICE);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleProcessPayment = async () => {
    if (!formP.transactionReference) { toast.error('Transaction reference is required'); return; }
    if (!formP.amount)  { toast.error('Amount is required'); return; }
    if (!formP.date)    { toast.error('Payment date is required'); return; }
    setSaving(true);
    try {
      const res = await processPayment({
        invoiceId:           selectedInvoice.invoiceId,
        amount:              Number(formP.amount),
        date:                formP.date,
        method:              formP.method,
        transactionReference: formP.transactionReference,
        remarks:             formP.remarks || undefined,
      });
      const paymentId = res.data?.data?.paymentId;
      if (paymentId) {
        // Advance payment: PENDING → PROCESSING → COMPLETED (marks invoice PAID)
        await updatePaymentStatus(paymentId, 'PROCESSING');
        await updatePaymentStatus(paymentId, 'COMPLETED');
        toast.success('Payment processed — invoice marked as PAID');
      } else {
        toast.success('Payment submitted');
      }
      setShowPayment(false);
      setSelectedInvoice(null);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const setI = k => e => setFormI(p => ({ ...p, [k]: e.target.value }));
  const setP = k => e => setFormP(p => ({ ...p, [k]: e.target.value }));

  // KPI aggregates
  const total   = invoices.reduce((a, b) => a + (b.amount || 0), 0);
  const paid    = invoices.filter(i => i.status === 'PAID').reduce((a, b) => a + (b.amount || 0), 0);
  const pending = invoices.filter(i => i.status === 'UNDER_REVIEW').reduce((a, b) => a + (b.amount || 0), 0);
  const now     = new Date();
  const overdue = invoices.filter(i => i.status === 'UNDER_REVIEW' && i.dueDate && new Date(i.dueDate) < now)
    .reduce((a, b) => a + (b.amount || 0), 0);

  const trendData = buildTrend(payments);

  const summaryCards = [
    { label: 'Total Invoiced', value: `$${(total/1000).toFixed(0)}K`, icon: DollarSign, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Paid',           value: `$${(paid/1000).toFixed(0)}K`,  icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
    { label: 'Under Review',   value: `$${(pending/1000).toFixed(0)}K`, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Overdue',        value: `$${(overdue/1000).toFixed(0)}K`, icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading invoices…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Invoices & Payments</h2>
          <p className="text-sm text-slate-400">{invoices.length} invoices total · Lifecycle: UNDER_REVIEW → APPROVED → PAID</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RefreshCw size={13} /> Refresh</button>
          {canCreate && (
            <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}><Plus size={14} /> New Invoice</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={18} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{c.label}</p>
              <p className="text-xl font-bold text-slate-800">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Payment History</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div className="glass-card px-3 py-2 text-xs">
                  <p className="font-semibold mb-1">{label}</p>
                  <p className="text-green-600">Completed: ${(payload[0]?.value || 0).toLocaleString()}</p>
                  <p className="text-amber-600">Pending: ${(payload[1]?.value || 0).toLocaleString()}</p>
                </div>
              ) : null} />
              <Bar dataKey="paid" fill="#22C55E" radius={[4,4,0,0]} />
              <Bar dataKey="pending" fill="#F59E0B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-green-500" />Completed</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" />Pending</div>
          </div>
        </div>
        <ApprovalPipeline invoices={invoices} onApprove={handleApprove} onReject={handleReject}
          onPayment={openPaymentModal} canApprove={canApprove} />
      </div>

      {/* Invoice Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">All Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                {['Invoice', 'Contract', 'Amount', 'Invoice Date', 'Due Date', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No invoices found</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.invoiceId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-blue-600 font-semibold">#{inv.invoiceId}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{contractLabel(contracts, inv.contractId)}</td>
                  <td className="px-5 py-3 text-xs font-bold text-slate-800">${(inv.amount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{inv.date || '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{inv.dueDate || '—'}</td>
                  <td className="px-5 py-3"><Badge status={inv.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {canApprove && inv.status === 'UNDER_REVIEW' && (
                        <>
                          <button onClick={() => handleApprove(inv.invoiceId)} className="text-xs text-green-700 hover:underline font-medium">Approve</button>
                          <button onClick={() => handleReject(inv.invoiceId)} className="text-xs text-red-600 hover:underline font-medium">Reject</button>
                        </>
                      )}
                      {canApprove && inv.status === 'APPROVED' && (
                        <button onClick={() => openPaymentModal(inv)} className="text-xs text-teal-600 hover:underline font-medium">Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormI(EMPTY_INVOICE); }} title="Submit Invoice">
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-xs text-slate-500 flex items-start gap-2"
            style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)' }}>
            <AlertTriangle size={13} className="text-blue-400 shrink-0 mt-0.5" />
            Invoice will start in <strong className="text-blue-600 mx-1">UNDER_REVIEW</strong> status and requires Finance Officer approval.
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract * <span className="text-slate-400 font-normal">(must be ACTIVE)</span></label>
            <select value={formI.contractId} onChange={setI('contractId')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400">
              <option value="">Select contract…</option>
              {contracts.filter(c => c.status === 'ACTIVE').map(c => (
                <option key={c.contractId} value={c.contractId}>
                  {c.vendorName || 'Unknown'} — {c.projectName || 'Unknown'} (#{c.contractId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Amount ($) *</label>
            <input type="number" min="0.01" step="0.01" value={formI.amount} onChange={setI('amount')} placeholder="0.00"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Invoice Date * <span className="text-slate-400 font-normal">(today or earlier)</span></label>
              <input type="date" max={today} value={formI.date} onChange={setI('date')}
                className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Due Date * <span className="text-slate-400 font-normal">(future)</span></label>
              <input type="date" min={tomorrow} value={formI.dueDate} onChange={setI('dueDate')}
                className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
            <textarea value={formI.description} onChange={setI('description')} rows={2} placeholder="Optional description…"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowCreate(false); setFormI(EMPTY_INVOICE); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Submitting…</> : 'Submit Invoice'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Process Payment Modal */}
      <Modal open={showPayment} onClose={() => { setShowPayment(false); setSelectedInvoice(null); }} title={`Process Payment — Invoice #${selectedInvoice?.invoiceId}`}>
        <div className="space-y-4">
          {selectedInvoice && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)' }}>
              <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Invoice Amount</p>
              <p className="text-xl font-bold text-teal-700">${(selectedInvoice.amount || 0).toLocaleString()}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Amount ($) *</label>
            <input type="number" min="0.01" step="0.01" value={formP.amount} onChange={setP('amount')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Payment Date * <span className="text-slate-400 font-normal">(today or earlier)</span></label>
            <input type="date" max={today} value={formP.date} onChange={setP('date')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Payment Method *</label>
            <select value={formP.method} onChange={setP('method')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Transaction Reference * <span className="text-slate-400 font-normal">(letters, digits, hyphens, slashes)</span></label>
            <input value={formP.transactionReference} onChange={setP('transactionReference')} placeholder="e.g. TXN-2024-001"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
            <textarea value={formP.remarks} onChange={setP('remarks')} rows={2}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowPayment(false); setSelectedInvoice(null); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleProcessPayment} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Processing…</> : 'Process Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
