import { useState } from 'react';
import { Edit3, Trash2, FileEdit } from 'lucide-react';
import {
  Button, FormInput, FormSelect, FormTextarea, InfoBox, Modal, ProgressBar,
} from '../ui';
import { updateProject, deleteProject, updateProjectStatus } from '../../api/projects';
import { useBudgetSummary } from '../../hooks/useProjectBudget';
import ProjectTimeline from './ProjectTimeline';
import LifecycleActions from './LifecycleActions';
import PmEditModal from './PmEditModal';
import { statusMeta, TERMINAL_PROJECT } from '../../constants/projectConstants';
import { formatINR } from '../../utils/format';
import toast from 'react-hot-toast';

/**
 * ProjectDetailModal — shows full project details, budget breakdown,
 * and lifecycle actions.
 *
 * ADMIN: full edit (name, location, budget, manager, dates, description)
 * PROJECT_MANAGER: limited edit via PmEditModal (description + actual end date)
 */
export default function ProjectDetailModal({
  project, managers, onClose, onRefresh, canManage, isAdmin,
}) {
  const [tab, setTab]               = useState('details');
  const [editing, setEditing]       = useState(false);
  const [pmEditing, setPmEditing]   = useState(false);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const { summary, loading: loadingBudget } = useBudgetSummary(project?.projectId);

  if (!project) return null;

  const meta       = statusMeta(project.status);
  const isEditable = project.status === 'PLANNING' || project.status === 'ACTIVE';
  const isTerminal = TERMINAL_PROJECT.includes(project.status);

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
      onRefresh(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(project.projectId);
      toast.success('Project deleted');
      onClose(); onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const setF = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <Modal open={!!project} onClose={onClose} title={`Project: ${project.name}`} wide>
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

          {/* Status badge + progress bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />{meta.label}
            </span>
            <div className="flex-1 min-w-[140px]">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Progress</span><span className="font-semibold">{meta.progress}%</span>
              </div>
              <ProgressBar value={meta.progress} />
            </div>
          </div>

          {/* Lifecycle timeline */}
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

          {/* ── Details tab ── */}
          {tab === 'details' && (
            <div className="space-y-4">
              {!editing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      ['Name',       project.name      || '—'],
                      ['Location',   project.location  || '—'],
                      ['Start Date', project.startDate || '—'],
                      ['End Date',   project.endDate   || '—'],
                      ...(project.actualEndDate ? [['Actual End', project.actualEndDate]] : []),
                      ['Manager',    project.managerName || '—'],
                      ['Created',    project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{k}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl grid grid-cols-3 gap-3"
                    style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.1)' }}>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Total Budget</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatINR(summary?.totalBudget ?? project.budget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Spent</p>
                      {loadingBudget
                        ? <p className="text-xs text-slate-400">Loading…</p>
                        : <p className="text-sm font-bold text-amber-600">{formatINR(summary?.spent ?? 0)}</p>}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Remaining</p>
                      {loadingBudget
                        ? <p className="text-xs text-slate-400">Loading…</p>
                        : <p className={`text-sm font-bold ${summary?.overBudget ? 'text-red-500' : 'text-green-600'}`}>
                            {summary?.overBudget ? '⚠ ' : '✓ '}{formatINR(summary?.remaining ?? project.budget)}
                          </p>}
                    </div>
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
                    {isAdmin && isTerminal && (
                      <Button variant="secondary" size="xs" icon={<Edit3 size={12} />} onClick={openEdit}>
                        Set Actual End Date
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="danger" size="xs" icon={<Trash2 size={12} />} onClick={handleDelete}>Delete</Button>
                    )}
                    {!isAdmin && canManage && (
                      <Button variant="secondary" size="xs" icon={<FileEdit size={12} />}
                        onClick={() => setPmEditing(true)}>
                        Update Progress
                      </Button>
                    )}
                    <Button variant="secondary" size="xs" onClick={onClose}>Close</Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormInput label="Project Name" required dense className="col-span-2 sm:col-span-2"
                      value={editForm.name} onChange={setF('name')} placeholder="Project name"
                      error={editErrors.name} disabled={isTerminal} />
                    <FormInput label="Location" required dense className="col-span-1 sm:col-span-2"
                      value={editForm.location} onChange={setF('location')} placeholder="Project location"
                      error={editErrors.location} disabled={isTerminal} />
                    <FormInput label="Budget (₹)" required dense type="number"
                      value={editForm.budget} onChange={setF('budget')} placeholder="0.00"
                      error={editErrors.budget} disabled={isTerminal} />
                    <FormSelect label="Manager Username" dense
                      value={editForm.managerUsername} onChange={handleManagerChange}
                      hint={managers.length === 0 ? 'No project managers found.' : undefined}
                      disabled={isTerminal}>
                      <option value="">Select manager…</option>
                      {managers.map(m => <option key={m.userId} value={m.username}>{m.username}</option>)}
                    </FormSelect>
                    <FormInput label="Start Date" required dense type="date"
                      value={editForm.startDate} onChange={setF('startDate')}
                      error={editErrors.startDate} disabled={isTerminal} />
                    <FormInput label="End Date" required dense type="date"
                      value={editForm.endDate} onChange={setF('endDate')}
                      error={editErrors.endDate} disabled={isTerminal} />
                    {isTerminal && (
                      <FormInput label="Actual End Date" dense type="date" className="col-span-1 sm:col-span-2"
                        value={editForm.actualEndDate} onChange={setF('actualEndDate')}
                        min={editForm.startDate || undefined}
                        hint="Set the actual date this project ended" />
                    )}
                  </div>
                  {!isTerminal && (
                    <FormTextarea label="Description" value={editForm.description} onChange={setF('description')} />
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" size="xs"
                      onClick={() => { setEditing(false); setEditErrors({}); }}>Cancel</Button>
                    <Button variant="primary" size="xs" loading={saving} onClick={handleSave}>Save Changes</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Lifecycle Actions tab ── */}
          {tab === 'actions' && (
            <div className="space-y-4">
              <InfoBox variant="info">
                {project.status === 'PLANNING' && isAdmin  && 'PLANNING → ACTIVE (activate) or CANCELLED.'}
                {project.status === 'PLANNING' && !isAdmin && 'This project is in PLANNING. Only admin can activate or cancel it.'}
                {project.status === 'ACTIVE'               && 'ACTIVE → ON_HOLD (you can put on hold). Admin can also mark Completed or Cancel.'}
                {project.status === 'ON_HOLD'              && 'ON_HOLD → ACTIVE (you can resume). Admin can also cancel.'}
                {TERMINAL_PROJECT.includes(project.status) && 'This project is in a terminal state — no further transitions available.'}
              </InfoBox>
              <LifecycleActions
                project={project} onStatusChange={handleStatusChange}
                canManage={canManage} isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </Modal>

      <PmEditModal
        project={project}
        open={pmEditing}
        onClose={() => setPmEditing(false)}
        onRefresh={onRefresh}
      />
    </>
  );
}
