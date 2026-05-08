import { useState, useEffect } from 'react';
import {
  ShieldCheck, ClipboardCheck, CheckCircle2, Clock,
  AlertTriangle, Loader2, RefreshCw, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  Button, PageHeader, SectionCard,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell,
} from '../../components/ui';
import { getCompliancePageSummary } from '../../api/reports';
import { getAllCompliance } from '../../api/compliance';
import { getAllAudits } from '../../api/audits';
import { getDeliveriesByStatus } from '../../api/deliveries';
import { getServicesByStatus } from '../../api/services';
import toast from 'react-hot-toast';

const BREAKDOWN = [
  { status: 'PASSED',       label: 'Passed',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)'   },
  { status: 'FAILED',       label: 'Failed',        color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  { status: 'UNDER_REVIEW', label: 'Under Review',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  { status: 'PENDING',      label: 'Pending',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
];

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [loading,           setLoading]           = useState(true);
  const [summary,           setSummary]           = useState(null);
  const [compliance,        setCompliance]        = useState([]);
  const [audits,            setAudits]            = useState([]);
  const [markedDeliveries,  setMarkedDeliveries]  = useState([]);
  const [completedServices, setCompletedServices] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, c, a, md, cs] = await Promise.allSettled([
        getCompliancePageSummary(),
        getAllCompliance(),
        getAllAudits(),
        getDeliveriesByStatus('MARKED_DELIVERED'),
        getServicesByStatus('COMPLETED'),
      ]);
      const allCompliance = c.status === 'fulfilled' ? (c.value.data?.data || []) : [];
      const allMarkDel    = md.status === 'fulfilled' ? (md.value.data?.data || []) : [];
      const allCompleted  = cs.status === 'fulfilled' ? (cs.value.data?.data || []) : [];

      setSummary(s.status === 'fulfilled' ? s.value.data : null);
      setCompliance(allCompliance);
      setAudits(a.status === 'fulfilled' ? (a.value.data?.data || []) : []);

      const existingDeliveryCheckIds = new Set(
        allCompliance
          .filter(cr => cr.type === 'DELIVERY_CHECK' && ['PENDING', 'UNDER_REVIEW', 'PASSED'].includes(cr.status))
          .map(cr => Number(cr.referenceId ?? cr.contractId))
      );
      setMarkedDeliveries(allMarkDel.filter(d => !existingDeliveryCheckIds.has(d.deliveryId)));

      const existingServiceCheckIds = new Set(
        allCompliance
          .filter(cr => cr.type === 'SERVICE_CHECK' && ['PENDING', 'UNDER_REVIEW', 'PASSED'].includes(cr.status))
          .map(cr => Number(cr.referenceId ?? cr.contractId))
      );
      setCompletedServices(allCompleted.filter(sv => !existingServiceCheckIds.has(sv.serviceId)));
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openReviews    = compliance.filter(c => ['PENDING', 'UNDER_REVIEW'].includes(c.status));
  const passedWaived   = compliance.filter(c => ['PASSED', 'WAIVED'].includes(c.status));
  const upcomingAudits = audits.filter(a => ['SCHEDULED', 'IN_PROGRESS'].includes(a.status));
  const overallScore   = summary?.overallScore ?? 0;

  const kpis = [
    { label: 'Compliance Score',  value: `${overallScore}%`,        color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   icon: ShieldCheck    },
    { label: 'Open Reviews',      value: String(openReviews.length), color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: ClipboardCheck },
    { label: 'Passed / Waived',   value: String(passedWaived.length),color: '#14B8A6', bg: 'rgba(20,184,166,0.1)', icon: CheckCircle2   },
    { label: 'Upcoming Audits',   value: String(upcomingAudits.length),color:'#3b82f6', bg: 'rgba(59,130,246,0.1)',icon: Clock          },
  ];

  const breakdownCounts = Object.fromEntries(
    BREAKDOWN.map(b => [b.status, compliance.filter(c => c.status === b.status).length])
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading dashboard…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-6">
      <PageHeader
        title="Compliance Dashboard"
        subtitle={`${compliance.length} total records · ${openReviews.length} awaiting action`}
        actions={
          <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={fetchAll}>
            Refresh
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <StatCard key={i} label={kpi.label} value={kpi.value} color={kpi.color} bg={kpi.bg} icon={kpi.icon} />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Deliveries awaiting check */}
          <div className={`glass-card p-5 border-l-4 ${markedDeliveries.length > 0 ? 'border-amber-400' : 'border-green-400'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {markedDeliveries.length > 0
                  ? <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  : <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                }
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Deliveries Awaiting Compliance Check
                </h2>
                {markedDeliveries.length > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {markedDeliveries.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/compliance')}
                className="text-xs text-blue-500 hover:underline font-medium flex items-center gap-1"
              >
                Go to Compliance <ArrowRight size={11} />
              </button>
            </div>

            {markedDeliveries.length === 0 ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                All deliveries have compliance checks in place.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {markedDeliveries.map(d => (
                  <div
                    key={d.deliveryId}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-700/30"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Delivery #{d.deliveryId}
                      </p>
                      {d.contractId && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Contract #{d.contractId}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('/compliance')}
                      className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      Create Check <ArrowRight size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services awaiting check */}
          <div className={`glass-card p-5 border-l-4 ${completedServices.length > 0 ? 'border-amber-400' : 'border-green-400'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {completedServices.length > 0
                  ? <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  : <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                }
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Services Awaiting Compliance Check
                </h2>
                {completedServices.length > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {completedServices.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/compliance')}
                className="text-xs text-blue-500 hover:underline font-medium flex items-center gap-1"
              >
                Go to Compliance <ArrowRight size={11} />
              </button>
            </div>

            {completedServices.length === 0 ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                All completed services have compliance checks in place.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {completedServices.map(sv => (
                  <div
                    key={sv.serviceId}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-700/30"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Service #{sv.serviceId}
                      </p>
                      {sv.contractId && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Contract #{sv.contractId}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('/compliance')}
                      className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      Create Check <ArrowRight size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open reviews table */}
          <SectionCard
            title="Open Reviews"
            subtitle={`${openReviews.length} record${openReviews.length !== 1 ? 's' : ''} needing attention`}
            actions={
              <button
                onClick={() => navigate('/compliance')}
                className="text-xs text-blue-500 hover:underline font-medium flex items-center gap-1"
              >
                Go to Compliance <ArrowRight size={11} />
              </button>
            }
          >
            <div className="overflow-x-auto">
              <Table elevated={false}>
                <TableHead>
                  {['ID', 'Type', 'Reference ID', 'Date', 'Status'].map(h => (
                    <TableHeader key={h}>{h}</TableHeader>
                  ))}
                </TableHead>
                <TableBody>
                  {openReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 size={18} className="text-green-400" />
                          No open reviews — all records are up to date
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : openReviews.map(r => (
                    <TableRow key={r.complianceId}>
                      <TableCell className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        #{r.complianceId}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        {r.type?.replace(/_/g, ' ') || '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Ref #{r.contractId}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                        {r.date || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/compliance')}
                className="btn-primary w-full justify-center text-xs py-2.5"
              >
                <ShieldCheck size={14} /> Manage Compliance & Audits
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="btn-secondary w-full justify-center text-xs py-2.5"
              >
                View Notifications
              </button>
            </div>
          </div>

          {/* Upcoming audits */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Upcoming Audits</h2>
              {upcomingAudits.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {upcomingAudits.length}
                </span>
              )}
            </div>
            {upcomingAudits.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-4 text-slate-400">
                <CheckCircle2 size={18} className="text-green-400" />
                <p className="text-xs">No upcoming audits</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {upcomingAudits.map(a => (
                  <div
                    key={a.auditId}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                        {a.scope || `Audit #${a.auditId}`}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {a.date || '—'}
                      </p>
                    </div>
                    <Badge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance breakdown */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              Compliance Breakdown
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {BREAKDOWN.map(b => (
                <div
                  key={b.status}
                  className="flex flex-col items-center py-3 px-2 rounded-xl border"
                  style={{ background: b.bg, borderColor: `${b.color}30` }}
                >
                  <span className="text-xl font-bold" style={{ color: b.color }}>
                    {breakdownCounts[b.status] ?? 0}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 text-center leading-tight">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
