import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Circle, XCircle, Loader2,
  Briefcase, ChevronRight, Zap, Trash2, Edit3,
  MapPin, DollarSign, Calendar, Pause, User,
} from 'lucide-react';
import {
  Button, EmptyState, FormInput, FormSelect, FormTextarea,
  InfoBox, Modal, PageHeader, ProgressBar, StatusCards,
} from '../../components/ui';
import {
  getAllProjects, createProject, updateProject, deleteProject, updateProjectStatus,
} from '../../api/projects';
import { getUserByRole } from '../../api/users';
import { getProjectPageSummary } from '../../api/reports';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusMeta(status) {
  return {
    PLANNING:  { label: 'Planning',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  progress: 10  },
    ACTIVE:    { label: 'Active',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   progress: 55  },
    ON_HOLD:   { label: 'On Hold',   color: '#F97316', bg: 'rgba(249,115,22,0.12)',  progress: 35  },
    COMPLETED: { label: 'Completed', color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   progress: 100 },
    CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   progress: 100 },
  }[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', progress: 10 };
}

const STATUS_OPTIONS = [
  { key: 'ALL',       label: 'All',       color: '#64748b' },
  { key: 'PLANNING',  label: 'Planning',  color: '#F59E0B' },
  { key: 'ACTIVE',    label: 'Active',    color: '#22C55E' },
  { key: 'ON_HOLD',   label: 'On Hold',   color: '#F97316' },
  { key: 'COMPLETED', label: 'Completed', color: '#2563EB' },
  { key: 'CANCELLED', label: 'Cancelled', color: '#EF4444' },
];

const EMPTY_FORM = {
  name: '', description: '', location: '', budget: '',
  startDate: '', endDate: '', actualEndDate: '', managerUsername: '', managerId: '',
};

// ─── timeline ─────────────────────────────────────────────────────────────────

const TIMELINE_STAGES = ['Planning', 'Active', 'Closed'];

function stageIndex(status) {
  if (status === 'PLANNING') return 0;
  if (status === 'ACTIVE' || status === 'ON_HOLD') return 1;
  return 2;
}

