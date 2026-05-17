/**
 * Status filter cards with count numbers — used on pages like Contracts, Projects.
 *
 * options: [{ key: string, label: string, color: string }]
 * counts:  { [key]: number }
 * value:   currently selected key
 * onChange: (key) => void
 * cols:    number of columns (2–6, default 6)
 */

const GRID = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-3 md:grid-cols-6',
  7: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7',
  8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
};

export default function StatusCards({ options, counts = {}, value, onChange, cols = 6 }) {
  const gridCls = GRID[cols] ?? GRID[6];
  return (
    <div className={`grid ${gridCls} gap-2`}>
      {options.map(s => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          className="glass-card p-3 text-center transition-all"
          style={
            value === s.key
              ? { borderColor: s.color, borderWidth: 2, transform: 'translateY(-2px)' }
              : {}
          }
        >
          <p className="text-xl font-bold" style={{ color: s.color }}>
            {counts[s.key] ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
        </button>
      ))}
    </div>
  );
}
