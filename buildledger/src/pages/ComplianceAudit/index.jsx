import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Plus, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getAllCompliance, createCompliance, updateComplianceStatus } from '../../api/compliance';
import { getAllAudits, createAudit, updateAuditStatus } from '../../api/audits';
import { getAllContracts } from '../../api/contracts';
import { getAllUsers } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Compliance statuses: PENDING, UNDER_REVIEW, PASSED, FAILED, WAIVED
// Audit statuses:      SCHEDULED, IN_PROGRESS, PENDING_REVIEW, COMPLETED, CANCELLED

const COMPLIANCE_TYPES = ['SAFETY', 'ENVIRONMENTAL', 'FINANCIAL', 'LEGAL', 'QUALITY', 'CONTRACT_TERMS', 'OTHER'];

const PIE_COLORS = ['#22C55E', '#F59E0B', '#EF4444'];

const COMPLIANCE_TRANSITIONS = {
  PENDING:      ['UNDER_REVIEW'],
  UNDER_REVIEW: ['PASSED', 'FAILED', 'WAIVED'],
  FAILED:       ['PENDING'],
  PASSED:       [],
  WAIVED:       [],
};

const COMPLIANCE_TRANSITION_LABELS = {
  UNDER_REVIEW: { label: 'Start Review',  color: '#2563EB' },
  PASSED:       { label: 'Mark Passed',   color: '#22C55E' },
  FAILED:       { label: 'Mark Failed',   color: '#EF4444' },
  WAIVED:       { label: 'Waive',         color: '#94a3b8' },
  PENDING:      { label: 'Re-open',       color: '#F59E0B' },
};

const AUDIT_TRANSITIONS = {
  SCHEDULED:      ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:    ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['COMPLETED', 'CANCELLED'],
  COMPLETED:      [],
  CANCELLED:      [],
};

const AUDIT_TRANSITION_LABELS = {
  IN_PROGRESS:    { label: 'Start Audit',    color: '#2563EB' },
  PENDING_REVIEW: { label: 'Submit Review',  color: '#F59E0B' },
  COMPLETED:      { label: 'Complete',       color: '#22C55E' },
  CANCELLED:      { label: 'Cancel',         color: '#EF4444' },
};

function showErrors(err) {
  const apiErrors = err.response?.data?.data;
  if (apiErrors && typeof apiErrors === 'object') {
    const msgs = Object.entries(apiErrors).map(([f, m]) => `${f}: ${m}`).join(' | ');
    toast.error(msgs);
  } else {
    toast.error(err.response?.data?.message || 'Request failed');
  }
}

function contractLabel(contracts, contractId) {
  const c = contracts.find(x => x.contractId === contractId);
  if (!c) return `#${contractId}`;
  return `${c.vendorName || 'Unknown'} — ${c.projectName || 'Unknown'} (#${contractId})`;
}

function ComplianceActions({ record, canManage, onTransition, loading }) {
  if (!canManage) return null;
  const nexts = COMPLIANCE_TRANSITIONS[record.status] || [];
  if (nexts.length === 0) return <span className="text-[10px] text-slate-400">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {nexts.map(next => {
        const cfg = COMPLIANCE_TRANSITION_LABELS[next];
        return (
          <button key={next} onClick={() => onTransition(record.complianceId, next)}
            disabled={loading[record.complianceId]}
            className="text-[10px] px-2 py-1 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: cfg.color }}>
            {loading[record.complianceId] ? <Loader2 size={9} className="animate-spin inline" /> : cfg.label}
          </button>
        );
      })}
    </div>
  );
}

function AuditActions({ audit, canManage, onTransition, loading }) {
  if (!canManage) return null;
  const nexts = AUDIT_TRANSITIONS[audit.status] || [];
  if (nexts.length === 0) return <span className="text-[10px] text-slate-400">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {nexts.map(next => {
        const cfg = AUDIT_TRANSITION_LABELS[next];
        return (
          <button key={next} onClick={() => onTransition(audit.auditId, next)}
            disabled={loading[audit.auditId]}
            className="text-[10px] px-2 py-1 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: cfg.color }}>
            {loading[audit.auditId] ? <Loader2 size={9} className="animate-spin inline" /> : cfg.label}
          </button>
        );
      })}
    </div>
  );
}

const EMPTY_COMPLIANCE = { contractId: '', type: '', result: '', date: '', notes: '' };
const EMPTY_AUDIT      = { complianceOfficerId: '', scope: '', findings: '', date: '' };

