export default function ProgressBar({ value, color = '#2563EB', height = 6, showLabel = false }) {
  const clamp = Math.min(100, Math.max(0, value));
  const getColor = () => {
    if (clamp === 100) return '#22C55E';
    if (clamp >= 60) return color;
    if (clamp >= 30) return '#F59E0B';
    return '#EF4444';
  };
  const c = color === '#2563EB' ? getColor() : color;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height, background: 'rgba(0,0,0,0.07)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamp}%`, background: c }}
        />
      </div>
      {showLabel && <span className="text-xs font-semibold text-slate-500 w-8 text-right">{clamp}%</span>}
    </div>
  );
}

