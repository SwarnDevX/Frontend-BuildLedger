import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Filter, Star, MapPin, Mail, Upload, X, Plus, AlertTriangle,
  Loader2, RefreshCw, FileText, Eye, ThumbsUp, ThumbsDown, Download, UploadCloud,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import {
  getAllVendors, deleteVendor, getVendorDocuments,
  uploadVendorDocument, verifyDocument, getPendingDocuments, downloadVendorDocument, updateVendor,
} from '../../api/vendors';
import { createInternalVendorUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DOC_TYPES = ['PAN_CARD', 'GST_CERTIFICATE', 'TRADE_LICENSE', 'MSME_CERTIFICATE', 'BANK_STATEMENT', 'INCORPORATION_CERTIFICATE', 'OTHER'];
const statusFilters = ['All', 'ACTIVE', 'PENDING', 'REJECTED'];

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.documents)) return value.documents;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const normalizeDocument = (doc = {}) => ({
  ...doc,
  documentId: doc.documentId || doc.docId || doc.id || doc.vendorDocumentId,
  fileUri: doc.fileUri || doc.uri || doc.url || doc.filePath,
  docType: doc.docType || doc.documentType || 'OTHER',
  verificationStatus: doc.verificationStatus || doc.status || 'PENDING',
  uploadedDate: doc.uploadedDate || doc.uploadedAt || doc.createdAt,
});

const looksLikeDocument = (value) => {
  if (!value || typeof value !== 'object') return false;
  return Boolean(
    value.documentId || value.fileUri || value.fileName || value.docType || value.documentType || value.verificationStatus || value.status
  );
};

const extractDocuments = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.documents,
    payload?.data?.documents,
    payload?.items,
    payload?.content,
    payload?.result,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const arr = toArray(candidate);
    if (arr.length) return arr;
    if (looksLikeDocument(candidate)) return [candidate];
    if (typeof candidate === 'string' && candidate.trim()) {
      return [{ fileUri: candidate.trim(), docType: 'OTHER', verificationStatus: 'PENDING' }];
    }
  }

  return [];
};

const getDocumentIdFromDoc = (doc = {}) => {
  const directId = doc.documentId || doc.docId || doc.id || doc.vendorDocumentId;
  return directId ? String(directId) : null;
};

const extractFileNameFromDisposition = (contentDisposition) => {
  if (!contentDisposition) return null;
  const utf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) return decodeURIComponent(utf8);
  const plain = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
  return plain || null;
};

const extractApiErrorMessage = async (err) => {
  const direct = err?.response?.data?.message || err?.message;
  if (direct && typeof direct === 'string' && !/Network Error/i.test(direct)) return direct;

  const blobData = err?.response?.data;
  if (blobData instanceof Blob) {
    try {
      const text = await blobData.text();
      const parsed = JSON.parse(text);
      return parsed?.message || parsed?.error || text;
    } catch {
      return 'Download failed';
    }
  }

  return 'Download failed';
};

