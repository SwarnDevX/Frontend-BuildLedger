export default function PageBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-48 -left-24 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 65%)', filter: 'blur(40px)' }} />
      <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 65%)', filter: 'blur(50px)' }} />
      <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)', filter: 'blur(40px)' }} />
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
    </div>
  );
}