function ProjectTimeline({ status }) {
  const activeIdx   = stageIndex(status);
  const isCancelled = status === 'CANCELLED';
  const isOnHold    = status === 'ON_HOLD';
  const isCompleted = status === 'COMPLETED';
  const closeLabel  = isCancelled ? 'Cancelled' : isCompleted ? 'Completed' : 'Closed';

  return (
    <div className="flex items-center gap-0 py-2">
      {TIMELINE_STAGES.map((s, i) => {
        const label = i === 2 ? closeLabel : i === 1 && isOnHold ? 'On Hold' : s;
        const done  = i < activeIdx;
        const curr  = i === activeIdx;
        let dotColor = 'bg-slate-200 dark:bg-slate-700';
        if (done) dotColor = 'bg-blue-600';
        if (curr) {
          if (isCancelled) dotColor = 'bg-red-500';
          else if (isOnHold) dotColor = 'bg-orange-400';
          else dotColor = 'bg-blue-600';
        }
        let textColor = 'text-slate-400';
        if (curr) {
          if (isCancelled) textColor = 'text-red-500';
          else if (isOnHold) textColor = 'text-orange-500';
          else textColor = 'text-blue-600';
        }
        if (done) textColor = 'text-blue-500';

        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all ${dotColor} shadow-sm`}>
                {done ? <CheckCircle2 size={13} />
                  : curr && isCancelled ? <XCircle size={13} />
                  : curr && isOnHold    ? <Pause size={11} />
                  : <Circle size={11} fill="white" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${textColor}`}>{label}</span>
            </div>
            {i < TIMELINE_STAGES.length - 1 && (
              <div className={`h-0.5 w-14 mb-5 mx-1 transition-all ${done ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── lifecycle actions ────────────────────────────────────────────────────────

function LifecycleActions({ project, onStatusChange, canManage, isAdmin }) {
  const [loadingKey, setLoadingKey] = useState(null);
  if (!canManage) return null;

  const actions = [];
  if (project.status === 'PLANNING' && isAdmin) {
    actions.push({ label: 'Activate Project', status: 'ACTIVE',    color: '#22C55E', icon: Zap      });
    actions.push({ label: 'Cancel Project',   status: 'CANCELLED', color: '#EF4444', icon: XCircle  });
  } else if (project.status === 'ACTIVE') {
    actions.push({ label: 'Put On Hold',      status: 'ON_HOLD',   color: '#F97316', icon: Pause    });
    if (isAdmin) {
      actions.push({ label: 'Mark Completed', status: 'COMPLETED', color: '#2563EB', icon: CheckCircle2 });
      actions.push({ label: 'Cancel Project', status: 'CANCELLED', color: '#EF4444', icon: XCircle  });
    }
  } else if (project.status === 'ON_HOLD') {
    actions.push({ label: 'Resume Project',   status: 'ACTIVE',    color: '#22C55E', icon: Zap      });
    if (isAdmin) {
      actions.push({ label: 'Cancel Project', status: 'CANCELLED', color: '#EF4444', icon: XCircle  });
    }
  }

  if (actions.length === 0) {
    return <p className="text-xs text-slate-400 italic">This project is in a terminal state — no further transitions available.</p>;
  }

  const handle = async (a) => {
    setLoadingKey(a.status);
    try { await onStatusChange(a.status); }
    finally { setLoadingKey(null); }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.status}
            onClick={() => handle(a)}
            disabled={!!loadingKey}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: a.color, boxShadow: `0 2px 8px ${a.color}55` }}
          >
            {loadingKey === a.status ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── detail modal ─────────────────────────────────────────────────────────────

function ProjectDetailModal({ project, managers, onClose, onRefresh, canManage, isAdmin }) {
  const [tab, setTab]           = useState('details');
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const validateEdit = () => {
    const e = {};
    if (!editForm.name)      e.name      = 'Project name is required';
    if (!editForm.location)  e.location  = 'Location is required';
    if (!editForm.budget)    e.budget    = 'Budget is required';
    if (!editForm.startDate) e.startDate = 'Start date is required';
    if (!editForm.endDate)   e.endDate   = 'End date is required';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!project) return null;
  const meta       = statusMeta(project.status);
  const isEditable = project.status === 'PLANNING' || project.status === 'ACTIVE';

  const openEdit = () => {
    setEditForm({
      name:            project.name          || '',
      description:     project.description   || '',
      location:        project.location      || '',
      budget:          project.budget        || '',
      startDate:       project.startDate     || '',
      endDate:         project.endDate       || '',
      actualEndDate:   project.actualEndDate || '',
      managerUsername: project.managerName   || '',
      managerId:       project.managerId     || '',
    });
    setEditing(true);
  };

  const handleManagerChange = (e) => {
    const sel = managers.find(m => m.username === e.target.value);
    setEditForm(p => ({ ...p, managerUsername: sel?.username || '', managerId: sel?.userId || '' }));
  };

  const handleSave = async () => {
    if (!validateEdit()) return;
    setSaving(true);
    try {
      await updateProject(project.projectId, {
        name:          editForm.name,
        description:   editForm.description    || undefined,
        location:      editForm.location,
        budget:        Number(editForm.budget),
        startDate:     editForm.startDate,
        endDate:       editForm.endDate,
        actualEndDate: editForm.actualEndDate  || undefined,
        managerId:     editForm.managerId      || undefined,
        managerName:   editForm.managerUsername || undefined,
      });
      toast.success('Project updated');
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateProjectStatus(project.projectId, newStatus);
      toast.success(`Project moved to ${newStatus.replace('_', ' ')}`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(project.projectId);
      toast.success('Project deleted');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const setF = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal open={!!project} onClose={onClose} title={`Project: ${project.name}`} wide>
      <div className="space-y-5">
        {/* Status + progress */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
          <div className="flex-1 min-w-[140px]">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Progress</span><span className="font-semibold">{meta.progress}%</span>
            </div>
            <ProgressBar value={meta.progress} />
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Lifecycle</p>
          <ProjectTimeline status={project.status} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 dark:border-slate-700/50">
          {['details', 'actions'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold capitalize transition-all rounded-t-lg ${
                tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}>
              {t === 'actions' ? 'Lifecycle Actions' : 'Details'}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            {!editing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Name',       project.name       || '—'],
                    ['Location',   project.location   || '—'],
                    ['Budget',     project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'],
                    ['Start Date', project.startDate     || '—'],
                    ['End Date',   project.endDate       || '—'],
                    ['Actual End', project.actualEndDate || '—'],
                    ['Manager',    project.managerName   || '—'],
                    ['Created',    project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{k}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{v}</p>
                    </div>
                  ))}
                </div>
                {project.description && (
                  <div className="p-3 rounded-xl"
                    style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{project.description}</p>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  {isAdmin && isEditable && (
                    <Button variant="secondary" size="xs" icon={<Edit3 size={12} />} onClick={openEdit}>Edit</Button>
                  )}
                  {isAdmin && (
                    <Button variant="danger" size="xs" icon={<Trash2 size={12} />} onClick={handleDelete}>Delete</Button>
                  )}
                  <Button variant="secondary" size="xs" onClick={onClose}>Close</Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Project Name" required dense className="col-span-2"
                    value={editForm.name} onChange={setF('name')} placeholder="Project name" error={editErrors.name} />
                  <FormInput label="Location" required dense className="col-span-2"
                    value={editForm.location} onChange={setF('location')} placeholder="Project location" error={editErrors.location} />
                  <FormInput label="Budget ($)" required dense type="number"
                    value={editForm.budget} onChange={setF('budget')} placeholder="0.00" error={editErrors.budget} />
                  <FormSelect label="Manager Username" dense
                    value={editForm.managerUsername} onChange={handleManagerChange}
                    hint={managers.length === 0 ? 'No project managers found.' : undefined}>
                    <option value="">Select manager…</option>
                    {managers.map(m => <option key={m.userId} value={m.username}>{m.username}</option>)}
                  </FormSelect>
                  <FormInput label="Start Date" required dense type="date"
                    value={editForm.startDate} onChange={setF('startDate')} error={editErrors.startDate} />
                  <FormInput label="End Date" required dense type="date"
                    value={editForm.endDate} onChange={setF('endDate')} error={editErrors.endDate} />
                  <FormInput label="Actual End Date" dense type="date"
                    value={editForm.actualEndDate} onChange={setF('actualEndDate')} />
                </div>
                <FormTextarea label="Description"
                  value={editForm.description} onChange={setF('description')} />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="xs" onClick={() => { setEditing(false); setEditErrors({}); }}>Cancel</Button>
                  <Button variant="primary" size="xs" loading={saving} onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lifecycle Actions tab */}
        {tab === 'actions' && (
          <div className="space-y-4">
            <InfoBox variant="info">
              {project.status === 'PLANNING'  && 'PLANNING → ACTIVE (activate) or CANCELLED.'}
              {project.status === 'ACTIVE'    && 'ACTIVE → ON_HOLD, COMPLETED, or CANCELLED.'}
              {project.status === 'ON_HOLD'   && 'ON_HOLD → ACTIVE (resume) or CANCELLED.'}
              {['COMPLETED', 'CANCELLED'].includes(project.status) && 'This project is in a terminal state — no further transitions available.'}
            </InfoBox>
            <LifecycleActions
              project={project}
              onStatusChange={handleStatusChange}
              canManage={canManage}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function ProjectManagement() {
  const { user }                    = useAuth();
  const [projects, setProjects]     = useState([]);
  const [managers, setManagers]     = useState([]);
  const [projectSummary, setProjectSummary] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [formErrors, setFormErrors] = useState({});

  const isAdmin   = user?.role === 'ADMIN';
  const canManage = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);

  const validateCreate = () => {
    const e = {};
    if (!form.name)      e.name      = 'Project name is required';
    if (!form.location)  e.location  = 'Location is required';
    if (!form.budget)    e.budget    = 'Budget is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate)   e.endDate   = 'End date is required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, mr, sum] = await Promise.allSettled([
        getAllProjects(), getUserByRole('PROJECT_MANAGER'), getProjectPageSummary(),
      ]);
      setProjects(pr.status === 'fulfilled'  ? (pr.value.data?.data ?? []) : []);
      setManagers(mr.status === 'fulfilled'  ? (mr.value.data?.data ?? mr.value.data ?? []) : []);
      setProjectSummary(sum.status === 'fulfilled' ? sum.value.data : null);
    } catch {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleManagerSelect = (e) => {
    const sel = managers.find(m => m.username === e.target.value);
    setForm(p => ({ ...p, managerUsername: sel?.username || '', managerId: sel?.userId || '' }));
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const clearError = (k) => setFormErrors(p => ({ ...p, [k]: '' }));

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setSaving(true);
    try {
      await createProject({
        name:          form.name,
        description:   form.description    || undefined,
        location:      form.location,
        budget:        Number(form.budget),
        startDate:     form.startDate,
        endDate:       form.endDate,
        actualEndDate: form.actualEndDate  || undefined,
        managerId:     form.managerId      || undefined,
        managerName:   form.managerUsername || undefined,
      });
      toast.success('Project created successfully');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally { setSaving(false); }
  };

  const closeCreate = () => { setShowCreate(false); setForm(EMPTY_FORM); setFormErrors({}); };

  const counts = projectSummary?.statusCounts ?? { ALL: 0, PLANNING: 0, ACTIVE: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0 };

  const displayed = filterStatus === 'ALL' ? projects : projects.filter(p => p.status === filterStatus);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading projects…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="Project Management"
        subtitle={`${projects.length} projects · Lifecycle: PLANNING → ACTIVE → CLOSED`}
        actions={
          <>
            <Button variant="secondary" size="xs" onClick={fetchData}>Refresh</Button>
            {isAdmin && (
              <Button variant="primary" size="xs" onClick={() => setShowCreate(true)}>+ New Project</Button>
            )}
          </>
        }
      />

      <StatusCards options={STATUS_OPTIONS} counts={counts} value={filterStatus} onChange={setFilterStatus} />

      {displayed.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          message={filterStatus === 'ALL' ? 'No projects found.' : `No ${filterStatus.toLowerCase().replace('_', ' ')} projects.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(p => {
            const meta = statusMeta(p.status);
            return (
              <div key={p.projectId}
                className="glass-card p-5 cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelected(p)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-mono text-blue-600 font-semibold mb-0.5">#{p.projectId}</p>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={10} className="shrink-0" /> {p.location}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: meta.bg, color: meta.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </div>

                <div className="space-y-1.5 mb-4">
                  {p.budget && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1"><DollarSign size={10} /> Budget</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">${Number(p.budget).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1"><Calendar size={10} /> Duration</span>
                    <span className="text-slate-500">{p.startDate || '—'} → {p.endDate || '—'}</span>
                  </div>
                  {p.managerName && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1"><User size={10} /> Manager</span>
                      <span className="text-slate-500 truncate max-w-[120px]">{p.managerName}</span>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">{meta.progress}%</span>
                  </div>
                  <ProgressBar value={meta.progress} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Briefcase size={10} />
                    <span>Click to view details</span>
                  </div>
                  {canManage && !['COMPLETED', 'CANCELLED'].includes(p.status) && (
                    <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                      Manage <ChevronRight size={10} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectDetailModal
        project={selected}
        managers={managers}
        onClose={() => setSelected(null)}
        onRefresh={fetchData}
        canManage={canManage}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <Modal open={showCreate} onClose={closeCreate} title="Create New Project">
          <div className="space-y-4">
            <InfoBox variant="info">
              New projects start in <strong className="text-amber-600">PLANNING</strong> status. Activate them from the detail view.
            </InfoBox>

            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Project Name" required className="col-span-2"
                value={form.name} placeholder="e.g. City Bridge Renovation"
                onChange={e => { set('name')(e); clearError('name'); }}
                error={formErrors.name} />
              <FormInput label="Location" required className="col-span-2"
                value={form.location} placeholder="e.g. 123 Main St, New York, NY"
                onChange={e => { set('location')(e); clearError('location'); }}
                error={formErrors.location} />
              <FormInput label="Budget ($)" required type="number" min="0.01" step="0.01"
                value={form.budget} placeholder="0.00"
                onChange={e => { set('budget')(e); clearError('budget'); }}
                error={formErrors.budget} />
              <FormSelect label="Manager Username"
                value={form.managerUsername} onChange={handleManagerSelect}
                hint={managers.length === 0 ? 'No project managers found.' : undefined}>
                <option value="">Select manager…</option>
                {managers.map(m => <option key={m.userId} value={m.username}>{m.username}</option>)}
              </FormSelect>
              <FormInput label="Start Date" required type="date"
                value={form.startDate}
                onChange={e => { set('startDate')(e); clearError('startDate'); }}
                error={formErrors.startDate} />
              <FormInput label="End Date" required type="date"
                value={form.endDate}
                onChange={e => { set('endDate')(e); clearError('endDate'); }}
                error={formErrors.endDate} />
            </div>

            <FormTextarea label="Description"
              value={form.description} onChange={set('description')}
              placeholder="Optional project description…" />

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="secondary" size="xs" onClick={closeCreate}>Cancel</Button>
              <Button variant="primary" size="xs" loading={saving} onClick={handleCreate}>Create Project</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
