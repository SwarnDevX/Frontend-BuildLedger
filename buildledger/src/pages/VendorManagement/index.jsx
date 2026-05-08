import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Filter, Star, MapPin, Mail, Upload, X, Plus, AlertTriangle,
  Loader2, RefreshCw, FileText, Eye, ThumbsUp, ThumbsDown, Download, UploadCloud,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import {
  Button, SearchBar, FilterPills,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell,
  PageHeader,
} from '../../components/ui';
import {
  getAllVendors, deleteVendor, getVendorDocuments,
  uploadVendorDocument, verifyDocument, downloadVendorDocument, updateVendor,
} from '../../api/vendors';
import { getVendorPageSummary } from '../../api/reports';
import { createInternalVendorUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DOC_TYPES = ['PAN_CARD', 'GST_CERTIFICATE', 'TRADE_LICENSE', 'MSME_CERTIFICATE', 'BANK_STATEMENT', 'INCORPORATION_CERTIFICATE', 'OTHER'];
const statusFilters = ['All', 'ACTIVE', 'PENDING', 'REJECTED'];
const STATUS_FILTER_OPTIONS = statusFilters.map(s => ({ key: s, label: s }));

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
    payload, payload?.data, payload?.data?.data,
    payload?.documents, payload?.data?.documents,
    payload?.items, payload?.content, payload?.result,
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
    } catch { return 'Download failed'; }
  }
  return 'Download failed';
};

function StatusDot({ status }) {
  const map = { ACTIVE: 'bg-green-500', PENDING: 'bg-amber-500', REJECTED: 'bg-red-500' };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] || 'bg-slate-300'}`} />;
}

function DocStatusBadge({ status }) {
  const cfg = {
    PENDING:  'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40',
    APPROVED: 'bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/40',
    REJECTED: 'bg-red-50 dark:bg-red-900/25 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/40',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg[status] || 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'}`}>
      {status}
    </span>
  );
}

