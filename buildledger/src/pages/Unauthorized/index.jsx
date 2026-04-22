import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 40%,#e8f4f8 100%)' }}>
      <div className="glass-card p-12 text-center max-w-md mx-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldOff size={28} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 mb-6">You don't have permission to view this page. Contact your administrator.</p>
        <Link to="/" className="btn-primary text-sm"><ArrowLeft size={14} /> Back to Dashboard</Link>
      </div>
    </div>
  );
}

