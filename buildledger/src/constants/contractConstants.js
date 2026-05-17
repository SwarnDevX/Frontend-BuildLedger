// ─── Status metadata ──────────────────────────────────────────────────────────

export function statusMeta(status) {
  return {
    DRAFT:      { label: 'Draft',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  progress: 5   },
    PENDING:    { label: 'Pending',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  progress: 30  },
    ACTIVE:     { label: 'Active',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   progress: 55  },
    COMPLETED:  { label: 'Completed',  color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   progress: 100 },
    TERMINATED: { label: 'Terminated', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   progress: 100 },
    EXPIRED:    { label: 'Expired',    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', progress: 100 },
    REJECTED:   { label: 'Rejected',   color: '#DC2626', bg: 'rgba(220,38,38,0.12)',   progress: 0   },
  }[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', progress: 10 };
}

// ─── Status filter options ────────────────────────────────────────────────────

export const STATUS_OPTIONS = [
  { key: 'ALL',        label: 'All',        color: '#64748b' },
  { key: 'DRAFT',      label: 'Draft',      color: '#F59E0B' },
  { key: 'PENDING',    label: 'Pending',    color: '#8B5CF6' },
  { key: 'ACTIVE',     label: 'Active',     color: '#22C55E' },
  { key: 'COMPLETED',  label: 'Completed',  color: '#2563EB' },
  { key: 'TERMINATED', label: 'Terminated', color: '#EF4444' },
  { key: 'EXPIRED',    label: 'Expired',    color: '#94a3b8' },
  { key: 'REJECTED',   label: 'Rejected',   color: '#DC2626' },
];

// ─── Terminal contract statuses — no further transitions ──────────────────────

export const TERMINAL_STATUSES = ['COMPLETED', 'TERMINATED', 'EXPIRED', 'REJECTED'];

// ─── Empty create form ────────────────────────────────────────────────────────

export const EMPTY_FORM = {
  vendorId: '', projectId: '', startDate: '', endDate: '', value: '', description: '',
};

// ─── Term card validation ─────────────────────────────────────────────────────

export function validateTermCard(c) {
  if (!c.description.trim())           return 'Description is required';
  if (c.description.trim().length < 3) return 'Must be at least 3 characters';
  return '';
}

export const newCard = () => ({
  id: Date.now(), description: '', complianceFlag: false, error: '',
});
