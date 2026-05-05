import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, Clock, CheckCircle2, AlertTriangle, ChevronRight, Plus, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getAllInvoices, createInvoice, approveInvoice, rejectInvoice } from '../../api/invoices';
import { getAllPayments, processPayment, updatePaymentStatus } from '../../api/payments';
import { getAllContracts } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const approvalStages = ['UNDER_REVIEW', 'APPROVED', 'PAID'];
const stageLabels    = { UNDER_REVIEW: 'Under Review', APPROVED: 'Approved', PAID: 'Paid' };
const stageColors    = { UNDER_REVIEW: '#F59E0B', APPROVED: '#14B8A6', PAID: '#22C55E' };
const stageBg        = { UNDER_REVIEW: 'rgba(245,158,11,0.08)', APPROVED: 'rgba(20,184,166,0.08)', PAID: 'rgba(34,197,94,0.08)' };
const stageBgDark    = { UNDER_REVIEW: 'rgba(245,158,11,0.07)', APPROVED: 'rgba(20,184,166,0.07)', PAID: 'rgba(34,197,94,0.07)' };

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
    toast.error(Object.entries(apiErrors).map(([f, m]) => `${f}: ${m}`).join(' | '));
  } else {
    toast.error(err.response?.data?.message || 'Request failed');
  }
}

