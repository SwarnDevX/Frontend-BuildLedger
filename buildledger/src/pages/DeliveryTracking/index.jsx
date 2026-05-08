import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Truck, Package, RotateCcw, Calendar, Loader2, Plus, Wrench } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import {
  Button, FormInput, FormSelect, FormTextarea, FilterPills, PageHeader,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell,
} from '../../components/ui';
import { getAllDeliveries, createDelivery, updateDeliveryStatus } from '../../api/deliveries';
import { getAllServices, createService, updateServiceStatus } from '../../api/services';
import { getAllContracts, getContractsByVendor } from '../../api/contracts';
import { getAllVendors } from '../../api/vendors';
import { getDeliveryPageSummary } from '../../api/reports';
import { checkCompliance } from '../../api/compliance';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DELIVERY_STATUS_MAP = {
  PENDING:          { icon: Clock,        color: '#F59E0B', label: 'Pending' },
  MARKED_DELIVERED: { icon: Truck,        color: '#2563EB', label: 'Marked Delivered' },
  DELAYED:          { icon: Calendar,     color: '#F97316', label: 'Delayed' },
  ACCEPTED:         { icon: CheckCircle2, color: '#22C55E', label: 'Accepted' },
  REJECTED:         { icon: Package,      color: '#EF4444', label: 'Rejected' },
};

const DELIVERY_TRANSITIONS = {
  PENDING:          ['MARKED_DELIVERED', 'DELAYED'],
  MARKED_DELIVERED: ['ACCEPTED', 'REJECTED'],
  DELAYED:          ['MARKED_DELIVERED'],
  ACCEPTED:         [],
  REJECTED:         [],
};

const DELIVERY_ROLE_RULES = {
  MARKED_DELIVERED: ['VENDOR', 'ADMIN'],
  DELAYED:          ['VENDOR', 'ADMIN'],
  ACCEPTED:         ['PROJECT_MANAGER', 'ADMIN'],
  REJECTED:         ['PROJECT_MANAGER', 'ADMIN'],
};

function deliveryProgress(status) {
  return { PENDING: 20, DELAYED: 35, MARKED_DELIVERED: 70, ACCEPTED: 100, REJECTED: 100 }[status] ?? 10;
}

const DELIVERY_STEPS = ['PENDING', 'MARKED_DELIVERED', 'ACCEPTED'];

const SERVICE_STATUS_MAP = {
  PENDING:     { color: '#F59E0B', label: 'Pending' },
  IN_PROGRESS: { color: '#2563EB', label: 'In Progress' },
  COMPLETED:   { color: '#14B8A6', label: 'Completed' },
  VERIFIED:    { color: '#22C55E', label: 'Verified' },
};

const SERVICE_TRANSITIONS = {
  PENDING:     ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED:   ['VERIFIED'],
  VERIFIED:    [],
};

const SERVICE_ROLE_RULES = {
  IN_PROGRESS: ['VENDOR', 'ADMIN'],
  COMPLETED:   ['VENDOR', 'ADMIN'],
  VERIFIED:    ['PROJECT_MANAGER', 'ADMIN'],
};

function serviceProgress(status) {
  return { PENDING: 10, IN_PROGRESS: 40, COMPLETED: 75, VERIFIED: 100 }[status] ?? 10;
}

function contractLabel(contracts, contractId) {
  const c = contracts.find(x => x.contractId === contractId);
  if (!c) return `#${contractId}`;
  return `${c.vendorName || 'Unknown'} — ${c.projectName || 'Unknown'} (#${contractId})`;
}

