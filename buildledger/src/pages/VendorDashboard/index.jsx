import { useState, useEffect } from 'react';
import { FileText, Upload, Clock, CheckCircle2, AlertTriangle, Package, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllVendors, getVendorDocuments, uploadVendorDocument } from '../../api/vendors';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.documents)) return value.documents;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const normalizeDocument = (doc = {}) => ({
  ...doc,
  documentType: doc.documentType || doc.docType || 'OTHER',
  status: doc.status || doc.verificationStatus || 'PENDING',
  uploadedAt: doc.uploadedAt || doc.uploadedDate || doc.createdAt,
});

export default function VendorDashboard() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAllVendors();
        const allVendors = res.data?.data || [];
        const mine = allVendors.find(v => v.userId === user.userId || v.username === user.username);
        if (mine) {
          setVendor(mine);
          try {
            const docRes = await getVendorDocuments(mine.vendorId);
            setDocs(toArray(docRes.data?.data).map(normalizeDocument));
          } catch { setDocs([]); }
        }
      } catch { toast.error('Failed to load vendor profile'); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleUpload = async (e) => {
    if (!vendor) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    try {
      await uploadVendorDocument(vendor.vendorId, file, 'OTHER');
      toast.success('Document uploaded successfully!');
      const docRes = await getVendorDocuments(vendor.vendorId);
      setDocs(toArray(docRes.data?.data).map(normalizeDocument));
    } catch { toast.error('Upload failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const statusColor = vendor?.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600';

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Welcome banner */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.15) 0%,rgba(20,184,166,0.15) 100%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Vendor Portal</p>
            <h2 className="text-xl font-bold text-slate-800">{vendor?.name || user?.name || 'Welcome'}</h2>
            <p className="text-sm text-slate-500 mt-1">Category: {vendor?.category || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Account Status</p>
            <span className={`text-lg font-bold ${statusColor}`}>{vendor?.status || 'PENDING'}</span>
          </div>
        </div>
        {vendor?.status === 'PENDING' && (
          <div className="relative mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <Clock size={14} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">Your account is <strong>pending review</strong>. Upload required documents to speed up approval.</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Contracts', value: '—', icon: FileText, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
          { label: 'Documents Uploaded', value: docs.length, icon: Upload, color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
          { label: 'Pending Reviews', value: docs.filter(d => d.status === 'PENDING').length, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Verified Docs', value: docs.filter(d => d.status === 'APPROVED' || d.status === 'VERIFIED').length, icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile info */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><User size={15} />Vendor Profile</h3>
          <div className="space-y-3">
            {[
              ['Vendor ID', vendor?.vendorId],
              ['Company Name', vendor?.name],
              ['Email', vendor?.email],
              ['Phone', vendor?.phone],
              ['Category', vendor?.category],
              ['Address', vendor?.address],
              ['Status', vendor?.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-400">{k}</span>
                <span className="text-xs font-medium text-slate-700 max-w-[180px] text-right truncate">{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><FileText size={15} />My Documents</h3>
            {vendor && (
              <label className="btn-primary text-xs cursor-pointer">
                <Upload size={12} /> Upload
                <input type="file" accept=".pdf,.png,.jpg" className="hidden" onChange={handleUpload} />
              </label>
            )}
          </div>
          {docs.length === 0 ? (
            <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-2xl cursor-pointer transition-all border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30">
              <Upload size={22} className="text-slate-300" />
              <p className="text-xs text-slate-400">No documents uploaded yet</p>
              <p className="text-xs text-blue-500 font-medium">Click to upload</p>
              <input type="file" accept=".pdf,.png,.jpg" className="hidden" onChange={handleUpload} />
            </label>
          ) : (
            <div className="space-y-2">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-blue-500" />
                    <div>
                      <p className="text-xs font-medium text-slate-700">{d.documentType || d.fileName || `Document ${i + 1}`}</p>
                      <p className="text-[10px] text-slate-400">{d.uploadedAt?.slice(0, 10) || '—'}</p>
                    </div>
                  </div>
                  <Badge status={d.status === 'APPROVED' || d.status === 'VERIFIED' ? 'Completed' : d.status === 'REJECTED' ? 'Overdue' : 'Pending'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



