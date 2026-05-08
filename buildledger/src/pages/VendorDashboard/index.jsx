import { useState, useEffect, useCallback } from 'react';
import { FileText, Clock, User, Truck, CreditCard, Package, RefreshCw, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllVendors, getVendorDocuments, downloadVendorDocument } from '../../api/vendors';
import { getContractsByVendor } from '../../api/contracts';
import { getAllDeliveries } from '../../api/deliveries';
import { getAllInvoices } from '../../api/invoices';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const toArray = (v) =>
  Array.isArray(v) ? v
  : Array.isArray(v?.documents) ? v.documents
  : Array.isArray(v?.items) ? v.items
  : [];

const looksLikeDocument = (v) => {
  if (!v || typeof v !== 'object') return false;
  return Boolean(v.documentId || v.fileUri || v.fileName || v.docType || v.documentType || v.verificationStatus || v.status);
};

const extractDocuments = (payload) => {
  const candidates = [
    payload, payload?.data, payload?.data?.data,
    payload?.documents, payload?.data?.documents,
    payload?.items, payload?.content, payload?.result,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const arr = toArray(c);
    if (arr.length) return arr;
    if (looksLikeDocument(c)) return [c];
    if (typeof c === 'string' && c.trim())
      return [{ fileUri: c.trim(), docType: 'OTHER', verificationStatus: 'PENDING' }];
  }
  return [];
};

const getDocumentIdFromDoc = (doc = {}) => {
  const id = doc.documentId || doc.docId || doc.id || doc.vendorDocumentId;
  return id ? String(id) : null;
};

const extractFileNameFromDisposition = (cd) => {
  if (!cd) return null;
  const utf8  = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) return decodeURIComponent(utf8);
  return cd.match(/filename="?([^";]+)"?/i)?.[1] || null;
};

const extractApiErrorMessage = async (err) => {
  const direct = err?.response?.data?.message || err?.message;
  if (direct && typeof direct === 'string' && !/Network Error/i.test(direct)) return direct;
  const blob = err?.response?.data;
  if (blob instanceof Blob) {
    try { const t = await blob.text(); return JSON.parse(t)?.message || t; } catch { /* ignore */ }
  }
  return 'Download failed';
};

const normalizeDocument = (doc = {}) => ({
  ...doc,
  documentId:   doc.documentId || doc.docId || doc.id || doc.vendorDocumentId,
  documentType: doc.documentType || doc.docType || 'OTHER',
  fileUri:      doc.fileUri || doc.uri || doc.url || doc.filePath,
  status:       doc.status || doc.verificationStatus || 'PENDING',
  uploadedAt:   doc.uploadedAt || doc.uploadedDate || doc.createdAt,
});

