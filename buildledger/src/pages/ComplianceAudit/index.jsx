import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Plus, Loader2, RefreshCw, Search, Eye } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import {
  Button, FormInput, FormSelect, FormTextarea, PageHeader, SectionCard,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell,
} from '../../components/ui';
import { getAllCompliance, createCompliance, updateComplianceStatus } from '../../api/compliance';
import { getAllAudits, createAudit, updateAuditStatus } from '../../api/audits';
import { getAllUsers } from '../../api/users';
import { getCompliancePageSummary } from '../../api/reports';
import { getDeliveriesByStatus } from '../../api/deliveries';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const COMPLIANCE_TYPES = ['DELIVERY_CHECK', 'SERVICE_CHECK', 'INVOICE_CHECK', 'DOCUMENT_CHECK'];

const REFERENCE_ID_HINT = {
  DELIVERY_CHECK: 'Delivery must be in MARKED_DELIVERED status',
  SERVICE_CHECK:  'Service must be in COMPLETED status',
  INVOICE_CHECK:  'Invoice must be in UNDER_REVIEW status',
  DOCUMENT_CHECK: 'Enter the Document ID this check applies to',
};
const PIE_COLORS       = ['#22C55E', '#F59E0B', '#EF4444'];

const COMPLIANCE_TRANSITIONS = {
  PENDING:      ['UNDER_REVIEW'],
  UNDER_REVIEW: ['PASSED', 'FAILED', 'WAIVED'],
  FAILED:       ['PENDING'],
  PASSED:       [], WAIVED: [],
};
const COMPLIANCE_TRANSITION_LABELS = {
  UNDER_REVIEW: { label: 'Start Review', color: '#3b82f6' },
  PASSED:       { label: 'Mark Passed',  color: '#22C55E' },
  FAILED:       { label: 'Mark Failed',  color: '#EF4444' },
  WAIVED:       { label: 'Waive',        color: '#94a3b8' },
  PENDING:      { label: 'Re-open',      color: '#F59E0B' },
};
const AUDIT_TRANSITIONS = {
  SCHEDULED:      ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:    ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], CANCELLED: [],
};
const AUDIT_TRANSITION_LABELS = {
  IN_PROGRESS:    { label: 'Start Audit',   color: '#3b82f6' },
  PENDING_REVIEW: { label: 'Submit Review', color: '#F59E0B' },
  COMPLETED:      { label: 'Complete',      color: '#22C55E' },
  CANCELLED:      { label: 'Cancel',        color: '#EF4444' },
};

function showErrors(err) {
  const apiErrors = err.response?.data?.data;
  if (apiErrors && typeof apiErrors === 'object') {
    toast.error(Object.entries(apiErrors).map(([f, m]) => `${f}: ${m}`).join(' | '));
  } else {
    toast.error(err.response?.data?.message || 'Request failed');
  }
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
            className="text-[10px] px-2 py-1 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity"
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
            className="text-[10px] px-2 py-1 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: cfg.color }}>
            {loading[audit.auditId] ? <Loader2 size={9} className="animate-spin inline" /> : cfg.label}
          </button>
        );
      })}
    </div>
  );
}

const EMPTY_COMPLIANCE = { contractId: '', type: '', date: '', notes: '' };
const EMPTY_AUDIT      = { complianceOfficerId: '', scope: '', findings: '', date: '' };

