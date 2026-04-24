import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Plus, Loader2, RefreshCw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getAllCompliance, createCompliance, updateComplianceStatus } from '../../api/compliance';
import { getAllAudits, createAudit } from '../../api/audits';
import { getAllContracts } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// NOTE: Vendor compliance score (0-100) per vendor is not available from the backend.
//   Future endpoint needed:
//   GET /compliance/vendor-scores → { vendorId, vendorName, score, risk }[]
//   Until then, scores are derived from compliance record statuses.

const severityColors = { HIGH: '#EF4444', MEDIUM: '#F97316', LOW: '#22C55E', INFO: '#2563EB' };
const severityBg     = { HIGH: 'bg-red-50 border-red-100', MEDIUM: 'bg-orange-50 border-orange-100', LOW: 'bg-green-50 border-green-100', INFO: 'bg-blue-50 border-blue-100' };
const PIE_COLORS     = ['#22C55E', '#F59E0B', '#EF4444'];

const EMPTY_COMPLIANCE = { contractId: '', type: '', description: '', status: 'PENDING' };
const EMPTY_AUDIT      = { contractId: '', title: '', description: '', status: 'SCHEDULED' };

export default function ComplianceAudit() {
  const { user } = useAuth();
  const [compliance, setCompliance]   = useState([]);
  const [audits, setAudits]           = useState([]);
  const [contracts, setContracts]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreateC, setShowCreateC] = useState(false);
  const [showCreateA, setShowCreateA] = useState(false);
  const [formC, setFormC]             = useState(EMPTY_COMPLIANCE);
  const [formA, setFormA]             = useState(EMPTY_AUDIT);
  const [saving, setSaving]           = useState(false);

  const canManage = ['ADMIN', 'COMPLIANCE_OFFICER'].includes(user?.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, a, con] = await Promise.allSettled([getAllCompliance(), getAllAudits(), getAllContracts()]);
      setCompliance(c.status === 'fulfilled' ? (c.value.data?.data || []) : []);
      setAudits(a.status === 'fulfilled' ? (a.value.data?.data || []) : []);
      setContracts(con.status === 'fulfilled' ? (con.value.data?.data || []) : []);
    } catch { toast.error('Failed to load compliance data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Derived stats
  const compliant   = compliance.filter(c => c.status === 'COMPLIANT' || c.status === 'APPROVED').length;
  const nonCompliant= compliance.filter(c => c.status === 'NON_COMPLIANT' || c.status === 'REJECTED').length;
  const pending     = compliance.filter(c => c.status === 'PENDING').length;
  const total       = compliance.length || 1;
  const overallScore = Math.round((compliant / total) * 100);

  const pieData = [
    { name: 'Compliant', value: compliant },
    { name: 'Pending', value: pending },
    { name: 'Non-Compliant', value: nonCompliant },
  ];

  // High/Medium risk alerts from audits
  const highAlerts   = audits.filter(a => a.severity === 'HIGH' || a.riskLevel === 'HIGH');
  const mediumAlerts = audits.filter(a => a.severity === 'MEDIUM' || a.riskLevel === 'MEDIUM');

  const handleCreateCompliance = async () => {
    if (!formC.contractId) { toast.error('Contract is required'); return; }
    setSaving(true);
    try {
      await createCompliance({ contractId: Number(formC.contractId), type: formC.type, description: formC.description, status: formC.status });
      toast.success('Compliance record created');
      setShowCreateC(false); setFormC(EMPTY_COMPLIANCE); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCreateAudit = async () => {
    setSaving(true);
    try {
      await createAudit({ contractId: formA.contractId ? Number(formA.contractId) : undefined, title: formA.title, description: formA.description, status: formA.status });
      toast.success('Audit created');
      setShowCreateA(false); setFormA(EMPTY_AUDIT); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const setC = k => e => setFormC(p => ({ ...p, [k]: e.target.value }));
  const setA = k => e => setFormA(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading compliance data…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Compliance & Audit</h2>
          <p className="text-sm text-slate-400">{compliance.length} compliance records · {audits.length} audits</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RefreshCw size={13} /> Refresh</button>
          {canManage && (
            <>
              <button onClick={() => setShowCreateC(true)} className="btn-secondary text-xs"><Plus size={13} /> Compliance</button>
              <button onClick={() => setShowCreateA(true)} className="btn-primary text-xs"><Plus size={13} /> Audit</button>
            </>
          )}
        </div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall score */}
        <div className="glass-card p-5 flex flex-col items-center justify-center text-center">
          <div className="relative w-32 h-32 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ value: overallScore }, { value: 100 - overallScore }]} cx="50%" cy="50%"
                  innerRadius={42} outerRadius={54} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                  <Cell fill="#2563EB" />
                  <Cell fill="rgba(0,0,0,0.05)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-slate-800">{overallScore}%</p>
              <p className="text-[9px] text-slate-400 font-medium">OVERALL</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-700">Compliance Score</p>
          <p className="text-xs text-slate-400">Based on {compliance.length} records</p>
        </div>

        {/* Pie breakdown */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Status Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="glass-card px-2 py-1 text-xs"><p className="font-semibold">{payload[0].name}: {payload[0].value}</p></div>
                ) : null} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-xs text-slate-600">{d.name}</span>
                  <span className="text-xs font-bold text-slate-800 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance records quick view */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Compliance</h3>
          <div className="space-y-2.5 overflow-y-auto max-h-[160px]">
            {compliance.slice(0, 6).map(c => {
              const contract = contracts.find(co => co.contractId === c.contractId);
              return (
                <div key={c.complianceId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 truncate max-w-[130px]">{c.type || contract?.title || `#${c.contractId}` || '—'}</span>
                  <Badge status={c.status} />
                </div>
              );
            })}
            {compliance.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No compliance records</p>}
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      {(highAlerts.length > 0 || mediumAlerts.length > 0) && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" /> Active Risk Alerts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highAlerts.map(a => (
              <div key={a.auditId} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">{a.title || a.event || a.description || '—'}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">{a.createdAt?.slice(0, 16) || '—'}</p>
                </div>
              </div>
            ))}
            {mediumAlerts.map(a => (
              <div key={a.auditId} className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                <Clock size={14} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-orange-800">{a.title || a.event || a.description || '—'}</p>
                  <p className="text-[10px] text-orange-400 mt-0.5">{a.createdAt?.slice(0, 16) || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Audit Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                {['ID', 'Title / Description', 'Status', 'Severity', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No audit records found</td></tr>
              ) : audits.map(a => {
                const sev = (a.severity || a.riskLevel || 'INFO').toUpperCase();
                return (
                  <tr key={a.auditId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-slate-400">#{a.auditId}</td>
                    <td className="px-5 py-3 text-xs text-slate-700 max-w-xs">{a.title || a.description || '—'}</td>
                    <td className="px-5 py-3"><Badge status={a.status} /></td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityBg[sev] || 'bg-slate-100 border-slate-200'}`}
                        style={{ color: severityColors[sev] || '#64748b' }}>
                        {sev}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{a.createdAt?.slice(0, 10) || '—'}</td>
                    <td className="px-5 py-3">
                      {canManage && a.status !== 'COMPLETED' && (
                        <button onClick={async () => {
                          try { await updateComplianceStatus(a.auditId, 'COMPLETED'); toast.success('Marked complete'); fetchData(); }
                          catch { toast.error('Failed'); }
                        }} className="text-xs text-blue-600 hover:underline">Complete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Compliance Modal */}
      <Modal open={showCreateC} onClose={() => setShowCreateC(false)} title="Create Compliance Record">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract *</label>
            <select value={formC.contractId} onChange={setC('contractId')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
              <option value="">Select contract…</option>
              {contracts.map(c => <option key={c.contractId} value={c.contractId}>{c.title || `#${c.contractId}`}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Type</label>
            <input value={formC.type} onChange={setC('type')} placeholder="e.g. Safety, Environmental"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
            <textarea value={formC.description} onChange={setC('description')} rows={2}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => setShowCreateC(false)}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreateCompliance} disabled={saving}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Audit Modal */}
      <Modal open={showCreateA} onClose={() => setShowCreateA(false)} title="Create Audit">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract</label>
            <select value={formA.contractId} onChange={setA('contractId')}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
              <option value="">General (no specific contract)</option>
              {contracts.map(c => <option key={c.contractId} value={c.contractId}>{c.title || `#${c.contractId}`}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Title</label>
            <input value={formA.title} onChange={setA('title')} placeholder="Audit title"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
            <textarea value={formA.description} onChange={setA('description')} rows={2}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => setShowCreateA(false)}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreateAudit} disabled={saving}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'Create Audit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

