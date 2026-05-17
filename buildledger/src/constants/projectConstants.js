// ─── Status metadata — color, background, progress percentage ─────────────────

export function statusMeta(status) {
  return {
    PLANNING:  { label: 'Planning',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  progress: 10  },
    ACTIVE:    { label: 'Active',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   progress: 55  },
    ON_HOLD:   { label: 'On Hold',   color: '#F97316', bg: 'rgba(249,115,22,0.12)',  progress: 35  },
    COMPLETED: { label: 'Completed', color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   progress: 100 },
    CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   progress: 100 },
  }[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', progress: 10 };
}

// ─── Status filter options for StatusCards ────────────────────────────────────

export const STATUS_OPTIONS = [
  { key: 'ALL',       label: 'All',       color: '#64748b' },
  { key: 'PLANNING',  label: 'Planning',  color: '#F59E0B' },
  { key: 'ACTIVE',    label: 'Active',    color: '#22C55E' },
  { key: 'ON_HOLD',   label: 'On Hold',   color: '#F97316' },
  { key: 'COMPLETED', label: 'Completed', color: '#2563EB' },
  { key: 'CANCELLED', label: 'Cancelled', color: '#EF4444' },
];

// ─── Terminal project statuses ────────────────────────────────────────────────

export const TERMINAL_PROJECT = ['COMPLETED', 'CANCELLED'];

// ─── Empty form defaults for create modal ─────────────────────────────────────

export const EMPTY_FORM = {
  name: '', description: '', location: '', budget: '',
  startDate: '', endDate: '', actualEndDate: '', managerUsername: '', managerId: '',
};
