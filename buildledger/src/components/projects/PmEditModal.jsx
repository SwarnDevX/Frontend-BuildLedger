import { useState, useEffect } from 'react';
import { Button, FormInput, FormTextarea, InfoBox, Modal } from '../ui';
import { updateProjectNotes } from '../../api/projects';
import toast from 'react-hot-toast';

/**
 * PmEditModal — limited edit for PROJECT_MANAGER role.
 *
 * PM can only update:
 *   - description (progress notes)
 *   - actualEndDate (when work was completed on the ground)
 *
 * Calls PATCH /projects/{id}/notes — a PM-only endpoint.
 */
export default function PmEditModal({ project, open, onClose, onRefresh }) {
  const [description, setDescription]     = useState('');
  const [actualEndDate, setActualEndDate] = useState('');
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    if (open && project) {
      setDescription(project.description || '');
      setActualEndDate(project.actualEndDate || '');
    }
  }, [open, project]);

  if (!project) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectNotes(project.projectId, {
        description:   description   || undefined,
        actualEndDate: actualEndDate || undefined,
      });
      toast.success('Project progress updated');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Update Progress">
      <div className="space-y-4">
        <InfoBox variant="info">
          As Project Manager you can update the project progress notes and record the actual end date.
          Contact admin to change budget, dates, or other project details.
        </InfoBox>

        <FormTextarea
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Add or update project notes, progress summary…"
        />

        <FormInput
          label="Actual End Date"
          type="date"
          value={actualEndDate}
          onChange={e => setActualEndDate(e.target.value)}
          min={project.startDate || undefined}
          hint="Record the actual date work on this project ended or was completed"
        />

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" size="xs" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="xs" loading={saving} onClick={handleSave}>Save Notes</Button>
        </div>
      </div>
    </Modal>
  );
}