export default function ComplianceAudit() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [compliance, setCompliance]           = useState([]);
  const [audits, setAudits]                   = useState([]);
  const [officers, setOfficers]               = useState([]);
  const [complianceSummary, setComplianceSummary] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showCreateC, setShowCreateC] = useState(false);
  const [showCreateA, setShowCreateA] = useState(false);
  const [formC, setFormC]             = useState(EMPTY_COMPLIANCE);
  const [formA, setFormA]             = useState(EMPTY_AUDIT);
  const [saving, setSaving]           = useState(false);
  const [cLoading, setCLoading]       = useState({});
  const [aLoading, setALoading]       = useState({});
  const [cErrors, setCErrors]         = useState({});
  const [aErrors, setAErrors]         = useState({});
  const [markedDeliveries, setMarkedDeliveries] = useState([]);
  const [showFailModal,    setShowFailModal]    = useState(false);
  const [pendingFailId,    setPendingFailId]    = useState(null);
  const [failRemarks,      setFailRemarks]      = useState('');
  const [savingFail,       setSavingFail]       = useState(false);
  const [showPassModal,    setShowPassModal]    = useState(false);
  const [pendingPassId,    setPendingPassId]    = useState(null);
  const [passNotes,        setPassNotes]        = useState('');
  const [savingPass,       setSavingPass]       = useState(false);
  const [referenceIdLocked, setReferenceIdLocked] = useState(false);
  const [complianceSearch,  setComplianceSearch]  = useState('');
  const [selectedCompliance, setSelectedCompliance] = useState(null);

  const canManage = ['ADMIN', 'COMPLIANCE_OFFICER'].includes(user?.role);
  const today     = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, a, usr, sum, md] = await Promise.allSettled([
        getAllCompliance(), getAllAudits(), getAllUsers(), getCompliancePageSummary(),
        getDeliveriesByStatus('MARKED_DELIVERED'),
      ]);
      const allCompliance   = c.status  === 'fulfilled' ? (c.value.data?.data  || []) : [];
      const allMarkDel      = md.status === 'fulfilled' ? (md.value.data?.data || []) : [];
      setCompliance(allCompliance);
      setAudits(a.status === 'fulfilled'    ? (a.value.data?.data || []) : []);
      setComplianceSummary(sum.status === 'fulfilled' ? sum.value.data : null);
      const existingCheckIds = new Set(
        allCompliance
          .filter(cr => cr.type === 'DELIVERY_CHECK' && ['PENDING', 'UNDER_REVIEW', 'PASSED'].includes(cr.status))
          .map(cr => Number(cr.referenceId ?? cr.contractId))
      );
      setMarkedDeliveries(allMarkDel.filter(d => !existingCheckIds.has(d.deliveryId)));
      if (usr.status === 'fulfilled') {
        const allUsers = usr.value.data?.data || usr.value.data || [];
        setOfficers(allUsers.filter(u => u.role === 'COMPLIANCE_OFFICER' || u.role === 'ADMIN'));
      }
    } catch { toast.error('Failed to load compliance data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const compliant    = complianceSummary?.compliant    ?? 0;
  const nonCompliant = complianceSummary?.nonCompliant ?? 0;
  const pending      = complianceSummary?.pending      ?? 0;
  const overallScore = complianceSummary?.overallScore ?? 0;

  const pieData = complianceSummary?.pieChartData ?? [
    { name: 'Passed / Waived', value: 0 },
    { name: 'Pending / Review', value: 0 },
    { name: 'Failed',           value: 0 },
  ];

  const handleCreateCompliance = async () => {
    const e = {};
    if (!formC.contractId)                            e.contractId = 'Reference ID is required';
    if (!formC.type)                                  e.type       = 'Compliance type is required';
    if (!formC.date)                                  e.date       = 'Date is required';
    if (!formC.notes || formC.notes.trim().length < 10) e.notes    = 'Notes are required (min 10 characters)';
    setCErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createCompliance({ contractId: Number(formC.contractId), type: formC.type, date: formC.date, notes: formC.notes.trim() });
      toast.success('Compliance record created');
      closeCreateModal(); fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleCreateAudit = async () => {
    const e = {};
    if (!formA.complianceOfficerId)                    e.complianceOfficerId = 'Please select an officer';
    if (!formA.scope || formA.scope.trim().length < 5) e.scope               = 'Scope must be at least 5 characters';
    if (!formA.date)                                   e.date                = 'Scheduled date is required';
    setAErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createAudit({ complianceOfficerId: Number(formA.complianceOfficerId), scope: formA.scope, findings: formA.findings || undefined, date: formA.date });
      toast.success('Audit scheduled');
      setShowCreateA(false); setFormA(EMPTY_AUDIT); setAErrors({}); fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleComplianceTransition = async (id, nextStatus) => {
    if (nextStatus === 'FAILED') {
      setPendingFailId(id);
      setFailRemarks('');
      setShowFailModal(true);
      return;
    }
    if (nextStatus === 'PASSED') {
      setPendingPassId(id);
      setPassNotes('');
      setShowPassModal(true);
      return;
    }
    setCLoading(p => ({ ...p, [id]: true }));
    try { await updateComplianceStatus(id, nextStatus); toast.success(`Compliance → ${nextStatus}`); fetchData(); }
    catch (err) { showErrors(err); }
    finally { setCLoading(p => ({ ...p, [id]: false })); }
  };

  const handleConfirmFail = async () => {
    if (!failRemarks.trim()) { toast.error('Remarks are required when marking as FAILED'); return; }
    setSavingFail(true);
    setCLoading(p => ({ ...p, [pendingFailId]: true }));
    try {
      await updateComplianceStatus(pendingFailId, 'FAILED', failRemarks.trim());
      toast.success('Compliance → FAILED');
      setShowFailModal(false); setPendingFailId(null); setFailRemarks('');
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSavingFail(false); setCLoading(p => ({ ...p, [pendingFailId]: false })); }
  };

  const handleConfirmPass = async () => {
    if (!passNotes.trim() || passNotes.trim().length < 10) { toast.error('Notes are required (min 10 characters)'); return; }
    setSavingPass(true);
    setCLoading(p => ({ ...p, [pendingPassId]: true }));
    try {
      await updateComplianceStatus(pendingPassId, 'PASSED', passNotes.trim());
      toast.success('Compliance → PASSED');
      setShowPassModal(false); setPendingPassId(null); setPassNotes('');
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSavingPass(false); setCLoading(p => ({ ...p, [pendingPassId]: false })); }
  };

  const openCreateForDelivery = (deliveryId) => {
    setFormC({ ...EMPTY_COMPLIANCE, type: 'DELIVERY_CHECK', contractId: String(deliveryId) });
    setCErrors({});
    setReferenceIdLocked(true);
    setShowCreateC(true);
  };

  const closeCreateModal = () => {
    setShowCreateC(false);
    setFormC(EMPTY_COMPLIANCE);
    setCErrors({});
    setReferenceIdLocked(false);
  };

  const handleAuditTransition = async (id, nextStatus) => {
    setALoading(p => ({ ...p, [id]: true }));
    try { await updateAuditStatus(id, nextStatus); toast.success(`Audit → ${nextStatus}`); fetchData(); }
    catch (err) { showErrors(err); }
    finally { setALoading(p => ({ ...p, [id]: false })); }
  };

  const setC = k => e => setFormC(p => ({ ...p, [k]: e.target.value }));
  const setA = k => e => setFormA(p => ({ ...p, [k]: e.target.value }));

  const pieTrack = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading compliance data…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="Compliance & Audit"
        subtitle={`${compliance.length} compliance records · ${audits.length} audits`}
        actions={
          <>
            <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={fetchData}>Refresh</Button>
            {canManage && (
              <>
                <Button variant="secondary" size="xs" icon={<Plus size={13} />} onClick={() => setShowCreateC(true)}>Compliance</Button>
                <Button variant="primary" size="xs" icon={<Plus size={13} />} onClick={() => setShowCreateA(true)}>Audit</Button>
              </>
            )}
          </>
        }
      />

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
                  <Cell fill="#3b82f6" />
                  <Cell fill={pieTrack} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{overallScore}%</p>
              <p className="text-[9px] text-slate-400 font-medium">OVERALL</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compliance Score</p>
          <p className="text-xs text-slate-400">Based on {compliance.length} record{compliance.length !== 1 ? 's' : ''}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 w-full text-center text-xs">
            <div className="rounded-xl p-2 bg-green-50 dark:bg-green-900/20 border border-transparent dark:border-green-700/25">
              <p className="font-bold text-green-700 dark:text-green-400">{compliant}</p>
              <p className="text-slate-400 text-[9px]">Passed</p>
            </div>
            <div className="rounded-xl p-2 bg-amber-50 dark:bg-amber-900/20 border border-transparent dark:border-amber-700/25">
              <p className="font-bold text-amber-700 dark:text-amber-400">{pending}</p>
              <p className="text-slate-400 text-[9px]">Pending</p>
            </div>
            <div className="rounded-xl p-2 bg-red-50 dark:bg-red-900/20 border border-transparent dark:border-red-700/25">
              <p className="font-bold text-red-700 dark:text-red-400">{nonCompliant}</p>
              <p className="text-slate-400 text-[9px]">Failed</p>
            </div>
          </div>
        </div>

        {/* Pie breakdown */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Status Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="glass-card px-2 py-1 text-xs">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{payload[0].name}: {payload[0].value}</p>
                  </div>
                ) : null} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{d.name}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent compliance */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Recent Compliance</h3>
          <div className="space-y-2.5 overflow-y-auto max-h-[180px]">
            {compliance.slice(0, 6).map(c => (
              <div key={c.complianceId} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[130px]">{c.type || `Ref #${c.contractId}`}</span>
                <Badge status={c.status} />
              </div>
            ))}
            {compliance.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No compliance records</p>}
          </div>
        </div>
      </div>

      {/* Deliveries Awaiting Compliance */}
      {canManage && markedDeliveries.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              Deliveries Awaiting Compliance Check
              <span className="ml-1 text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                {markedDeliveries.length}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">These deliveries are MARKED_DELIVERED and need a DELIVERY_CHECK before a PM can accept them.</p>
          </div>
          <div className="space-y-2">
            {markedDeliveries.map(d => (
              <div key={d.deliveryId} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                <div>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">Delivery #{d.deliveryId}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">{d.item || d.description || '—'}</p>
                  <p className="text-[10px] text-slate-400">Contract #{d.contractId}{d.date ? ` · ${d.date}` : ''}</p>
                </div>
                <button
                  onClick={() => openCreateForDelivery(d.deliveryId)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
                >
                  + Create Check
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Records Table */}
      <SectionCard
        title="Compliance Records"
        subtitle={`${compliance.length} total${complianceSearch ? ` · ${compliance.filter(c => String(c.complianceId).includes(complianceSearch.trim())).length} matching` : ''}`}
        actions={
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 bg-white/60 border border-white/80 dark:bg-slate-800/50 dark:border-slate-600/40 shadow-sm">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              value={complianceSearch}
              onChange={e => setComplianceSearch(e.target.value)}
              placeholder="Search by ID…"
              className="bg-transparent text-xs outline-none w-32 text-slate-600 placeholder-slate-400 dark:text-slate-200 dark:placeholder-slate-500"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table elevated={false}>
            <TableHead>
              {['ID', 'Reference ID', 'Type', 'Date', 'Status', '', canManage ? 'Actions' : ''].filter(Boolean).map(h => (
                <TableHeader key={h}>{h}</TableHeader>
              ))}
            </TableHead>
            <TableBody>
              {(() => {
                const filtered = complianceSearch.trim()
                  ? compliance.filter(c => String(c.complianceId).includes(complianceSearch.trim()))
                  : compliance;
                if (filtered.length === 0) return (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-400">
                      {complianceSearch ? `No compliance record found with ID "${complianceSearch}"` : 'No compliance records found'}
                    </TableCell>
                  </TableRow>
                );
                return filtered.map(c => (
                  <TableRow key={c.complianceId}>
                    <TableCell className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{c.complianceId}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400">Ref #{c.contractId}</TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-200">{c.type?.replace(/_/g, ' ') || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">{c.date || '—'}</TableCell>
                    <TableCell><Badge status={c.status} /></TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedCompliance(c)}
                        className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Eye size={11} /> View
                      </button>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <ComplianceActions record={c} canManage={canManage} onTransition={handleComplianceTransition} loading={cLoading} />
                      </TableCell>
                    )}
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Compliance Detail Modal */}
      <Modal
        open={selectedCompliance !== null}
        onClose={() => setSelectedCompliance(null)}
        title={`Compliance Record #${selectedCompliance?.complianceId}`}
      >
        {selectedCompliance && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-700/30">
                {selectedCompliance.type?.replace(/_/g, ' ')}
              </span>
              <Badge status={selectedCompliance.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Compliance ID',  `#${selectedCompliance.complianceId}`],
                ['Reference ID',   `Ref #${selectedCompliance.contractId}`],
                ['Date',           selectedCompliance.date || '—'],
                ['Status',         selectedCompliance.status || '—'],
                ['Created At',     selectedCompliance.createdAt?.slice(0, 10) || '—'],
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{value}</p>
                </div>
              ))}
            </div>
            {selectedCompliance.notes && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes / Findings</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{selectedCompliance.notes}</p>
              </div>
            )}
            {!selectedCompliance.notes && (
              <p className="text-xs text-slate-400 italic text-center py-2">No notes or findings recorded.</p>
            )}
            <div className="flex justify-end pt-1">
              <Button variant="secondary" size="xs" onClick={() => setSelectedCompliance(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Audit Records Table */}
      <SectionCard title="Audit Records">
        <div className="overflow-x-auto">
          <Table elevated={false}>
            <TableHead>
              {['ID', 'Scope', 'Officer', 'Scheduled', 'Status', canManage ? 'Actions' : ''].filter(Boolean).map(h => (
                <TableHeader key={h}>{h}</TableHeader>
              ))}
            </TableHead>
            <TableBody>
              {audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400">No audit records found</TableCell>
                </TableRow>
              ) : audits.map(a => (
                <TableRow key={a.auditId}>
                  <TableCell className="text-xs font-mono text-slate-400">#{a.auditId}</TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-200 max-w-[200px]">
                    <p className="truncate">{a.scope || '—'}</p>
                    {a.findings && <p className="text-[10px] text-slate-400 truncate">{a.findings}</p>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{a.officerName || `#${a.complianceOfficerId}` || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-400 whitespace-nowrap">{a.date || '—'}</TableCell>
                  <TableCell><Badge status={a.status} /></TableCell>
                  {canManage && (
                    <TableCell>
                      <AuditActions audit={a} canManage={canManage} onTransition={handleAuditTransition} loading={aLoading} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Create Compliance Modal */}
      <Modal open={showCreateC} onClose={closeCreateModal} title="Create Compliance Record">
        <div className="space-y-4">
          <FormSelect
            label="Compliance Type"
            required
            value={formC.type}
            onChange={e => {
              setFormC(p => ({ ...p, type: e.target.value, contractId: '' }));
              if (e.target.value) setCErrors(p => ({ ...p, type: '', contractId: '' }));
            }}
            error={cErrors.type}
            disabled={referenceIdLocked}
          >
            <option value="">Select type…</option>
            {COMPLIANCE_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </FormSelect>

          <div>
            <FormInput
              label="Reference ID"
              required
              type="number"
              min="1"
              hint={referenceIdLocked ? undefined : (REFERENCE_ID_HINT[formC.type] || 'Enter the ID of the entity this check applies to')}
              value={formC.contractId}
              onChange={e => { if (referenceIdLocked) return; setC('contractId')(e); if (e.target.value) setCErrors(p => ({ ...p, contractId: '' })); }}
              error={cErrors.contractId}
              placeholder="e.g. 42"
              disabled={referenceIdLocked}
            />
            {referenceIdLocked && (
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <span>🔒</span> Auto-filled from selected delivery — cannot be changed
              </p>
            )}
          </div>
          <FormInput
            label="Date"
            required
            type="date"
            min={today}
            value={formC.date}
            onChange={e => { setC('date')(e); if (e.target.value) setCErrors(p => ({ ...p, date: '' })); }}
            error={cErrors.date}
          />
          <FormTextarea
            label="Notes"
            required
            value={formC.notes}
            onChange={e => { setC('notes')(e); if (e.target.value.trim().length >= 10) setCErrors(p => ({ ...p, notes: '' })); }}
            error={cErrors.notes}
            rows={3}
            placeholder="Min 10 characters — describe the compliance findings…"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={closeCreateModal}>Cancel</Button>
            <Button variant="primary" size="xs" onClick={handleCreateCompliance} loading={saving}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Mark Failed — Remarks Modal */}
      <Modal
        open={showFailModal}
        onClose={() => { setShowFailModal(false); setPendingFailId(null); setFailRemarks(''); }}
        title={`Mark Compliance #${pendingFailId} as FAILED`}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-700/40">
            <p className="text-xs text-red-700 dark:text-red-400">
              Remarks are <strong>required</strong> when marking a compliance record as FAILED. They will be stored in the notes field.
            </p>
          </div>
          <FormTextarea
            label="Failure Remarks"
            required
            value={failRemarks}
            onChange={e => setFailRemarks(e.target.value)}
            rows={3}
            placeholder="Describe why this compliance check failed…"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setShowFailModal(false); setPendingFailId(null); setFailRemarks(''); }}>
              Cancel
            </Button>
            <Button variant="danger" size="xs" onClick={handleConfirmFail} loading={savingFail}>
              Confirm Failure
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mark Passed — Notes Modal */}
      <Modal
        open={showPassModal}
        onClose={() => { setShowPassModal(false); setPendingPassId(null); setPassNotes(''); }}
        title="Pass Compliance Check"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-700/40">
            <p className="text-xs text-green-700 dark:text-green-400">
              Notes are <strong>required</strong> (min 10 characters) when marking a compliance record as PASSED.
            </p>
          </div>
          <FormTextarea
            label="Pass Notes"
            required
            value={passNotes}
            onChange={e => setPassNotes(e.target.value)}
            rows={3}
            placeholder="Add notes about why this compliance check is being passed..."
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setShowPassModal(false); setPendingPassId(null); setPassNotes(''); }}>
              Cancel
            </Button>
            <Button variant="primary" size="xs" onClick={handleConfirmPass} loading={savingPass}
              className="!bg-green-600 hover:!bg-green-700">
              Mark as Passed
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Audit Modal */}
      <Modal open={showCreateA} onClose={() => { setShowCreateA(false); setFormA(EMPTY_AUDIT); setAErrors({}); }} title="Schedule Audit">
        <div className="space-y-4">
          <FormSelect
            label="Compliance Officer"
            required
            value={formA.complianceOfficerId}
            onChange={e => { setA('complianceOfficerId')(e); if (e.target.value) setAErrors(p => ({ ...p, complianceOfficerId: '' })); }}
            error={aErrors.complianceOfficerId}
            hint={officers.length === 0 ? 'No compliance officers found.' : ''}
          >
            <option value="">Select officer…</option>
            {officers.map(o => <option key={o.userId} value={o.userId}>{o.name || o.username} ({o.role})</option>)}
          </FormSelect>
          <FormTextarea
            label="Scope"
            required
            hint="(min 5 chars)"
            value={formA.scope}
            onChange={e => { setA('scope')(e); if (e.target.value.trim().length >= 5) setAErrors(p => ({ ...p, scope: '' })); }}
            rows={3}
            placeholder="Describe what this audit covers…"
            error={aErrors.scope}
          />
          <FormInput
            label="Scheduled Date"
            required
            type="date"
            min={today}
            value={formA.date}
            onChange={e => { setA('date')(e); if (e.target.value) setAErrors(p => ({ ...p, date: '' })); }}
            error={aErrors.date}
          />
          <FormTextarea label="Initial Findings" hint="(optional)" value={formA.findings} onChange={setA('findings')} rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setShowCreateA(false); setFormA(EMPTY_AUDIT); setAErrors({}); }}>Cancel</Button>
            <Button variant="primary" size="xs" onClick={handleCreateAudit} loading={saving}>Schedule Audit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
