import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import {
  Button, EmptyState, FormInput, FormSelect, FormTextarea,
  InfoBox, Modal, PageHeader, StatusCards,
} from '../../components/ui';
import {
  getAllProjects, getMyProjects, createProject,
} from '../../api/projects';
import { getUserByRole } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import ProjectCard from './ProjectCard';
import ProjectDetailModal from './ProjectDetailModal';
import { STATUS_OPTIONS, TERMINAL_PROJECT, EMPTY_FORM } from './projectConstants';

// Today's date in YYYY-MM-DD — used as min for date inputs to blur past dates
const TODAY = new Date().toISOString().split('T')[0];

/**
 * ProjectManagement — main page.
 *
 * Role behaviour:
 * - ADMIN: sees all projects, can create, full edit, delete, all lifecycle transitions
 * - PROJECT_MANAGER: sees only assigned projects, limited edit (notes + actual end date),
 *                    can put on hold / resume
 */
export default function ProjectManagement() {
  const { user }                        = useAuth();
  const [projects, setProjects]         = useState([]);
  const [managers, setManagers]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [formErrors, setFormErrors]     = useState({});

  const isAdmin   = user?.role === 'ADMIN';
  const canManage = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateCreate = () => {
    const e = {};
    if (!form.name)      e.name      = 'Project name is required';
    if (!form.location)  e.location  = 'Location is required';
    if (!form.budget)    e.budget    = 'Budget is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate)   e.endDate   = 'End date is required';

    // Start date cannot be in the past
    if (form.startDate && form.startDate < TODAY)
      e.startDate = 'Start date cannot be in the past';

    // End date must be after start date
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      e.endDate = 'End date must be after start date';

    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ADMIN → GET /projects (all)
      // PROJECT_MANAGER → GET /projects/my (assigned only)
      const projectFn = isAdmin ? getAllProjects : getMyProjects;
      const [pr, mr] = await Promise.allSettled([
        projectFn(),
        getUserByRole('PROJECT_MANAGER'),
      ]);
      setProjects(pr.status === 'fulfilled' ? (pr.value.data?.data ?? []) : []);
      setManagers(mr.status === 'fulfilled' ? (mr.value.data?.data ?? mr.value.data ?? []) : []);
    } catch {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create project ──────────────────────────────────────────────────────────

  const handleManagerSelect = (e) => {
    const sel = managers.find(m => m.username === e.target.value);
    setForm(p => ({ ...p, managerUsername: sel?.username || '', managerId: sel?.userId || '' }));
  };

  const set        = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const clearError = (k) => setFormErrors(p => ({ ...p, [k]: '' }));

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setSaving(true);
    try {
      await createProject({
        name:        form.name,
        description: form.description     || undefined,
        location:    form.location,
        budget:      Number(form.budget),
        startDate:   form.startDate,
        endDate:     form.endDate,
        managerId:   form.managerId       || undefined,
        managerName: form.managerUsername || undefined,
      });
      toast.success('Project created successfully');
      setShowCreate(false); setForm(EMPTY_FORM); fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally { setSaving(false); }
  };

  const closeCreate = () => { setShowCreate(false); setForm(EMPTY_FORM); setFormErrors({}); };

  // ── Counts for status filter cards ─────────────────────────────────────────

  const counts = { ALL: projects.length, PLANNING: 0, ACTIVE: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0 };
  projects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  const displayed = filterStatus === 'ALL'
    ? projects
    : projects.filter(p => p.status === filterStatus);

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading projects…</span>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fadeIn space-y-5">

      <PageHeader
        title="Project Management"
        subtitle={
          isAdmin
            ? `${projects.length} projects · Lifecycle: PLANNING → ACTIVE → CLOSED`
            : `${projects.length} project${projects.length !== 1 ? 's' : ''} assigned to you`
        }
        actions={
          <>
            <Button variant="secondary" size="xs" onClick={fetchData}>Refresh</Button>
            {isAdmin && (
              <Button variant="primary" size="xs" onClick={() => setShowCreate(true)}>+ New Project</Button>
            )}
          </>
        }
      />

      <StatusCards
        options={STATUS_OPTIONS} counts={counts}
        value={filterStatus} onChange={setFilterStatus}
      />

      {displayed.length === 0 ? (
        <EmptyState icon={Briefcase}
          message={
            filterStatus === 'ALL'
              ? isAdmin ? 'No projects found.' : 'No projects assigned to you yet.'
              : `No ${filterStatus.toLowerCase().replace('_', ' ')} projects.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(p => (
            <ProjectCard
              key={p.projectId} p={p} canManage={canManage}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      {/* Detail modal — opens when a card is clicked */}
      <ProjectDetailModal
        project={selected} managers={managers}
        onClose={() => setSelected(null)} onRefresh={fetchData}
        canManage={canManage} isAdmin={isAdmin}
      />

      {/* Create project modal — admin only */}
      {isAdmin && (
        <Modal open={showCreate} onClose={closeCreate} title="Create New Project">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <InfoBox variant="info">
              New projects start in <strong className="text-amber-600">PLANNING</strong> status.
              Activate them from the detail view.
            </InfoBox>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Project Name" required className="col-span-2"
                value={form.name} placeholder="e.g. City Bridge Renovation"
                onChange={e => { set('name')(e); clearError('name'); }} error={formErrors.name} />
              <FormInput label="Location" required className="col-span-2"
                value={form.location} placeholder="e.g. Chennai, Tamil Nadu"
                onChange={e => { set('location')(e); clearError('location'); }} error={formErrors.location} />
              <FormInput label="Budget (₹)" required type="number" min="0.01" step="0.01"
                value={form.budget} placeholder="0.00"
                onChange={e => { set('budget')(e); clearError('budget'); }} error={formErrors.budget} />
              <FormSelect label="Manager Username"
                value={form.managerUsername} onChange={handleManagerSelect}
                hint={managers.length === 0 ? 'No project managers found.' : undefined}>
                <option value="">Select manager…</option>
                {managers.map(m => <option key={m.userId} value={m.username}>{m.username}</option>)}
              </FormSelect>

              {/* Start Date — min=TODAY blurs all past dates in the calendar */}
              <FormInput label="Start Date" required type="date"
                value={form.startDate}
                min={TODAY}
                onChange={e => { set('startDate')(e); clearError('startDate'); clearError('endDate'); }}
                error={formErrors.startDate} />

              {/* End Date — min=startDate so end can never be before start */}
              <FormInput label="End Date" required type="date"
                value={form.endDate}
                min={form.startDate || TODAY}
                onChange={e => { set('endDate')(e); clearError('endDate'); }}
                error={formErrors.endDate} />
            </div>
            <FormTextarea label="Description" value={form.description} onChange={set('description')}
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