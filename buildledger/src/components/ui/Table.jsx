/**
 * Compound table components matching the existing glass-card table pattern.
 *
 * Usage:
 *   <Table>
 *     <TableHead>
 *       <TableHeader>Name</TableHeader>
 *       <TableHeader>Status</TableHeader>
 *     </TableHead>
 *     <TableBody>
 *       {rows.map(r => (
 *         <TableRow key={r.id} onClick={() => setSelected(r)} selected={selected?.id === r.id}>
 *           <TableCell>{r.name}</TableCell>
 *           <TableCell><Badge status={r.status} /></TableCell>
 *         </TableRow>
 *       ))}
 *     </TableBody>
 *   </Table>
 */

export function Table({ children, className = '', elevated = true }) {
  const table = <table className="w-full text-sm">{children}</table>;
  if (!elevated) return table;
  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        {table}
      </div>
    </div>
  );
}

export function TableHead({ children }) {
  return (
    <thead className="bg-slate-50/60 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/40">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeader({ children, className = '' }) {
  return (
    <th className={`text-left px-5 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function TableBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, onClick, selected = false, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={[
        'border-b border-slate-50 dark:border-slate-700/20 transition-colors',
        onClick ? 'cursor-pointer hover:bg-white/50 dark:hover:bg-slate-700/20' : '',
        selected ? 'bg-blue-50/40 dark:bg-blue-500/10' : '',
        className,
      ].join(' ')}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', ...rest }) {
  return (
    <td className={`px-5 py-3 ${className}`} {...rest}>
      {children}
    </td>
  );
}
