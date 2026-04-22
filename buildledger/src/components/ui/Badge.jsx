import { cn } from '../../utils/cn';

export default function Badge({ status }) {
  const map = {
    'Active': 'bg-green-100 text-green-700 border-green-200',
    'Completed': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'Pending Approval': 'bg-amber-100 text-amber-700 border-amber-200',
    'On Hold': 'bg-slate-100 text-slate-600 border-slate-200',
    'Inactive': 'bg-slate-100 text-slate-500 border-slate-200',
    'Under Review': 'bg-purple-100 text-purple-700 border-purple-200',
    'Overdue': 'bg-red-100 text-red-700 border-red-200',
    'Approved': 'bg-teal-100 text-teal-700 border-teal-200',
    'Paid': 'bg-green-100 text-green-700 border-green-200',
    'In Transit': 'bg-blue-100 text-blue-700 border-blue-200',
    'Scheduled': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Compliant': 'bg-green-100 text-green-700 border-green-200',
    'Pending Review': 'bg-amber-100 text-amber-700 border-amber-200',
    'Flag': 'bg-red-100 text-red-700 border-red-200',
    'Admin': 'bg-blue-100 text-blue-700 border-blue-200',
    'Project Manager': 'bg-teal-100 text-teal-700 border-teal-200',
    'Finance': 'bg-purple-100 text-purple-700 border-purple-200',
    'Operations': 'bg-amber-100 text-amber-700 border-amber-200',
    'Viewer': 'bg-slate-100 text-slate-500 border-slate-200',
    'Compliance': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      map[status] || 'bg-slate-100 text-slate-600 border-slate-200'
    )}>
      {status}
    </span>
  );
}