function canDoTransition(transitions, roleRules, currentStatus, nextStatus, role) {
  if (!(transitions[currentStatus] || []).includes(nextStatus)) return false;
  return (roleRules[nextStatus] || []).includes(role);
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

function Stepper({ status, steps }) {
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
            ${i <= idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {i < idx ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && <div className={`w-5 h-0.5 ${i < idx ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );
}

function ActionButtons({ transitions, roleRules, currentStatus, role, onTransition, loadingKey, itemKey }) {
  const available = (transitions[currentStatus] || []).filter(next =>
    canDoTransition(transitions, roleRules, currentStatus, next, role));
  if (available.length === 0) return <span className="text-[11px] text-slate-400">—</span>;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {available.map(next => {
        const label = Object.assign({}, DELIVERY_STATUS_MAP, SERVICE_STATUS_MAP)[next]?.label || next;
        const color = Object.assign({}, DELIVERY_STATUS_MAP, SERVICE_STATUS_MAP)[next]?.color || '#64748b';
        return (
          <button key={next} onClick={() => onTransition(itemKey, next)} disabled={loadingKey}
            className="text-[11px] px-2.5 py-1 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: color }}>
            {loadingKey ? <Loader2 size={10} className="animate-spin inline" /> : label}
          </button>
        );
      })}
    </div>
  );
}

const EMPTY_DELIVERY = { contractId: '', item: '', quantity: '', unit: '', date: '', remarks: '' };
const EMPTY_SERVICE  = { contractId: '', description: '', completionDate: '', remarks: '' };

const DELIVERY_FILTER_OPTIONS = ['All', ...Object.keys(DELIVERY_STATUS_MAP)].map(s => ({
  key: s,
  label: DELIVERY_STATUS_MAP[s]?.label || s,
}));

const SERVICE_FILTER_OPTIONS = ['All', ...Object.keys(SERVICE_STATUS_MAP)].map(s => ({
  key: s,
  label: SERVICE_STATUS_MAP[s]?.label || s,
}));

export default function DeliveryTracking() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('deliveries');
  const [deliveries, setDeliveries]       = useState([]);
  const [services, setServices]           = useState([]);
  const [contracts, setContracts]         = useState([]);
  const [deliverySummary, setDeliverySummary] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [svcFilter, setSvcFilter]   = useState('All');
  const [showCreateD, setShowCreateD] = useState(false);
  const [showCreateS, setShowCreateS] = useState(false);
  const [formD, setFormD]           = useState(EMPTY_DELIVERY);
  const [formS, setFormS]           = useState(EMPTY_SERVICE);
  const [saving, setSaving]         = useState(false);
  const [updating, setUpdating]     = useState({});
  const [dErrors, setDErrors] = useState({});
  const [sErrors, setSErrors] = useState({});
  const [complianceBlock, setComplianceBlock] = useState(null);

  const canCreate = ['ADMIN', 'VENDOR'].includes(user?.role);
  const today     = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, s, c, sum] = await Promise.allSettled([
        getAllDeliveries(), getAllServices(), getAllContracts(), getDeliveryPageSummary(),
      ]);
      const allDeliveries = d.status === 'fulfilled' ? (d.value.data?.data || []) : [];
      const allServices   = s.status === 'fulfilled' ? (s.value.data?.data || []) : [];
      const allContracts  = c.status === 'fulfilled' ? (c.value.data?.data || []) : [];
      setDeliverySummary(sum.status === 'fulfilled' ? sum.value.data : null);

      if (user?.role === 'VENDOR') {
        // Scope everything to this vendor's contracts only
        try {
          const vendorRes    = await getAllVendors();
          const allVendors   = vendorRes.data?.data || [];
          const mine         = allVendors.find(v => v.userId === user.userId || v.username === user.username);
          if (mine) {
            const vcRes        = await getContractsByVendor(mine.vendorId);
            const myContracts  = vcRes.data?.data || [];
            const myContractIds = new Set(myContracts.map(co => co.contractId));
            setContracts(myContracts);
            setDeliveries(allDeliveries.filter(de => myContractIds.has(de.contractId)));
            setServices(allServices.filter(sv => myContractIds.has(sv.contractId)));
          } else {
            setContracts([]); setDeliveries([]); setServices([]);
          }
        } catch {
          setContracts([]); setDeliveries([]); setServices([]);
        }
      } else {
        setDeliveries(allDeliveries);
        setServices(allServices);
        setContracts(allContracts);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateDelivery = async () => {
    const e = {};
    if (!formD.contractId)    e.contractId = 'Please select a contract';
    if (!formD.item.trim())   e.item       = 'Item is required';
    if (!formD.quantity)      e.quantity   = 'Quantity is required';
    if (!formD.date)          e.date       = 'Delivery date is required';
    setDErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createDelivery({
        contractId: Number(formD.contractId),
        item:       formD.item,
        quantity:   Number(formD.quantity),
        unit:       formD.unit || undefined,
        date:       formD.date,
        remarks:    formD.remarks || undefined,
      });
      toast.success('Delivery created');
      setShowCreateD(false);
      setFormD(EMPTY_DELIVERY);
      setDErrors({});
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleDeliveryTransition = async (deliveryId, nextStatus) => {
    setUpdating(p => ({ ...p, [`d-${deliveryId}`]: true }));
    if (nextStatus === 'ACCEPTED') {
      try {
        await checkCompliance(deliveryId, 'DELIVERY_CHECK');
      } catch {
        setComplianceBlock({
          message: `Delivery #${deliveryId} cannot be accepted yet.`,
          hint: `A DELIVERY_CHECK compliance record must exist for Reference ID ${deliveryId} with status PASSED or WAIVED.\n\nGo to Compliance & Audit → Create Record → Type: DELIVERY_CHECK → Reference ID: ${deliveryId}, then move it to PASSED.`,
        });
        setUpdating(p => ({ ...p, [`d-${deliveryId}`]: false }));
        return;
      }
    }
    try {
      await updateDeliveryStatus(deliveryId, nextStatus);
      toast.success(`Delivery → ${DELIVERY_STATUS_MAP[nextStatus]?.label || nextStatus}`);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setUpdating(p => ({ ...p, [`d-${deliveryId}`]: false })); }
  };

  const handleCreateService = async () => {
    const e = {};
    if (!formS.contractId)                          e.contractId    = 'Please select a contract';
    if (!formS.description || formS.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!formS.completionDate)                      e.completionDate = 'Completion date is required';
    setSErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createService({
        contractId:     Number(formS.contractId),
        description:    formS.description,
        completionDate: formS.completionDate,
        remarks:        formS.remarks || undefined,
      });
      toast.success('Service created');
      setShowCreateS(false);
      setFormS(EMPTY_SERVICE);
      setSErrors({});
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setSaving(false); }
  };

  const handleServiceTransition = async (serviceId, nextStatus) => {
    setUpdating(p => ({ ...p, [`s-${serviceId}`]: true }));
    if (nextStatus === 'VERIFIED') {
      try {
        await checkCompliance(serviceId, 'SERVICE_CHECK');
      } catch {
        setComplianceBlock({
          message: `Service #${serviceId} cannot be verified yet.`,
          hint: `A SERVICE_CHECK compliance record must exist for Reference ID ${serviceId} with status PASSED or WAIVED.\n\nGo to Compliance & Audit → Create Record → Type: SERVICE_CHECK → Reference ID: ${serviceId}, then move it to PASSED.`,
        });
        setUpdating(p => ({ ...p, [`s-${serviceId}`]: false }));
        return;
      }
    }
    try {
      await updateServiceStatus(serviceId, nextStatus);
      toast.success(`Service → ${SERVICE_STATUS_MAP[nextStatus]?.label || nextStatus}`);
      fetchData();
    } catch (err) { showErrors(err); }
    finally { setUpdating(p => ({ ...p, [`s-${serviceId}`]: false })); }
  };

  const setD = k => e => setFormD(p => ({ ...p, [k]: e.target.value }));
  const setS = k => e => setFormS(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" /><span className="text-sm">Loading…</span>
    </div>
  );

  const filteredDeliveries = filter === 'All' ? deliveries : deliveries.filter(d => d.status === filter);
  const filteredServices   = svcFilter === 'All' ? services : services.filter(s => s.status === svcFilter);

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="Delivery & Service Tracking"
        subtitle={`${deliveries.length} deliveries · ${services.length} services`}
        actions={
          <>
            <Button variant="secondary" size="xs" icon={<RotateCcw size={13} />} onClick={fetchData}>Refresh</Button>
            {canCreate && tab === 'deliveries' && (
              <Button variant="primary" size="xs" icon={<Plus size={13} />} onClick={() => setShowCreateD(true)}>New Delivery</Button>
            )}
            {canCreate && tab === 'services' && (
              <Button variant="primary" size="xs" icon={<Plus size={13} />} onClick={() => setShowCreateS(true)}>New Service</Button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700/50">
        {[
          { key: 'deliveries', label: 'Deliveries', icon: Truck },
          { key: 'services',   label: 'Services',   icon: Wrench },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all
                ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* DELIVERIES TAB */}
      {tab === 'deliveries' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(DELIVERY_STATUS_MAP).map(([s, cfg]) => {
              const Icon = cfg.icon;
              const count = deliverySummary?.deliveryStatusCounts?.[s] ?? 0;
              return (
                <div key={s} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{count}</p>
                    <p className="text-[10px] text-slate-400">{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <FilterPills options={DELIVERY_FILTER_OPTIONS} value={filter} onChange={setFilter} />

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table elevated={false}>
                <TableHead>
                  {['ID', 'Item', 'Contract', 'Qty / Unit', 'Delivery Date', 'Status', 'Progress', 'Steps', 'Actions'].map(h => (
                    <TableHeader key={h}>{h}</TableHeader>
                  ))}
                </TableHead>
                <TableBody>
                  {filteredDeliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-400">No deliveries found</TableCell>
                    </TableRow>
                  ) : filteredDeliveries.map(d => {
                    const cfg      = DELIVERY_STATUS_MAP[d.status] || DELIVERY_STATUS_MAP.PENDING;
                    const progress = deliveryProgress(d.status);
                    return (
                      <TableRow key={d.deliveryId}>
                        <TableCell className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{d.deliveryId}</TableCell>
                        <TableCell>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{d.item || '—'}</p>
                          {d.remarks && <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{d.remarks}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-[140px]">
                          <span className="truncate block">{contractLabel(contracts, d.contractId)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                          {d.quantity ? `${d.quantity}${d.unit ? ` ${d.unit}` : ''}` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.date || '—'}</TableCell>
                        <TableCell><Badge status={d.status} /></TableCell>
                        <TableCell className="w-28">
                          <ProgressBar value={progress} color={cfg.color} showLabel />
                        </TableCell>
                        <TableCell>
                          <Stepper status={d.status} steps={DELIVERY_STEPS} />
                        </TableCell>
                        <TableCell>
                          <ActionButtons
                            transitions={DELIVERY_TRANSITIONS}
                            roleRules={DELIVERY_ROLE_RULES}
                            currentStatus={d.status}
                            role={user?.role}
                            onTransition={(_, next) => handleDeliveryTransition(d.deliveryId, next)}
                            loadingKey={updating[`d-${d.deliveryId}`]}
                            itemKey={d.deliveryId}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* SERVICES TAB */}
      {tab === 'services' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(SERVICE_STATUS_MAP).map(([s, cfg]) => {
              const count = deliverySummary?.serviceStatusCounts?.[s] ?? 0;
              return (
                <div key={s} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                    <Wrench size={16} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{count}</p>
                    <p className="text-[10px] text-slate-400">{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <FilterPills options={SERVICE_FILTER_OPTIONS} value={svcFilter} onChange={setSvcFilter} />

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table elevated={false}>
                <TableHead>
                  {['ID', 'Description', 'Contract', 'Completion Date', 'Status', 'Progress', 'Actions'].map(h => (
                    <TableHeader key={h}>{h}</TableHeader>
                  ))}
                </TableHead>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-400">No services found</TableCell>
                    </TableRow>
                  ) : filteredServices.map(s => {
                    const progress = serviceProgress(s.status);
                    const cfg      = SERVICE_STATUS_MAP[s.status] || SERVICE_STATUS_MAP.PENDING;
                    return (
                      <TableRow key={s.serviceId}>
                        <TableCell className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{s.serviceId}</TableCell>
                        <TableCell>
                          <p className="text-xs text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{s.description || '—'}</p>
                          {s.remarks && <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{s.remarks}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-[140px]">
                          <span className="truncate block">{contractLabel(contracts, s.contractId)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.completionDate || '—'}</TableCell>
                        <TableCell><Badge status={s.status} /></TableCell>
                        <TableCell className="w-28">
                          <ProgressBar value={progress} color={cfg.color} showLabel />
                        </TableCell>
                        <TableCell>
                          <ActionButtons
                            transitions={SERVICE_TRANSITIONS}
                            roleRules={SERVICE_ROLE_RULES}
                            currentStatus={s.status}
                            role={user?.role}
                            onTransition={(_, next) => handleServiceTransition(s.serviceId, next)}
                            loadingKey={updating[`s-${s.serviceId}`]}
                            itemKey={s.serviceId}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Create Delivery Modal */}
      <Modal open={showCreateD} onClose={() => { setShowCreateD(false); setFormD(EMPTY_DELIVERY); setDErrors({}); }} title="Create Delivery">
        <div className="space-y-4">
          <FormSelect
            label="Contract"
            required
            value={formD.contractId}
            onChange={e => { setD('contractId')(e); if (e.target.value) setDErrors(p => ({ ...p, contractId: '' })); }}
            error={dErrors.contractId}
            hint={contracts.filter(c => c.status === 'ACTIVE').length === 0 ? 'No active contracts. A vendor must accept a contract first.' : ''}
          >
            <option value="">Select contract…</option>
            {contracts.filter(c => c.status === 'ACTIVE').map(c => (
              <option key={c.contractId} value={c.contractId}>
                {c.vendorName || 'Unknown'} — {c.projectName || 'Unknown'} (#{c.contractId})
              </option>
            ))}
          </FormSelect>
          <FormInput
            label="Item"
            required
            value={formD.item}
            onChange={e => { setD('item')(e); if (e.target.value.trim()) setDErrors(p => ({ ...p, item: '' })); }}
            placeholder="Item description (min 2 chars)"
            error={dErrors.item}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Quantity"
              required
              type="number"
              min="0.01"
              step="0.01"
              value={formD.quantity}
              onChange={e => { setD('quantity')(e); if (e.target.value) setDErrors(p => ({ ...p, quantity: '' })); }}
              placeholder="0.00"
              error={dErrors.quantity}
            />
            <FormInput label="Unit" value={formD.unit} onChange={setD('unit')} placeholder="tons, kg, pcs…" />
          </div>
          <FormInput
            label="Delivery Date"
            required
            hint="(today or earlier)"
            type="date"
            max={today}
            value={formD.date}
            onChange={e => { setD('date')(e); if (e.target.value) setDErrors(p => ({ ...p, date: '' })); }}
            error={dErrors.date}
          />
          <FormTextarea label="Remarks" value={formD.remarks} onChange={setD('remarks')} rows={2} placeholder="Optional remarks…" />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setShowCreateD(false); setFormD(EMPTY_DELIVERY); setDErrors({}); }}>Cancel</Button>
            <Button variant="primary" size="xs" onClick={handleCreateDelivery} loading={saving}>Create Delivery</Button>
          </div>
        </div>
      </Modal>

      {/* Create Service Modal */}
      <Modal open={showCreateS} onClose={() => { setShowCreateS(false); setFormS(EMPTY_SERVICE); setSErrors({}); }} title="Create Service">
        <div className="space-y-4">
          <FormSelect
            label="Contract"
            required
            value={formS.contractId}
            onChange={e => { setS('contractId')(e); if (e.target.value) setSErrors(p => ({ ...p, contractId: '' })); }}
            error={sErrors.contractId}
          >
            <option value="">Select contract…</option>
            {contracts.filter(c => c.status === 'ACTIVE').map(c => (
              <option key={c.contractId} value={c.contractId}>
                {c.vendorName || 'Unknown'} — {c.projectName || 'Unknown'} (#{c.contractId})
              </option>
            ))}
          </FormSelect>
          <FormTextarea
            label="Description"
            required
            hint="(min 10 chars)"
            value={formS.description}
            onChange={e => { setS('description')(e); if (e.target.value.trim().length >= 10) setSErrors(p => ({ ...p, description: '' })); }}
            rows={3}
            placeholder="Describe the service to be provided…"
            error={sErrors.description}
          />
          <FormInput
            label="Expected Completion Date"
            required
            hint="(today or later)"
            type="date"
            min={today}
            value={formS.completionDate}
            onChange={e => { setS('completionDate')(e); if (e.target.value) setSErrors(p => ({ ...p, completionDate: '' })); }}
            error={sErrors.completionDate}
          />
          <FormTextarea label="Remarks" value={formS.remarks} onChange={setS('remarks')} rows={2} placeholder="Optional remarks…" />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setShowCreateS(false); setFormS(EMPTY_SERVICE); setSErrors({}); }}>Cancel</Button>
            <Button variant="primary" size="xs" onClick={handleCreateService} loading={saving}>Create Service</Button>
          </div>
        </div>
      </Modal>

      {/* Compliance Gate Modal */}
      <Modal open={complianceBlock !== null} onClose={() => setComplianceBlock(null)} title="Compliance Check Required">
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-700/40">
            <span className="text-red-500 mt-0.5 shrink-0">✕</span>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{complianceBlock?.message}</p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">{complianceBlock?.hint}</p>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => setComplianceBlock(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
