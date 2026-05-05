import { useState, useEffect, useCallback } from 'react';
import {
  Plus, CheckCircle2, Circle, XCircle, Loader2, RefreshCw,
  Briefcase, ChevronRight, AlertTriangle, Zap, Trash2, Edit3,
  MapPin, DollarSign, Calendar, AlertCircle, Pause, User,
} from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import {
  getAllProjects, createProject, updateProject, deleteProject, updateProjectStatus,
} from '../../api/projects';
import { getUserByRole } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function statusMeta(status) {
  return {
    PLANNING:  { label: 'Planning',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  progress: 10  },
    ACTIVE:    { label: 'Active',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   progress: 55  },
    ON_HOLD:   { label: 'On Hold',   color: '#F97316', bg: 'rgba(249,115,22,0.12)',  progress: 35  },
    COMPLETED: { label: 'Completed', color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   progress: 100 },
    CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   progress: 100 },
  }[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', progress: 10 };
}

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
                {done
                  ? <CheckCircle2 size={13} />
                  : curr && isCancelled
                  ? <XCircle size={13} />
                  : curr && isOnHold
                  ? <Pause size={11} />
                  : <Circle size={11} fill="white" />
                }
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

function LifecycleActions({ project, onStatusChange, canManage, isAdmin }) {
  const [loading, setLoading] = useState(null);

  if (!canManage) return null;

  const actions = [];
  if (project.status === 'PLANNING') {
    if (isAdmin) {
      actions.push({ label: 'Activate Project', status: 'ACTIVE',    color: '#22C55E', icon: Zap     });
      actions.push({ label: 'Cancel Project',   status: 'CANCELLED', color: '#EF4444', icon: XCircle });
    }
  } else if (project.status === 'ACTIVE') {
    actions.push({ label: 'Put On Hold',     status: 'ON_HOLD',   color: '#F97316', icon: Pause       });
    if (isAdmin) {
      actions.push({ label: 'Mark Completed', status: 'COMPLETED', color: '#2563EB', icon: CheckCircle2 });
      actions.push({ label: 'Cancel Project', status: 'CANCELLED', color: '#EF4444', icon: XCircle      });
    }
  } else if (project.status === 'ON_HOLD') {
    actions.push({ label: 'Resume Project', status: 'ACTIVE',    color: '#22C55E', icon: Zap     });
    if (isAdmin) {
      actions.push({ label: 'Cancel Project', status: 'CANCELLED', color: '#EF4444', icon: XCircle });
    }
  }

  if (actions.length === 0) return (
    <p className="text-xs text-slate-400 italic">This project is in a terminal state — no further transitions available.</p>
  );

  const handle = async (action) => {
    setLoading(action.status);
    try {
      await onStatusChange(action.status);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.status}
            onClick={() => handle(a)}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: a.color, boxShadow: `0 2px 8px ${a.color}55` }}
          >
            {loading === a.status
              ? <Loader2 size={12} className="animate-spin" />
              : <Icon size={12} />
            }
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

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
      name:          project.name          || '',
      description:   project.description   || '',
      location:      project.location      || '',
      budget:        project.budget        || '',
      startDate:     project.startDate     || '',
      endDate:       project.endDate       || '',
      actualEndDate: project.actualEndDate || '',
      managerUsername: project.managerName || '',
      managerId:     project.managerId     || '',
    });
    setEditing(true);
  };

  const handleManagerChange = (e) => {
    const selected = managers.find(m => m.username === e.target.value);
    setEditForm(p => ({
      ...p,
      managerUsername: selected?.username || '',
      managerId:       selected?.userId   || '',
    }));
  };

  const handleSave = async () => {
    if (!validateEdit()) return;
    setSaving(true);
    try {
      await updateProject(project.projectId, {
        name:          editForm.name,
        description:   editForm.description   || undefined,
        location:      editForm.location,
        budget:        Number(editForm.budget),
        startDate:     editForm.startDate,
        endDate:       editForm.endDate,
        actualEndDate: editForm.actualEndDate || undefined,
        managerId:     editForm.managerId     || undefined,
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

  const setF = (k) => (e) => setEditForm((p) => ({ ...p, [k]: e.target.value }));

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
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
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
                    ['Name',       project.name     || '—'],
                    ['Location',   project.location || '—'],
                    ['Budget',     project.budget   ? `$${Number(project.budget).toLocaleString()}` : '—'],
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
                    <button className="btn-secondary text-xs" onClick={openEdit}>
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-all">
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                  <button className="btn-secondary text-xs" onClick={onClose}>Close</button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Project Name *</label>
                    <input value={editForm.name} onChange={setF('name')} placeholder="Project name"
                      className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all ${editErrors.name ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                    {editErrors.name && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{editErrors.name}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Location *</label>
                    <input value={editForm.location} onChange={setF('location')} placeholder="Project location"
                      className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all ${editErrors.location ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                    {editErrors.location && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{editErrors.location}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Budget ($) *</label>
                    <input type="number" value={editForm.budget} onChange={setF('budget')} placeholder="0.00"
                      className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all ${editErrors.budget ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                    {editErrors.budget && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{editErrors.budget}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Manager Username</label>
                    <select value={editForm.managerUsername} onChange={handleManagerChange}
                      className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all">
                      <option value="">Select manager…</option>
                      {managers.map(m => (
                        <option key={m.userId} value={m.username}>{m.username}</option>
                      ))}
                    </select>
                    {managers.length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">No project managers found.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Start Date *</label>
                    <input type="date" value={editForm.startDate} onChange={setF('startDate')}
                      className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all ${editErrors.startDate ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                    {editErrors.startDate && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{editErrors.startDate}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">End Date *</label>
                    <input type="date" value={editForm.endDate} onChange={setF('endDate')}
                      className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all ${editErrors.endDate ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                    {editErrors.endDate && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{editErrors.endDate}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Actual End Date</label>
                    <input type="date" value={editForm.actualEndDate} onChange={setF('actualEndDate')}
                      className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                  <textarea value={editForm.description} onChange={setF('description')} rows={3}
                    className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 resize-none" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="btn-secondary text-xs" onClick={() => { setEditing(false); setEditErrors({}); }}>Cancel</button>
                  <button className="btn-primary text-xs" onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lifecycle Actions tab */}
        {tab === 'actions' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-sm"
              style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
              <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Allowed Transitions</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {project.status === 'PLANNING'  && 'PLANNING → ACTIVE (activate) or CANCELLED.'}
                {project.status === 'ACTIVE'    && 'ACTIVE → ON_HOLD, COMPLETED, or CANCELLED.'}
                {project.status === 'ON_HOLD'   && 'ON_HOLD → ACTIVE (resume) or CANCELLED.'}
                {['COMPLETED', 'CANCELLED'].includes(project.status) && 'This project is in a terminal state — no further transitions available.'}
              </p>
            </div>
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

const EMPTY_FORM = {
  name: '', description: '', location: '', budget: '',
  startDate: '', endDate: '', actualEndDate: '', managerUsername: '', managerId: '',
};

export default function ProjectManagement() {
  const { user }                    = useAuth();
  const [projects, setProjects]     = useState([]);
  const [managers, setManagers]     = useState([]);
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
      const [projectsRes, managersRes] = await Promise.allSettled([
        getAllProjects(),
        getUserByRole('PROJECT_MANAGER'),
      ]);
      setProjects(projectsRes.status === 'fulfilled' ? (projectsRes.value.data?.data ?? []) : []);
      setManagers(managersRes.status === 'fulfilled' ? (managersRes.value.data?.data ?? managersRes.value.data ?? []) : []);
    } catch {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleManagerSelect = (e) => {
    const selected = managers.find(m => m.username === e.target.value);
    setForm(p => ({
      ...p,
      managerUsername: selected?.username || '',
      managerId:       selected?.userId   || '',
    }));
  };

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

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const counts = { ALL: projects.length, PLANNING: 0, ACTIVE: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0 };
  projects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  const displayed = filterStatus === 'ALL' ? projects : projects.filter(p => p.status === filterStatus);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading projects…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Project Management</h2>
          <p className="text-sm text-slate-400">{projects.length} projects · Lifecycle: PLANNING → ACTIVE → CLOSED</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RefreshCw size={13} /> Refresh</button>
          {isAdmin && (
            <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Status filter cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { key: 'ALL',       label: 'All',       color: '#64748b' },
          { key: 'PLANNING',  label: 'Planning',  color: '#F59E0B' },
          { key: 'ACTIVE',    label: 'Active',    color: '#22C55E' },
          { key: 'ON_HOLD',   label: 'On Hold',   color: '#F97316' },
          { key: 'COMPLETED', label: 'Completed', color: '#2563EB' },
          { key: 'CANCELLED', label: 'Cancelled', color: '#EF4444' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterStatus(s.key)}
            className="glass-card p-3 text-center transition-all"
            style={filterStatus === s.key ? { borderColor: s.color, borderWidth: 2, transform: 'translateY(-2px)' } : {}}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{counts[s.key] ?? 0}</p>
            <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Project Grid */}
      {displayed.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400 text-sm">
          {filterStatus === 'ALL'
            ? 'No projects found.'
            : `No ${filterStatus.toLowerCase().replace('_', ' ')} projects.`}
        </div>
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

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selected}
        managers={managers}
        onClose={() => setSelected(null)}
        onRefresh={fetchData}
        canManage={canManage}
        isAdmin={isAdmin}
      />

      {/* Create Project Modal */}
      {isAdmin && (
        <Modal
          open={showCreate}
          onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormErrors({}); }}
          title="Create New Project"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-xs text-slate-500 flex items-center gap-2"
              style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)' }}>
              <AlertTriangle size={13} className="text-blue-400 shrink-0" />
              New projects start in <strong className="text-amber-600">PLANNING</strong> status. Activate them from the detail view.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Project Name *</label>
                <input value={form.name}
                  onChange={e => { set('name')(e); if (e.target.value) setFormErrors(p => ({ ...p, name: '' })); }}
                  placeholder="e.g. City Bridge Renovation"
                  className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${formErrors.name ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                {formErrors.name && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{formErrors.name}</p>}
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Location *</label>
                <input value={form.location}
                  onChange={e => { set('location')(e); if (e.target.value) setFormErrors(p => ({ ...p, location: '' })); }}
                  placeholder="e.g. 123 Main St, New York, NY"
                  className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${formErrors.location ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                {formErrors.location && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{formErrors.location}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Budget ($) *</label>
                <input type="number" min="0.01" step="0.01" value={form.budget}
                  onChange={e => { set('budget')(e); if (e.target.value) setFormErrors(p => ({ ...p, budget: '' })); }}
                  placeholder="0.00"
                  className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${formErrors.budget ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                {formErrors.budget && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{formErrors.budget}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Manager Username</label>
                <select value={form.managerUsername} onChange={handleManagerSelect}
                  className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
                  <option value="">Select manager…</option>
                  {managers.map(m => (
                    <option key={m.userId} value={m.username}>{m.username}</option>
                  ))}
                </select>
                {managers.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">No project managers found.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Start Date *</label>
                <input type="date" value={form.startDate}
                  onChange={e => { set('startDate')(e); if (e.target.value) setFormErrors(p => ({ ...p, startDate: '' })); }}
                  className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${formErrors.startDate ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                {formErrors.startDate && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{formErrors.startDate}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">End Date *</label>
                <input type="date" value={form.endDate}
                  onChange={e => { set('endDate')(e); if (e.target.value) setFormErrors(p => ({ ...p, endDate: '' })); }}
                  className={`w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all ${formErrors.endDate ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`} />
                {formErrors.endDate && <p className="flex items-center gap-1 text-xs text-amber-500 mt-1"><AlertCircle size={11} className="shrink-0" />{formErrors.endDate}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
              <textarea value={form.description} onChange={set('description')} rows={3}
                placeholder="Optional project description…"
                className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all resize-none" />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button className="btn-secondary text-xs"
                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormErrors({}); }}>
                Cancel
              </button>
              <button className="btn-primary text-xs" onClick={handleCreate} disabled={saving}>
                {saving
                  ? <><Loader2 size={12} className="animate-spin" /> Creating…</>
                  : <><Briefcase size={12} /> Create Project</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
