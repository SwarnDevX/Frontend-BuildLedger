import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, Clock, CheckCircle2, AlertTriangle, ChevronRight, Plus, Loader2, RefreshCw, X } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getAllInvoices, createInvoice, approveInvoice, rejectInvoice } from '../../api/invoices';
import { getAllPayments, processPayment } from '../../api/payments';
import { getAllContracts } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// NOTE: Monthly payment trend chart (paymentTrendData) is not available from the backend.
//   Future endpoint needed:
//   GET /analytics/payments/trend?year=2026 → { month, paid, pending }[]
//   Until then, chart is derived by grouping payments by createdAt month.

const approvalStages = ['PENDING', 'APPROVED', 'PAID'];
const stageLabels    = { PENDING: 'Pending Approval', APPROVED: 'Approved', PAID: 'Paid' };
const stageColors    = { PENDING: '#F59E0B', APPROVED: '#14B8A6', PAID: '#22C55E' };
const stageBg        = { PENDING: 'rgba(245,158,11,0.08)', APPROVED: 'rgba(20,184,166,0.08)', PAID: 'rgba(34,197,94,0.08)' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildTrend(payments) {
  const map = {};
  MONTHS.forEach(m => { map[m] = { month: m, paid: 0, pending: 0 }; });
  payments.forEach(p => {
    const d = p.createdAt || p.paymentDate;
    if (!d) return;
    const m = MONTHS[new Date(d).getMonth()];
    if (!m) return;
    if (p.status === 'PAID' || p.status === 'COMPLETED') map[m].paid += p.amount || 0;
    else map[m].pending += p.amount || 0;
  });
  return Object.values(map);
}

function ApprovalPipeline({ invoices, onApprove, onReject, canApprove }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Approval Workflow</h3>
      <div className="flex items-start gap-2">
        {approvalStages.map((stage, i) => {
          const items = invoices.filter(inv => inv.status === stage);
          return (
            <div key={stage} className="flex items-start gap-2 flex-1">
              <div className="flex-1 rounded-2xl p-3 border border-dashed" style={{ borderColor: `${stageColors[stage]}40`, background: stageBg[stage] }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: stageColors[stage] }}>{stageLabels[stage]}</p>
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: stageColors[stage] }}>{items.length}</span>
                </div>
                {items.map(inv => (
                  <div key={inv.invoiceId} className="bg-white/70 rounded-xl p-2 mb-1.5 shadow-sm">
                    <p className="text-[10px] font-mono text-slate-500">#{inv.invoiceId}</p>
                    <p className="text-xs font-semibold text-slate-800">${(inv.amount || 0).toLocaleString()}</p>
                    {stage === 'PENDING' && canApprove && (
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => onApprove(inv.invoiceId)} className="text-[10px] text-green-700 hover:underline font-semibold">Approve</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => onReject(inv.invoiceId)} className="text-[10px] text-red-600 hover:underline font-semibold">Reject</button>
                      </div>
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

const EMPTY_FORM = { contractId: '', amount: '', dueDate: '', description: '' };

export default function InvoicePayment() {
  const { user } = useAuth();
  const [invoices, setInvoices]   = useState([]);
  const [payments, setPayments]   = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const canApprove = ['ADMIN', 'FINANCE_OFFICER'].includes(user?.role);
  const canCreate  = ['ADMIN', 'FINANCE_OFFICER', 'VENDOR'].includes(user?.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inv, pay, con] = await Promise.allSettled([getAllInvoices(), getAllPayments(), getAllContracts()]);
      setInvoices(inv.status === 'fulfilled' ? (inv.value.data?.data || []) : []);
      setPayments(pay.status === 'fulfilled' ? (pay.value.data?.data || []) : []);
      setContracts(con.status === 'fulfilled' ? (con.value.data?.data || []) : []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    try { await approveInvoice(id); toast.success('Invoice approved'); fetchData(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try { await rejectInvoice(id, reason); toast.success('Invoice rejected'); fetchData(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
  };

  const handleCreate = async () => {
    if (!form.contractId || !form.amount) { toast.error('Contract and amount are required'); return; }
    setSaving(true);
    try {
      await createInvoice({
        contractId: Number(form.contractId),
        amount: Number(form.amount),
        dueDate: form.dueDate || undefined,
        description: form.description || undefined,
        status: 'PENDING',
      });
      toast.success('Invoice submitted');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally { setSaving(false); }
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // KPI aggregates
  const total   = invoices.reduce((a, b) => a + (b.amount || 0), 0);
  const paid    = invoices.filter(i => i.status === 'PAID').reduce((a, b) => a + (b.amount || 0), 0);
  const pending = invoices.filter(i => i.status === 'PENDING').reduce((a, b) => a + (b.amount || 0), 0);
  const now     = new Date();
  const overdue = invoices.filter(i => i.status === 'PENDING' && i.dueDate && new Date(i.dueDate) < now).reduce((a, b) => a + (b.amount || 0), 0);

  const trendData = buildTrend(payments);

  const summaryCards = [
    { label: 'Total Invoiced', value: `$${(total/1000).toFixed(0)}K`, icon: DollarSign, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Paid', value: `$${(paid/1000).toFixed(0)}K`, icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
    { label: 'Pending', value: `$${(pending/1000).toFixed(0)}K`, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Overdue', value: `$${(overdue/1000).toFixed(0)}K`, icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
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
          <p className="text-sm text-slate-400">{invoices.length} invoices total</p>
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
                  <p className="text-green-600">Paid: ${(payload[0]?.value || 0).toLocaleString()}</p>
                  <p className="text-amber-600">Pending: ${(payload[1]?.value || 0).toLocaleString()}</p>
                </div>
              ) : null} />
              <Bar dataKey="paid" fill="#22C55E" radius={[4,4,0,0]} />
              <Bar dataKey="pending" fill="#F59E0B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-green-500" />Paid</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" />Pending</div>
          </div>
        </div>
        <ApprovalPipeline invoices={invoices} onApprove={handleApprove} onReject={handleReject} canApprove={canApprove} />
      </div>

      {/* Invoice Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">All Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                {['Invoice', 'Contract', 'Amount', 'Due Date', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No invoices found</td></tr>
              ) : invoices.map(inv => {
                const contract = contracts.find(c => c.contractId === inv.contractId);
                return (
                  <tr key={inv.invoiceId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-blue-600 font-semibold">#{inv.invoiceId}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{contract?.title || `#${inv.contractId}` || '—'}</td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-800">${(inv.amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{inv.dueDate || '—'}</td>
                    <td className="px-5 py-3"><Badge status={inv.status} /></td>
                    <td className="px-5 py-3">
                      {canApprove && inv.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(inv.invoiceId)} className="text-xs text-green-700 hover:underline font-medium">Approve</button>
                          <button onClick={() => handleReject(inv.invoiceId)} className="text-xs text-red-600 hover:underline font-medium">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Submit Invoice">
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
            <label className="text-xs font-semibold text-slate-600 block mb-1">Amount ($) *</label>
            <input type="number" value={form.amount} onChange={set('amount')} placeholder="0.00"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Due Date</label>
            <input type="date" value={form.dueDate} onChange={set('dueDate')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Optional description…"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Submitting…</> : 'Submit Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