export default function ComplianceAudit() {
  const { user } = useAuth();
  const [compliance, setCompliance]   = useState([]);
  const [audits, setAudits]           = useState([]);
  const [contracts, setContracts]     = useState([]);
  const [officers, setOfficers]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreateC, setShowCreateC] = useState(false);
  const [showCreateA, setShowCreateA] = useState(false);
  const [formC, setFormC]             = useState(EMPTY_COMPLIANCE);
  const [formA, setFormA]             = useState(EMPTY_AUDIT);
  const [saving, setSaving]           = useState(false);
  const [cLoading, setCLoading]       = useState({});
  const [aLoading, setALoading]       = useState({});
  const [cErrors, setCErrors] = useState({});
  const [aErrors, setAErrors] = useState({});

  const canManage = ['ADMIN', 'COMPLIANCE_OFFICER'].includes(user?.role);
  const today     = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, a, con, usr] = await Promise.allSettled([
        getAllCompliance(), getAllAudits(), getAllContracts(), getAllUsers()
      ]);
      setCompliance(c.status === 'fulfilled' ? (c.value.data?.data || []) : []);
      setAudits(a.status === 'fulfilled'     ? (a.value.data?.data || []) : []);
      setContracts(con.status === 'fulfilled' ? (con.value.data?.data || []) : []);
      if (usr.status === 'fulfilled') {
        const allUsers = usr.value.data?.data || usr.value.data || [];
        setOfficers(allUsers.filter(u => u.role === 'COMPLIANCE_OFFICER' || u.role === 'ADMIN'));
      }
    } catch { toast.error('Failed to load compliance data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Derived stats — backend status values: PENDING, UNDER_REVIEW, PASSED, FAILED, WAIVED
  const compliant    = compliance.filter(c => c.status === 'PASSED' || c.status === 'WAIVED').length;
  const nonCompliant = compliance.filter(c => c.status === 'FAILED').length;
  const pending      = compliance.filter(c => c.status === 'PENDING' || c.status === 'UNDER_REVIEW').length;
  const total        = compliance.length || 1;
  const overallScore = Math.round((compliant / total) * 100);

  const pieData = [
    { name: 'Passed / Waived', value: compliant },
    { name: 'Pending / Review', value: pending },
    { name: 'Failed',           value: nonCompliant },
  ];

  const handleCreateCompliance = async () => {
    const e = {};
    if (!formC.contractId) e.contractId = 'Please select a contract';
    if (!formC.type)       e.type       = 'Compliance type is required';
    if (!formC.date)       e.date       = 'Date is required';
    setCErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createCompliance({
        contractId: Number(formC.contractId),
        type:       formC.type,
        result:     formC.result || undefined,
        date:       formC.date,
        notes:      formC.notes || undefined,
      });
      toast.success('Compliance record created');
      setShowCreateC(false);
      setFormC(EMPTY_COMPLIANCE);
      setCErrors({});
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleCreateAudit = async () => {
    const e = {};
    if (!formA.complianceOfficerId)                       e.complianceOfficerId = 'Please select an officer';
    if (!formA.scope || formA.scope.trim().length < 5)    e.scope               = 'Scope must be at least 5 characters';
    if (!formA.date)                                      e.date                = 'Scheduled date is required';
    setAErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createAudit({
        complianceOfficerId: Number(formA.complianceOfficerId),
        scope:               formA.scope,
        findings:            formA.findings || undefined,
        date:                formA.date,
      });
      toast.success('Audit scheduled');
      setShowCreateA(false);
      setFormA(EMPTY_AUDIT);
      setAErrors({});
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleComplianceTransition = async (id, nextStatus) => {
    setCLoading(p => ({ ...p, [id]: true }));
    try {
      await updateComplianceStatus(id, nextStatus);
      toast.success(`Compliance → ${nextStatus}`);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setCLoading(p => ({ ...p, [id]: false })); }
  };

  const handleAuditTransition = async (id, nextStatus) => {
    setALoading(p => ({ ...p, [id]: true }));
    try {
      await updateAuditStatus(id, nextStatus);
      toast.success(`Audit → ${nextStatus}`);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setALoading(p => ({ ...p, [id]: false })); }
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
      <div className="flex items-center justify-between flex-wrap gap-3">
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

      {/* Overview row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall score */}
        <div className="glass-card p-5 flex flex-col items-center justify-center text-center">
          <div className="relative w-32 h-32 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ value: overallScore }, { value: 100 - overallScore }]}
                  cx="50%" cy="50%" innerRadius={42} outerRadius={54} startAngle={90} endAngle={-270}
                  dataKey="value" strokeWidth={0}>
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
          <p className="text-xs text-slate-400">Based on {compliance.length} record{compliance.length !== 1 ? 's' : ''}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 w-full text-center text-xs">
            <div className="bg-green-50 rounded-xl p-2"><p className="font-bold text-green-700">{compliant}</p><p className="text-slate-400 text-[9px]">Passed</p></div>
            <div className="bg-amber-50 rounded-xl p-2"><p className="font-bold text-amber-700">{pending}</p><p className="text-slate-400 text-[9px]">Pending</p></div>
            <div className="bg-red-50 rounded-xl p-2"><p className="font-bold text-red-700">{nonCompliant}</p><p className="text-slate-400 text-[9px]">Failed</p></div>
          </div>
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

        {/* Recent compliance */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Compliance</h3>
          <div className="space-y-2.5 overflow-y-auto max-h-[180px]">
            {compliance.slice(0, 6).map(c => (
              <div key={c.complianceId} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate max-w-[130px]">{c.type || contractLabel(contracts, c.contractId)}</span>
                <Badge status={c.status} />
              </div>
            ))}
            {compliance.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No compliance records</p>}
          </div>
        </div>
      </div>

      {/* Compliance Records Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Compliance Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                {['ID', 'Contract', 'Type', 'Result', 'Date', 'Status', canManage ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compliance.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No compliance records found</td></tr>
              ) : compliance.map(c => (
                <tr key={c.complianceId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">#{c.complianceId}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px]">
                    <span className="truncate block">{contractLabel(contracts, c.contractId)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{c.type || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[120px]">
                    <span className="truncate block">{c.result || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.date || '—'}</td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <ComplianceActions record={c} canManage={canManage}
                        onTransition={handleComplianceTransition} loading={cLoading} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Records Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Audit Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                {['ID', 'Scope', 'Officer', 'Scheduled', 'Status', canManage ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No audit records found</td></tr>
              ) : audits.map(a => (
                <tr key={a.auditId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">#{a.auditId}</td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-[200px]">
                    <p className="truncate">{a.scope || '—'}</p>
                    {a.findings && <p className="text-[10px] text-slate-400 truncate">{a.findings}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{a.officerName || `#${a.complianceOfficerId}` || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{a.date || '—'}</td>
                  <td className="px-4 py-3"><Badge status={a.status} /></td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <AuditActions audit={a} canManage={canManage}
                        onTransition={handleAuditTransition} loading={aLoading} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Compliance Modal */}
      <Modal open={showCreateC} onClose={() => { setShowCreateC(false); setFormC(EMPTY_COMPLIANCE); setCErrors({}); }} title="Create Compliance Record">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract *</label>
            <select value={formC.contractId} onChange={e => { setC('contractId')(e); if (e.target.value) setCErrors(p => ({ ...p, contractId: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${cErrors.contractId ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <option value="">Select contract…</option>
              {contracts.map(c => (
                <option key={c.contractId} value={c.contractId}>
                  {c.vendorName || 'Unknown'} — {c.projectName || 'Unknown'} (#{c.contractId})
                </option>
              ))}
            </select>
            {cErrors.contractId && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{cErrors.contractId}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Compliance Type *</label>
            <select value={formC.type} onChange={e => { setC('type')(e); if (e.target.value) setCErrors(p => ({ ...p, type: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${cErrors.type ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <option value="">Select type…</option>
              {COMPLIANCE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            {cErrors.type && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{cErrors.type}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Date * <span className="text-slate-400 font-normal">(today or earlier)</span>
            </label>
            <input type="date" max={today} value={formC.date} onChange={e => { setC('date')(e); if (e.target.value) setCErrors(p => ({ ...p, date: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${cErrors.date ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
            {cErrors.date && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{cErrors.date}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Result <span className="text-slate-400 font-normal">(max 200 chars)</span></label>
            <input value={formC.result} onChange={setC('result')} maxLength={200} placeholder="Compliance check outcome…"
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Notes</label>
            <textarea value={formC.notes} onChange={setC('notes')} rows={2} maxLength={1000}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none transition-all" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowCreateC(false); setFormC(EMPTY_COMPLIANCE); setCErrors({}); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreateCompliance} disabled={saving}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Audit Modal */}
      <Modal open={showCreateA} onClose={() => { setShowCreateA(false); setFormA(EMPTY_AUDIT); setAErrors({}); }} title="Schedule Audit">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Compliance Officer *</label>
            <select value={formA.complianceOfficerId} onChange={e => { setA('complianceOfficerId')(e); if (e.target.value) setAErrors(p => ({ ...p, complianceOfficerId: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${aErrors.complianceOfficerId ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
              <option value="">Select officer…</option>
              {officers.map(o => (
                <option key={o.userId} value={o.userId}>{o.name || o.username} ({o.role})</option>
              ))}
            </select>
            {aErrors.complianceOfficerId
              ? <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{aErrors.complianceOfficerId}</p>
              : officers.length === 0 && <p className="text-xs text-amber-500 mt-1">No compliance officers found.</p>
            }
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Scope * <span className="text-slate-400 font-normal">(min 5 chars, max 300)</span></label>
            <textarea value={formA.scope} onChange={e => { setA('scope')(e); if (e.target.value.trim().length >= 5) setAErrors(p => ({ ...p, scope: '' })); }} rows={3} maxLength={300}
              placeholder="Describe what this audit covers…"
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none transition-all ${aErrors.scope ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
            {aErrors.scope && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{aErrors.scope}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Scheduled Date * <span className="text-slate-400 font-normal">(today or future)</span>
            </label>
            <input type="date" min={today} value={formA.date} onChange={e => { setA('date')(e); if (e.target.value) setAErrors(p => ({ ...p, date: '' })); }}
              className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${aErrors.date ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
            {aErrors.date && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{aErrors.date}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Initial Findings <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={formA.findings} onChange={setA('findings')} rows={2} maxLength={2000}
              className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 resize-none transition-all" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => { setShowCreateA(false); setFormA(EMPTY_AUDIT); setAErrors({}); }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleCreateAudit} disabled={saving}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'Schedule Audit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
