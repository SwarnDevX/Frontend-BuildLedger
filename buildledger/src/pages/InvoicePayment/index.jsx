import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { DollarSign, Clock, CheckCircle2, AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { invoices, paymentTrendData } from '../../data/mockData';

const approvalStages = ['Pending Approval', 'Approved', 'Paid'];

function ApprovalPipeline({ invoices }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Approval Workflow</h3>
      <div className="flex items-start gap-2">
        {approvalStages.map((stage, i) => {
          const items = invoices.filter(inv => {
            if (stage === 'Pending Approval') return inv.status === 'Pending Approval';
            if (stage === 'Approved') return inv.status === 'Approved';
            if (stage === 'Paid') return inv.status === 'Paid';
          });
          const colors = { 'Pending Approval': '#F59E0B', 'Approved': '#14B8A6', 'Paid': '#22C55E' };
          const bg = { 'Pending Approval': 'rgba(245,158,11,0.08)', 'Approved': 'rgba(20,184,166,0.08)', 'Paid': 'rgba(34,197,94,0.08)' };
          return (
            <div key={stage} className="flex items-start gap-2 flex-1">
              <div className="flex-1 rounded-2xl p-3 border border-dashed" style={{ borderColor: `${colors[stage]}40`, background: bg[stage] }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors[stage] }}>{stage}</p>
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: colors[stage] }}>{items.length}</span>
                </div>
                {items.map(inv => (
                  <div key={inv.id} className="bg-white/70 rounded-xl p-2 mb-1.5 shadow-sm">
                    <p className="text-[10px] font-mono text-slate-500">{inv.id}</p>
                    <p className="text-xs font-semibold text-slate-800">${inv.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 truncate">{inv.vendor}</p>
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

export default function InvoicePayment() {
  const total = invoices.reduce((a, b) => a + b.amount, 0);
  const paid = invoices.filter(i => i.status === 'Paid').reduce((a, b) => a + b.amount, 0);
  const pending = invoices.filter(i => i.status === 'Pending Approval').reduce((a, b) => a + b.amount, 0);
  const overdue = invoices.filter(i => i.status === 'Overdue').reduce((a, b) => a + b.amount, 0);

  const summaryCards = [
    { label: 'Total Invoiced', value: `$${(total/1000).toFixed(0)}K`, icon: DollarSign, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Paid', value: `$${(paid/1000).toFixed(0)}K`, icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
    { label: 'Pending', value: `$${(pending/1000).toFixed(0)}K`, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Overdue', value: `$${(overdue/1000).toFixed(0)}K`, icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  ];

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Invoices & Payments</h2>
          <p className="text-sm text-slate-400">{invoices.length} invoices this period</p>
        </div>
        <button className="btn-primary text-xs"><Plus size={14} /> New Invoice</button>
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
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Payment History (2025)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={paymentTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v/1000}K`} />
              <Tooltip
                content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="glass-card px-3 py-2 text-xs">
                    <p className="font-semibold mb-1">{label}</p>
                    <p className="text-green-600">Paid: ${payload[0]?.value?.toLocaleString()}</p>
                    <p className="text-amber-600">Pending: ${payload[1]?.value?.toLocaleString()}</p>
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
        <ApprovalPipeline invoices={invoices} />
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
                {['Invoice', 'Vendor', 'Contract', 'Amount', 'Issued', 'Due Date', 'Method', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-blue-600 font-semibold">{inv.id}</td>
                  <td className="px-5 py-3 text-xs text-slate-700 font-medium">{inv.vendor}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{inv.contract}</td>
                  <td className="px-5 py-3 text-xs font-bold text-slate-800">${inv.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{inv.issued}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{inv.due}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{inv.paymentMethod}</td>
                  <td className="px-5 py-3"><Badge status={inv.status} /></td>
                  <td className="px-5 py-3">
                    <button className="text-xs text-blue-600 hover:underline font-medium">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