function VendorProfilePanel({ vendor, onClose, refreshVendors, refreshPending, onVendorStatusChange }) {
  const { user } = useAuth();
  const [docs, setDocs]               = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('PAN_CARD');
  const [dragOver, setDragOver]       = useState(false);
  const [reviewing, setReviewing]     = useState({});
  const [pendingRejectDocId, setPendingRejectDocId] = useState(null);
  const [rejectRemarks,      setRejectRemarks]      = useState('');
  const fileInputRef                  = useRef(null);

  const canReview = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);
  const canUpload = user?.role === 'VENDOR';

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const r = await getVendorDocuments(vendor.vendorId);
      setDocs(extractDocuments(r.data).map(normalizeDocument));
    } catch { setDocs([]); }
    finally { setLoadingDocs(false); }
  }, [vendor?.vendorId]);

  useEffect(() => { if (vendor?.vendorId) fetchDocs(); }, [vendor?.vendorId, fetchDocs]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return; }
    setUploading(true);
    try {
      await uploadVendorDocument(vendor.vendorId, file, selectedDocType);
      toast.success('Document uploaded! Awaiting review.');
      fetchDocs();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleFileInput = (e) => handleUpload(e.target.files?.[0]);
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files?.[0]); };

  const handleVerify = async (docId, status, reviewRemarksText) => {
    if (!canReview) { toast.error('Only Admin or Project Manager can review documents'); return; }
    setReviewing(r => ({ ...r, [docId]: true }));
    try {
      await verifyDocument(docId, {
        status,
        reviewRemarks: reviewRemarksText || (status === 'APPROVED' ? 'Approved by reviewer' : 'Rejected by reviewer'),
        username: user?.username || user?.name || 'system',
      });
      const nextVendorStatus = status === 'APPROVED' ? 'ACTIVE' : 'REJECTED';
      try { await updateVendor(vendor.vendorId, { status: nextVendorStatus }); } catch { /* already set */ }
      if (status === 'APPROVED' && ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role) && vendor?.status !== 'ACTIVE') {
        const encodedPassword = vendor?.encodedPassword || vendor?.passwordEncoded || vendor?.passwordHash;
        if (vendor?.username && encodedPassword && vendor?.name) {
          try {
            await createInternalVendorUser({ username: vendor.username, encodedPassword, name: vendor.name, email: vendor.email, phone: vendor.phone });
            toast.success('Vendor account activated');
          } catch (accountErr) {
            const msg = accountErr.response?.data?.message;
            if (msg && /exist|already/i.test(msg)) toast('Vendor account already exists');
            else toast.error(msg || 'Document approved, but vendor account creation failed');
          }
        } else {
          toast('Document approved. Vendor account payload incomplete; skipped creation.');
        }
      }
      onVendorStatusChange?.(vendor.vendorId, nextVendorStatus);
      toast.success(status === 'APPROVED' ? 'Document accepted' : 'Document rejected');
      fetchDocs(); refreshVendors?.(); refreshPending?.();
    } catch { toast.error('Action failed'); }
    finally { setReviewing(r => ({ ...r, [docId]: false })); }
  };

  const handleDownload = async (doc) => {
    const docId = getDocumentIdFromDoc(doc);
    try {
      const res = await downloadVendorDocument({ vendorId: vendor?.vendorId, documentId: docId, docType: doc.docType || doc.documentType, fileUri: doc.fileUri });
      const contentType = res.headers?.['content-type'] || 'application/pdf';
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {(vendor.name || 'V').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{vendor.name}</h3>
            <p className="text-xs text-slate-400">{vendor.category || 'No category'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {[['Email', vendor.email], ['Phone', vendor.phone], ['Address', vendor.address], ['Contact', vendor.contactInfo]].map(
          ([k, v]) => v && (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-slate-400 w-16 shrink-0">{k}</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium break-all">{v}</span>
            </div>
          )
        )}
      </div>

      <div className="flex items-center justify-around py-3 border-y border-slate-100 dark:border-slate-700/40">
        {[['Vendor ID', vendor.vendorId], ['Status', vendor.status], ['Joined', vendor.createdAt?.slice(0, 10)]].map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{val || '—'}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {canUpload && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <UploadCloud size={13} className="text-blue-500" /> Upload Document
          </p>
          <select
            value={selectedDocType}
            onChange={e => setSelectedDocType(e.target.value)}
            className="w-full text-xs rounded-xl border px-3 py-2 outline-none transition-all"
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all
              ${dragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-600/50 hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/15'}
              ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {uploading
              ? <Loader2 size={24} className="animate-spin text-blue-500" />
              : <UploadCloud size={24} className={`${dragOver ? 'text-blue-500' : 'text-slate-400'} transition-colors`} />
            }
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {uploading ? 'Uploading…' : dragOver ? 'Drop PDF here' : 'Click or drag PDF to upload'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Only PDF files • Max 10 MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileInput} />
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
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
            <div key={d.documentId || i} className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/25 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{(d.docType || 'Document').replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-slate-400 truncate" title={d.fileUri}>{d.fileUri || '—'}</p>
                    <p className="text-[10px] text-slate-400">{d.uploadedDate || d.createdAt?.slice(0, 10) || '—'}</p>
                  </div>
                </div>
                <DocStatusBadge status={d.verificationStatus} />
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/30 flex-wrap">
                <button
                  onClick={() => handleDownload(d)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-colors"
                >
                  <Download size={11} /> Download
                </button>

                {canReview && (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(d.documentId, 'APPROVED')}
                      disabled={reviewing[d.documentId] || d.verificationStatus === 'APPROVED'}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all
                        ${d.verificationStatus === 'APPROVED'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-default'
                          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/35 border border-green-200 dark:border-green-700/40 disabled:opacity-50'}`}
                    >
                      {reviewing[d.documentId] ? <Loader2 size={10} className="animate-spin" /> : <ThumbsUp size={11} />}
                      {d.verificationStatus === 'APPROVED' ? 'Accepted' : 'Accept'}
                    </button>
                    <button
                      onClick={() => { setPendingRejectDocId(d.documentId); setRejectRemarks(''); }}
                      disabled={reviewing[d.documentId] || d.verificationStatus === 'REJECTED'}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all
                        ${d.verificationStatus === 'REJECTED'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 cursor-default'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/35 border border-red-200 dark:border-red-700/40 disabled:opacity-50'}`}
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

      {/* Document Rejection Remarks Modal */}
      <Modal
        open={pendingRejectDocId !== null}
        onClose={() => { setPendingRejectDocId(null); setRejectRemarks(''); }}
        title="Reject Document"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Provide a reason for rejection. This will be sent to the vendor.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectRemarks}
              onChange={e => setRejectRemarks(e.target.value)}
              rows={3}
              placeholder="e.g. Document is unclear, wrong file type, information mismatch…"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-800/50 px-3 py-2 outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 resize-none text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => { setPendingRejectDocId(null); setRejectRemarks(''); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!rejectRemarks.trim()) { toast.error('Please provide a rejection reason'); return; }
                await handleVerify(pendingRejectDocId, 'REJECTED', rejectRemarks.trim());
                setPendingRejectDocId(null);
                setRejectRemarks('');
              }}
              disabled={reviewing[pendingRejectDocId]}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50 transition-all"
            >
              {reviewing[pendingRejectDocId] ? <Loader2 size={11} className="animate-spin" /> : <ThumbsDown size={11} />}
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function VendorManagement() {
  const { user } = useAuth();
  const [vendors, setVendors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected]         = useState(null);
  const [vendorSummary, setVendorSummary] = useState(null);

  const handleVendorStatusChange = (vendorId, status) => {
    setVendors(prev => prev.map(v => (v.vendorId === vendorId ? { ...v, status } : v)));
    setSelected(prev => (prev?.vendorId === vendorId ? { ...prev, status } : prev));
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const [vRes, sumRes] = await Promise.allSettled([getAllVendors(), getVendorPageSummary()]);
      setVendors(vRes.status === 'fulfilled' ? (vRes.value.data?.data || []) : []);
      setVendorSummary(sumRes.status === 'fulfilled' ? sumRes.value.data : null);
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  };

  const fetchPending = async () => {
    try {
      const sumRes = await getVendorPageSummary();
      setVendorSummary(sumRes.data);
    } catch { /* summary refresh failed silently */ }
  };

  useEffect(() => { fetchVendors(); }, []);

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
      <PageHeader
        title="Vendor Management"
        subtitle={`${vendors.length} vendors registered`}
        actions={
          <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={fetchVendors}>Refresh</Button>
        }
      />

      {/* Pending docs alert */}
      {(vendorSummary?.pendingDocumentsCount ?? 0) > 0 && (
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-amber-400">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {vendorSummary.pendingDocumentsCount} document{vendorSummary.pendingDocumentsCount > 1 ? 's' : ''} pending review
            </p>
            <p className="text-[10px] text-slate-400">Click a vendor to review and approve/reject documents</p>
          </div>
        </div>
      )}

      {/* Status stats */}
      <div className="grid grid-cols-3 gap-3">
        {['ACTIVE', 'PENDING', 'REJECTED'].map(s => {
          const count = vendorSummary?.statusCounts?.[s] ?? 0;
          return (
            <div key={s}
              className={`glass-card p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md
                ${statusFilter === s ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
              onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}>
              <StatusDot status={s} />
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{count}</p>
                <p className="text-[10px] text-slate-400 capitalize">{s.toLowerCase()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <SearchBar
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <FilterPills options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
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
              <Table elevated={false}>
                <TableHead>
                  {['Vendor', 'Category', 'Status', 'Email', 'Phone', 'Since', ''].map(h => (
                    <TableHeader key={h}>{h}</TableHeader>
                  ))}
                </TableHead>
                <TableBody>
                  {filtered.map(v => (
                    <TableRow
                      key={v.vendorId}
                      onClick={() => setSelected(selected?.vendorId === v.vendorId ? null : v)}
                      selected={selected?.vendorId === v.vendorId}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {(v.name || 'V').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{v.name}</p>
                            {v.username && <p className="text-[10px] text-slate-400">@{v.username}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">{v.category || '—'}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1.5 text-[10px] font-semibold w-fit
                          ${v.status === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : v.status === 'PENDING' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          <StatusDot status={v.status} /> {v.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">{v.email}</TableCell>
                      <TableCell className="text-xs text-slate-400">{v.phone || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-400">{v.createdAt?.slice(0, 10) || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); setSelected(v); }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1">
                            <Eye size={11} /> View
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button onClick={e => { e.stopPropagation(); handleDelete(v); }}
                              className="text-xs text-red-500 dark:text-red-400 hover:underline font-medium">
                              Delete
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-400">No vendors found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