export default function VendorDashboard() {
  const { user } = useAuth();
  const [vendor,     setVendor]     = useState(null);
  const [docs,       setDocs]       = useState([]);
  const [contracts,  setContracts]  = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState({});

  const handleDownload = async (doc) => {
    const docId = getDocumentIdFromDoc(doc);
    setDownloading(p => ({ ...p, [docId]: true }));
    try {
      const res = await downloadVendorDocument({
        vendorId:   vendor?.vendorId,
        documentId: docId,
        docType:    doc.docType || doc.documentType,
        fileUri:    doc.fileUri,
      });
      const contentType = res.headers?.['content-type'] || 'application/pdf';
      if (/text\/html/i.test(contentType)) throw new Error('Unexpected HTML response');
      const url = URL.createObjectURL(new Blob([res.data], { type: contentType }));
      const a   = document.createElement('a');
      a.href    = url;
      const serverName = extractFileNameFromDisposition(res.headers?.['content-disposition']);
      a.download = serverName || `document-${docId || 'vendor'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(await extractApiErrorMessage(err));
    } finally {
      setDownloading(p => ({ ...p, [docId]: false }));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vendorRes  = await getAllVendors();
      const allVendors = vendorRes.data?.data || [];
      const mine       = allVendors.find(v => v.userId === user.userId || v.username === user.username);
      if (!mine) { setLoading(false); return; }
      setVendor(mine);

      const [docRes, contractRes, deliveryRes, invoiceRes] = await Promise.allSettled([
        getVendorDocuments(mine.vendorId),
        getContractsByVendor(mine.vendorId),
        getAllDeliveries(),
        getAllInvoices(),
      ]);
      const myContracts   = contractRes.status === 'fulfilled' ? (contractRes.value.data?.data || []) : [];
      const allDeliveries = deliveryRes.status === 'fulfilled' ? (deliveryRes.value.data?.data || []) : [];
      const allInvoices   = invoiceRes.status  === 'fulfilled' ? (invoiceRes.value.data?.data  || []) : [];
      const contractIds   = new Set(myContracts.map(c => c.contractId));

      setDocs(docRes.status === 'fulfilled' ? extractDocuments(docRes.value.data).map(normalizeDocument) : []);
      setContracts(myContracts);
      setDeliveries(allDeliveries.filter(d => contractIds.has(d.contractId)));
      setInvoices(allInvoices.filter(i => contractIds.has(i.contractId)));
    } catch {
      toast.error('Failed to load vendor profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const activeContracts  = contracts.filter(c => c.status === 'ACTIVE');
  const pendingContracts = contracts.filter(c => c.status === 'PENDING');
  const statusColor      = vendor?.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600';

  return (
    <div className="animate-fadeIn space-y-6">

      {/* Welcome banner */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.15) 0%,rgba(20,184,166,0.15) 100%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Vendor Portal</p>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{vendor?.name || user?.name || 'Welcome'}</h2>
            <p className="text-sm text-slate-500 mt-1">Category: {vendor?.category || '—'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="btn-secondary text-xs">
              <RefreshCw size={12} /> Refresh
            </button>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Account Status</p>
              <span className={`text-lg font-bold ${statusColor}`}>{vendor?.status || 'PENDING'}</span>
            </div>
          </div>
        </div>
        {pendingContracts.length > 0 && (
          <div className="relative mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/15 dark:border-amber-700/40">
            <Clock size={14} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              You have <strong>{pendingContracts.length}</strong> contract{pendingContracts.length > 1 ? 's' : ''} awaiting your acceptance.
              <a href="/vendor/contracts" className="ml-1 underline font-semibold">View Contracts →</a>
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Contracts',   value: activeContracts.length,                                  icon: FileText,   color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
          { label: 'Documents',          value: docs.length,                                              icon: Package,    color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
          { label: 'Pending Deliveries', value: deliveries.filter(d => d.status === 'PENDING').length,   icon: Truck,      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Invoices Submitted', value: invoices.length,                                          icon: CreditCard, color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Profile + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Profile */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <User size={15} /> Vendor Profile
          </h3>
          <div className="space-y-3">
            {[
              ['Vendor ID',    vendor?.vendorId],
              ['Company Name', vendor?.name],
              ['Email',        vendor?.email],
              ['Phone',        vendor?.phone],
              ['Category',     vendor?.category],
              ['Address',      vendor?.address],
              ['Status',       vendor?.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/30">
                <span className="text-xs text-slate-400">{k}</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[180px] text-right truncate">{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <FileText size={15} /> My Documents
          </h3>
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <FileText size={28} className="opacity-30" />
              <p className="text-xs">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((d, i) => {
                const docId  = getDocumentIdFromDoc(d);
                const isDown = downloading[docId];
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100 dark:border-slate-700/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={13} className="text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{d.documentType?.replace(/_/g, ' ') || `Document ${i + 1}`}</p>
                        <p className="text-[10px] text-slate-400">{d.uploadedAt?.slice(0, 10) || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge status={d.status === 'APPROVED' || d.status === 'VERIFIED' ? 'Completed' : d.status === 'REJECTED' ? 'Overdue' : 'Pending'} />
                      <button
                        onClick={() => handleDownload(d)}
                        disabled={isDown}
                        title="Download document"
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/35 disabled:opacity-50 transition-all"
                      >
                        {isDown
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Download size={11} />
                        }
                        {isDown ? 'Downloading…' : 'Download'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