function ApprovalPipeline({ invoices, onApprove, onReject, onPayment, canApprove, isDark }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Approval Workflow</h3>
      <div className="flex items-start gap-2">
        {approvalStages.map((stage, i) => {
          const items = invoices.filter(inv => inv.status === stage);
          return (
            <div key={stage} className="flex items-start gap-2 flex-1">
              <div className="flex-1 rounded-2xl p-3 border border-dashed"
                style={{ borderColor: `${stageColors[stage]}40`, background: isDark ? stageBgDark[stage] : stageBg[stage] }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: stageColors[stage] }}>
                    {stageLabels[stage]}
                  </p>
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stageColors[stage] }}>{items.length}</span>
                </div>
                {items.map(inv => (
                  <div key={inv.invoiceId}
                    className="rounded-xl p-2 mb-1.5 shadow-sm border
                      bg-white/70 dark:bg-slate-800/60
                      border-white/80 dark:border-slate-700/40">
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-500">#{inv.invoiceId}</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">${(inv.amount || 0).toLocaleString()}</p>
                    {stage === 'UNDER_REVIEW' && canApprove && (
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => onApprove(inv.invoiceId)}
                          className="text-[10px] text-green-600 dark:text-green-400 hover:underline font-semibold">Approve</button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button onClick={() => onReject(inv.invoiceId)}
                          className="text-[10px] text-red-500 dark:text-red-400 hover:underline font-semibold">Reject</button>
                      </div>
                    )}
                    {stage === 'APPROVED' && canApprove && (
                      <button onClick={() => onPayment(inv)}
                        className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-semibold mt-1 block">Process Payment</button>
                    )}
                  </div>
                ))}
              </div>
              {i < approvalStages.length - 1 && (
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 mt-5 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_INVOICE = { contractId: '', amount: '', date: '', dueDate: '', description: '' };
const EMPTY_PAYMENT = { amount: '', date: '', method: 'BANK_TRANSFER', transactionReference: '', remarks: '' };

const inputCls = (err) =>
  `w-full text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${err ? 'border-amber-400' : ''}`;

export default function InvoicePayment() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [invoices, setInvoices]       = useState([]);
  const [payments, setPayments]       = useState([]);
  const [contracts, setContracts]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formI, setFormI]             = useState(EMPTY_INVOICE);
  const [formP, setFormP]             = useState(EMPTY_PAYMENT);
  const [saving, setSaving]           = useState(false);
  const [iErrors, setIErrors]         = useState({});
  const [pErrors, setPErrors]         = useState({});

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
    const e = {};
    if (!formI.contractId) e.contractId = 'Please select a contract';
    if (!formI.amount)     e.amount     = 'Amount is required';
    if (!formI.date)       e.date       = 'Invoice date is required';
    if (!formI.dueDate)    e.dueDate    = 'Due date is required';
    setIErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createInvoice({ contractId: Number(formI.contractId), amount: Number(formI.amount), date: formI.date, dueDate: formI.dueDate, description: formI.description || undefined });
      toast.success('Invoice submitted for review');
      setShowCreate(false); setFormI(EMPTY_INVOICE); setIErrors({}); fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleProcessPayment = async () => {
    const e = {};
    if (!formP.amount)               e.amount               = 'Amount is required';
    if (!formP.date)                 e.date                 = 'Payment date is required';
    if (!formP.transactionReference) e.transactionReference = 'Transaction reference is required';
    setPErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await processPayment({ invoiceId: selectedInvoice.invoiceId, amount: Number(formP.amount), date: formP.date, method: formP.method, transactionReference: formP.transactionReference, remarks: formP.remarks || undefined });
      const paymentId = res.data?.data?.paymentId;
      if (paymentId) {
        await updatePaymentStatus(paymentId, 'PROCESSING');
        await updatePaymentStatus(paymentId, 'COMPLETED');
        toast.success('Payment processed — invoice marked as PAID');
      } else {
        toast.success('Payment submitted');
      }
      setShowPayment(false); setSelectedInvoice(null); setPErrors({}); fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const setI = k => e => setFormI(p => ({ ...p, [k]: e.target.value }));
  const setP = k => e => setFormP(p => ({ ...p, [k]: e.target.value }));

  const total   = invoices.reduce((a, b) => a + (b.amount || 0), 0);
  const paid    = invoices.filter(i => i.status === 'PAID').reduce((a, b) => a + (b.amount || 0), 0);
  const pending = invoices.filter(i => i.status === 'UNDER_REVIEW').reduce((a, b) => a + (b.amount || 0), 0);
  const now     = new Date();
  const overdue = invoices.filter(i => i.status === 'UNDER_REVIEW' && i.dueDate && new Date(i.dueDate) < now).reduce((a, b) => a + (b.amount || 0), 0);
  const trendData = buildTrend(payments);

  const summaryCards = [
    { label: 'Total Invoiced', value: `$${(total/1000).toFixed(0)}K`,   icon: DollarSign,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Paid',           value: `$${(paid/1000).toFixed(0)}K`,    icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
    { label: 'Under Review',   value: `$${(pending/1000).toFixed(0)}K`, icon: Clock,        color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Overdue',        value: `$${(overdue/1000).toFixed(0)}K`, icon: AlertTriangle,color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
  ];

  const axisColor = isDark ? '#8aa4b6' : '#94a3b8';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

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
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Invoices & Payments</h2>
          <p className="text-sm text-slate-400">{invoices.length} invoices · UNDER_REVIEW → APPROVED → PAID</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RefreshCw size={13} /> Refresh</button>
          {canCreate && (
            <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}><Plus size={14} /> New Invoice</button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon size={18} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{c.label}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Payment History</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div className="glass-card px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                  <p className="text-green-500">Completed: ${(payload[0]?.value || 0).toLocaleString()}</p>
                  <p className="text-amber-500">Pending: ${(payload[1]?.value || 0).toLocaleString()}</p>
                </div>
              ) : null} />
              <Bar dataKey="paid"    fill="#22C55E" radius={[4,4,0,0]} />
              <Bar dataKey="pending" fill="#F59E0B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-green-500" />Completed</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" />Pending</div>
          </div>
        </div>
        <ApprovalPipeline invoices={invoices} onApprove={handleApprove} onReject={handleReject}
          onPayment={openPaymentModal} canApprove={canApprove} isDark={isDark} />
      </div>

      {/* Invoice Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/40">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">All Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60 dark:bg-slate-800/50">
              <tr>
                {['Invoice', 'Contract', 'Amount', 'Invoice Date', 'Due Date', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No invoices found</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.invoiceId} className="border-b border-slate-50 dark:border-slate-700/20 hover:bg-white/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{inv.invoiceId}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{contractLabel(contracts, inv.contractId)}</td>
                  <td className="px-5 py-3 text-xs font-bold text-slate-800 dark:text-slate-100">${(inv.amount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">{inv.date || '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">{inv.dueDate || '—'}</td>
                  <td className="px-5 py-3"><Badge status={inv.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {canApprove && inv.status === 'UNDER_REVIEW' && (
                        <>
                          <button onClick={() => handleApprove(inv.invoiceId)} className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">Approve</button>
                          <button onClick={() => handleReject(inv.invoiceId)}  className="text-xs text-red-500 dark:text-red-400 hover:underline font-medium">Reject</button>
                        </>
                      )}
                      {canApprove && inv.status === 'APPROVED' && (
                        <button onClick={() => openPaymentModal(inv)} className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium">Pay</button>
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
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormI(EMPTY_INVOICE); setIErrors({}); }} title="Submit Invoice">
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2"
            style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)' }}>
            <AlertTriangle size={13} className="text-blue-400 shrink-0 mt-0.5" />
            Invoice will start in <strong className="text-blue-500 mx-1">UNDER_REVIEW</strong> status and requires Finance Officer approval.
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Contract * <span className="text-slate-400 font-normal">(must be ACTIVE)</span></label>
            <select value={formI.contractId} onChange={e => { setI('contractId')(e); if (e.target.value) setIErrors(p => ({ ...p, contractId: '' })); }}
              className={inputCls(iErrors.contractId)}>
              <option value="">Select contract…</option>
              {contracts.filter(c => c.status === 'ACTIVE').map(c => (
                <option key={c.contractId} value={c.contractId}>{c.vendorName || 'Unknown'} — {c.projectName || 'Unknown'} (#{c.contractId})</option>
              ))}
            </select>
            {iErrors.contractId && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{iErrors.contractId}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Amount ($) *</label>
            <input type="number" min="0.01" step="0.01" value={formI.amount} onChange={e => { setI('amount')(e); if (e.target.value) setIErrors(p => ({ ...p, amount: '' })); }} placeholder="0.00"
              className={inputCls(iErrors.amount)} />
            {iErrors.amount && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{iErrors.amount}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Invoice Date *</label>
              <input type="date" max={today} value={formI.date} onChange={e => { setI('date')(e); if (e.target.value) setIErrors(p => ({ ...p, date: '' })); }}
                className={inputCls(iErrors.date)} />
              {iErrors.date && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{iErrors.date}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Due Date *</label>
              <input type="date" min={tomorrow} value={formI.dueDate} onChange={e => { setI('dueDate')(e); if (e.target.value) setIErrors(p => ({ ...p, dueDate: '' })); }}
                className={inputCls(iErrors.dueDate)} />
              {iErrors.dueDate && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{iErrors.dueDate}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Description</label>
            <textarea value={formI.description} onChange={setI('description')} rows={2} placeholder="Optional description…"
              className="w-full text-sm border rounded-xl px-3 py-2.5 outline-none resize-none transition-all" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowCreate(false); setFormI(EMPTY_INVOICE); setIErrors({}); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Submitting…</> : 'Submit Invoice'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Process Payment Modal */}
      <Modal open={showPayment} onClose={() => { setShowPayment(false); setSelectedInvoice(null); setPErrors({}); }} title={`Process Payment — Invoice #${selectedInvoice?.invoiceId}`}>
        <div className="space-y-4">
          {selectedInvoice && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)' }}>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">Invoice Amount</p>
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">${(selectedInvoice.amount || 0).toLocaleString()}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Amount ($) *</label>
            <input type="number" min="0.01" step="0.01" value={formP.amount} onChange={e => { setP('amount')(e); if (e.target.value) setPErrors(p => ({ ...p, amount: '' })); }}
              className={inputCls(pErrors.amount)} />
            {pErrors.amount && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{pErrors.amount}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Payment Date *</label>
            <input type="date" max={today} value={formP.date} onChange={e => { setP('date')(e); if (e.target.value) setPErrors(p => ({ ...p, date: '' })); }}
              className={inputCls(pErrors.date)} />
            {pErrors.date && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{pErrors.date}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Payment Method *</label>
            <select value={formP.method} onChange={setP('method')} className="w-full text-sm border rounded-xl px-3 py-2.5 outline-none transition-all">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Transaction Reference *</label>
            <input value={formP.transactionReference} onChange={e => { setP('transactionReference')(e); if (e.target.value) setPErrors(p => ({ ...p, transactionReference: '' })); }} placeholder="e.g. TXN-2024-001"
              className={inputCls(pErrors.transactionReference)} />
            {pErrors.transactionReference && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{pErrors.transactionReference}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Remarks</label>
            <textarea value={formP.remarks} onChange={setP('remarks')} rows={2}
              className="w-full text-sm border rounded-xl px-3 py-2.5 outline-none resize-none transition-all" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowPayment(false); setSelectedInvoice(null); setPErrors({}); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleProcessPayment} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Processing…</> : 'Process Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