function StatusDot({ status }) {
  const map = { ACTIVE: 'bg-green-500', PENDING: 'bg-amber-500', REJECTED: 'bg-red-500' };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] || 'bg-slate-300'}`} />;
}

function DocStatusBadge({ status }) {
  const cfg = {
    PENDING:  'bg-amber-50 text-amber-700 border border-amber-200',
    APPROVED: 'bg-green-50 text-green-700 border border-green-200',
    REJECTED: 'bg-red-50 text-red-600 border border-red-200',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

function VendorProfilePanel({ vendor, onClose, refreshVendors, refreshPending, onVendorStatusChange }) {
  const { user } = useAuth();
  const [docs, setDocs]           = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('PAN_CARD');
  const [dragOver, setDragOver]   = useState(false);
  const [reviewing, setReviewing] = useState({});
  const fileInputRef              = useRef(null);

  const canReview  = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);
  const canUpload  = user?.role === 'VENDOR';

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const r = await getVendorDocuments(vendor.vendorId);
      const normalized = extractDocuments(r.data).map(normalizeDocument);
      setDocs(normalized);
    } catch { setDocs([]); }
    finally { setLoadingDocs(false); }
  }, [vendor?.vendorId]);

  useEffect(() => {
    if (!vendor?.vendorId) return;
    fetchDocs();
  }, [vendor?.vendorId, fetchDocs]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return; }
    setUploading(true);
    try {
      await uploadVendorDocument(vendor.vendorId, file, selectedDocType);
      toast.success('Document uploaded successfully! Awaiting review.');
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleFileInput = (e) => handleUpload(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleUpload(e.dataTransfer.files?.[0]);
  };

  const handleVerify = async (docId, status) => {
    if (!canReview) {
      toast.error('Only Admin or Project Manager can review documents');
      return;
    }
    setReviewing(r => ({ ...r, [docId]: true }));
    try {
      await verifyDocument(docId, {
        status,
        reviewRemarks: status === 'APPROVED' ? 'Approved by reviewer' : 'Rejected by reviewer',
        username: user?.username || user?.name || 'system',
      });

      const nextVendorStatus = status === 'APPROVED' ? 'ACTIVE' : 'REJECTED';
      try {
        await updateVendor(vendor.vendorId, { status: nextVendorStatus });
      } catch {
        // Backend may already set status from review endpoint; keep UI refresh behavior.
      }

      if (status === 'APPROVED' && ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role) && vendor?.status !== 'ACTIVE') {
        const encodedPassword = vendor?.encodedPassword || vendor?.passwordEncoded || vendor?.passwordHash;
        if (vendor?.username && encodedPassword && vendor?.name) {
          try {
            await createInternalVendorUser({
              username: vendor.username,
              encodedPassword,
              name: vendor.name,
              email: vendor.email,
              phone: vendor.phone,
            });
            toast.success('Vendor account activated');
          } catch (accountErr) {
            const msg = accountErr.response?.data?.message;
            if (msg && /exist|already/i.test(msg)) {
              toast('Vendor account already exists');
            } else {
              toast.error(msg || 'Document approved, but vendor account creation failed');
            }
          }
        } else {
          toast('Document approved. Vendor account payload is incomplete; skipped account creation.');
        }
      }

      onVendorStatusChange?.(vendor.vendorId, nextVendorStatus);
      toast.success(status === 'APPROVED' ? 'Document accepted' : 'Document rejected');
      fetchDocs();
      refreshVendors?.();
      refreshPending?.();
    } catch { toast.error('Action failed'); }
    finally { setReviewing(r => ({ ...r, [docId]: false })); }
  };


  const handleDownload = async (doc) => {
    const docId = getDocumentIdFromDoc(doc);
    try {
      const res = await downloadVendorDocument({
        vendorId: vendor?.vendorId,
        documentId: docId,
        docType: doc.docType || doc.documentType,
        fileUri: doc.fileUri,
      });
      const contentType = res.headers?.['content-type'] || 'application/pdf';

      // Guard against accidental HTML error payloads.
      if (/text\/html/i.test(contentType)) throw new Error('Unexpected HTML response');

      const url = URL.createObjectURL(new Blob([res.data], { type: contentType }));
      const a = document.createElement('a');
      a.href = url;
      const serverName = extractFileNameFromDisposition(res.headers?.['content-disposition']);
      a.download = serverName || `document-${docId || 'vendor'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const status = err?.response?.status;
      const message = await extractApiErrorMessage(err);
      toast.error(status ? `${message} (${status})` : message);
    }
  };

  return (
    <div className="glass-card p-6 animate-slideInRight space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Vendor header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {(vendor.name || 'V').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{vendor.name}</h3>
            <p className="text-xs text-slate-400">{vendor.category || 'No category'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-all">
          <X size={16} />
        </button>
      </div>

      {/* Info grid */}
      <div className="space-y-2">
        {[['Email', vendor.email], ['Phone', vendor.phone], ['Address', vendor.address], ['Contact', vendor.contactInfo]].map(
          ([k, v]) => v && (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-slate-400 w-16 shrink-0">{k}</span>
              <span className="text-slate-700 font-medium break-all">{v}</span>
            </div>
          )
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-around py-3 border-y border-slate-100">
        {[['Vendor ID', vendor.vendorId], ['Status', vendor.status], ['Joined', vendor.createdAt?.slice(0, 10)]].map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-xs font-bold text-slate-800">{val || '—'}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>


      {/* Upload section */}
      {canUpload && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <UploadCloud size={13} className="text-blue-500" /> Upload Document
          </p>

          {/* Doc type selector */}
          <select
            value={selectedDocType}
            onChange={e => setSelectedDocType(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all
              ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'}
              ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {uploading ? (
              <Loader2 size={24} className="animate-spin text-blue-500" />
            ) : (
              <UploadCloud size={24} className={`${dragOver ? 'text-blue-500' : 'text-slate-400'} transition-colors`} />
            )}
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-600">
                {uploading ? 'Uploading…' : dragOver ? 'Drop PDF here' : 'Click or drag PDF to upload'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Only PDF files • Max 10 MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileInput} />
          </div>
        </div>
      )}

      {/* Documents list */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
          <FileText size={13} className="text-blue-400" />
          Documents
          {loadingDocs && <Loader2 size={11} className="animate-spin text-blue-500 ml-1" />}
          <span className="ml-auto text-[10px] font-normal text-slate-400">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
        </p>

        {docs.length === 0 && !loadingDocs && (
          <div className="flex flex-col items-center gap-1 py-6 text-slate-400">
            <FileText size={28} className="opacity-30" />
            <p className="text-xs">No documents uploaded yet</p>
          </div>
        )}

        <div className="space-y-2">
          {docs.map((d, i) => (
            <div key={d.documentId || i} className="p-3 rounded-2xl bg-white/60 border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{(d.docType || 'Document').replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-slate-400 truncate" title={d.fileUri}>{d.fileUri || '—'}</p>
                    <p className="text-[10px] text-slate-400">{d.uploadedDate || d.createdAt?.slice(0, 10) || '—'}</p>
                  </div>
                </div>
                <DocStatusBadge status={d.verificationStatus} />
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                {/* Download */}
                <button
                  onClick={() => handleDownload(d)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
                >
                  <Download size={11} /> Download
                </button>

                {/* Accept / Reject — ADMIN & PROJECT_MANAGER only */}
                {canReview && (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(d.documentId, 'APPROVED')}
                      disabled={reviewing[d.documentId] || d.verificationStatus === 'APPROVED'}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all
                        ${d.verificationStatus === 'APPROVED'
                          ? 'bg-green-100 text-green-600 cursor-default'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-50'}`}
                    >
                      {reviewing[d.documentId] ? <Loader2 size={10} className="animate-spin" /> : <ThumbsUp size={11} />}
                      {d.verificationStatus === 'APPROVED' ? 'Accepted' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleVerify(d.documentId, 'REJECTED')}
                      disabled={reviewing[d.documentId] || d.verificationStatus === 'REJECTED'}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all
                        ${d.verificationStatus === 'REJECTED'
                          ? 'bg-red-100 text-red-600 cursor-default'
                          : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50'}`}
                    >
                      {reviewing[d.documentId] ? <Loader2 size={10} className="animate-spin" /> : <ThumbsDown size={11} />}
                      {d.verificationStatus === 'REJECTED' ? 'Rejected' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VendorManagement() {
  const { user } = useAuth();
  const [vendors, setVendors]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected]       = useState(null);
  const [pendingDocs, setPendingDocs] = useState([]);

  const handleVendorStatusChange = (vendorId, status) => {
    setVendors(prev => prev.map(v => (v.vendorId === vendorId ? { ...v, status } : v)));
    setSelected(prev => (prev?.vendorId === vendorId ? { ...prev, status } : prev));
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await getAllVendors();
      setVendors(res.data?.data || []);
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  };

  const fetchPending = async () => {
    try {
      const r = await getPendingDocuments();
      setPendingDocs(toArray(r.data?.data));
    } catch { setPendingDocs([]); }
  };

  useEffect(() => {
    fetchVendors();
    if (['ADMIN', 'PROJECT_MANAGER'].includes(user?.role)) fetchPending();
  }, [user]);

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !search || (v.name || '').toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (v) => {
    if (!confirm(`Delete vendor "${v.name}"?`)) return;
    try { await deleteVendor(v.vendorId); toast.success('Vendor deleted'); fetchVendors(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Vendor Management</h2>
          <p className="text-sm text-slate-400">{vendors.length} vendors registered</p>
        </div>
        <button onClick={fetchVendors} className="btn-secondary text-xs flex items-center gap-1.5 self-start">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Pending docs alert */}
      {pendingDocs.length > 0 && (
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-amber-400">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-700">
              {pendingDocs.length} document{pendingDocs.length > 1 ? 's' : ''} pending review
            </p>
            <p className="text-[10px] text-slate-400">Click a vendor to review and approve/reject documents</p>
          </div>
        </div>
      )}

      {/* Status stats */}
      <div className="grid grid-cols-3 gap-3">
        {['ACTIVE', 'PENDING', 'REJECTED'].map(s => {
          const count = vendors.filter(v => v.status === s).length;
          return (
            <div key={s} className={`glass-card p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md
              ${statusFilter === s ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}>
              <StatusDot status={s} />
              <div>
                <p className="text-lg font-bold text-slate-800">{count}</p>
                <p className="text-[10px] text-slate-400 capitalize">{s.toLowerCase()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-3 py-2 flex-1">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full"
            placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400 hover:text-slate-600" /></button>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {statusFilters.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                ${statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white/60 text-slate-500 border border-white/80 hover:bg-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table + Side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`glass-card overflow-hidden ${selected ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin text-blue-500" />
              <span className="text-sm">Loading vendors…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/60 border-b border-slate-100">
                  <tr>
                    {['Vendor', 'Category', 'Status', 'Email', 'Phone', 'Since', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.vendorId}
                      onClick={() => setSelected(selected?.vendorId === v.vendorId ? null : v)}
                      className={`border-b border-slate-50 cursor-pointer transition-all
                        ${selected?.vendorId === v.vendorId ? 'bg-blue-50/40' : 'hover:bg-white/50'}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {(v.name || 'V').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{v.name}</p>
                            {v.username && <p className="text-[10px] text-slate-400">@{v.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{v.category || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-1.5 text-[10px] font-semibold w-fit
                          ${v.status === 'ACTIVE' ? 'text-green-700' : v.status === 'PENDING' ? 'text-amber-700' : 'text-red-700'}`}>
                          <StatusDot status={v.status} /> {v.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">{v.email}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{v.phone || '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{v.createdAt?.slice(0, 10) || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); setSelected(v); }}
                            className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                            <Eye size={11} /> View
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button onClick={e => { e.stopPropagation(); handleDelete(v); }}
                              className="text-xs text-red-500 hover:underline font-medium">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                        No vendors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <VendorProfilePanel
            vendor={selected}
            onClose={() => setSelected(null)}
            refreshVendors={fetchVendors}
            refreshPending={fetchPending}
            onVendorStatusChange={handleVendorStatusChange}
          />
        )}
      </div>
    </div>
  );
}
