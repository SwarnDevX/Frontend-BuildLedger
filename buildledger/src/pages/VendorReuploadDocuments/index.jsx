import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat, ArrowRight, CheckCircle2, Lock, Eye, EyeOff, User,
  FileText, Upload, UploadCloud, AlertCircle, ShieldCheck,
  Clock, XCircle, RefreshCw, X,
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import {
  vendorLogin, getAllVendors, getVendorDocuments,
  uploadVendorDocument, replaceVendorDocument,
} from '../../api/vendors';
import PageBackground from '../../components/ui/PageBackground';
import toast from 'react-hot-toast';

const STAGE = Object.freeze({ LOGIN: 'login', DOCS: 'docs', BLOCKED: 'blocked', DONE: 'done' });

const DOC_TYPES = [
  { label: 'PAN Card',                  value: 'PAN_CARD' },
  { label: 'GST Certificate',           value: 'GST_CERTIFICATE' },
  { label: 'Business License',          value: 'BUSINESS_LICENSE' },
  { label: 'Incorporation Certificate', value: 'INCORPORATION_CERTIFICATE' },
  { label: 'Bank Statement',            value: 'BANK_STATEMENT' },
  { label: 'Quality Certificate',       value: 'QUALITY_CERTIFICATE' },
  { label: 'ISO Certificate',           value: 'ISO_CERTIFICATE' },
  { label: 'Other',                     value: 'OTHER' },
];

const APPROVED_META = { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', Icon: CheckCircle2 };
const STATUS_META = {
  PENDING:  { label: 'Under Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: Clock },
  APPROVED: APPROVED_META,
  VERIFIED: APPROVED_META,
  REJECTED: { label: 'Rejected',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  Icon: XCircle },
};

const normDoc = (doc = {}) => ({
  ...doc,
  documentType: doc.documentType || doc.docType || 'OTHER',
  status:       doc.status || doc.verificationStatus || 'PENDING',
  fileName:     doc.fileName || doc.originalFileName || doc.fileUri?.split('/').pop() || 'document',
});

const PAGE_BG    = { background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 35%, #0f2855 60%, #0a1628 100%)' };
const CARD_STYLE = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
};

function FullPageCard({ iconStyle, icon: Icon, iconClass, heading, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={PAGE_BG}>
      <PageBackground />
      <div className="relative z-10 w-full max-w-md px-4 text-center">
        <div className="rounded-3xl p-10 shadow-2xl" style={CARD_STYLE}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={iconStyle}>
            <Icon size={38} className={iconClass} />
          </div>
          <h2 className="text-2xl font-bold mb-2"
            style={{ background: 'linear-gradient(135deg,#ffffff,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {heading}
          </h2>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function VendorReuploadDocuments() {
  const [stage, setStage]           = useState(STAGE.LOGIN);
  const [loginLoading, setLoginLoading] = useState(false);
  const [creds, setCreds]           = useState({ username: '', password: '' });
  const [showPw, setShowPw]         = useState(false);
  const [loginError, setLoginError] = useState('');

  const [vendorId, setVendorId]     = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [existingDoc, setExistingDoc] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType]       = useState('PAN_CARD');
  const [uploading, setUploading]   = useState(false);
  const fileInputRef                = useRef(null);

  const [prevToken]                 = useState(() => localStorage.getItem('bl_token'));

  const injectToken  = (t) => localStorage.setItem('bl_token', t);
  const restoreToken = () => {
    if (prevToken) localStorage.setItem('bl_token', prevToken);
    else localStorage.removeItem('bl_token');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!creds.username || !creds.password) {
      setLoginError('Please enter your username and password.');
      return;
    }
    setLoginLoading(true);
    try {
      const res     = await vendorLogin(creds.username, creds.password);
      const payload = res.data?.data || res.data;
      const token   = payload?.token || payload?.accessToken || payload;
      if (!token) throw new Error('No token received');

      injectToken(token);

      let userId = null;
      try { const d = jwtDecode(token); userId = d.userId || d.id; } catch { /* ignore */ }

      const vendorRes  = await getAllVendors();
      const allVendors = vendorRes.data?.data || [];
      const vendor     = allVendors.find(
        v => (userId && v.userId === userId) || v.username === creds.username
      );

      if (!vendor) {
        restoreToken();
        setLoginError('No vendor account found. Please complete registration first.');
        return;
      }

      if (vendor.status === 'ACTIVE') {
        restoreToken();
        setVendorName(vendor.name || creds.username);
        setStage(STAGE.BLOCKED);
        return;
      }

      const vid = vendor.vendorId || vendor.id;
      setVendorId(vid);
      setVendorName(vendor.name || creds.username);

      try {
        const docRes = await getVendorDocuments(vid);
        const raw    = docRes.data?.data || docRes.data || [];
        const arr    = Array.isArray(raw) ? raw : (Array.isArray(raw.documents) ? raw.documents : []);
        setExistingDoc(arr.length > 0 ? normDoc(arr[0]) : null);
      } catch {
        setExistingDoc(null);
      }

      setStage(STAGE.DOCS);
      toast.success(`Welcome back, ${vendor.name || creds.username}!`);

    } catch (err) {
      restoreToken();
      setLoginError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Please select a file.'); return; }
    setUploading(true);
    try {
      try {
        await replaceVendorDocument(vendorId, selectedFile, docType);
      } catch (replaceErr) {
        // PUT failed — only fall back to POST if we had no existing doc on record
        // (vendor may have a doc even when the earlier fetch failed, in which case
        //  PUT would have succeeded above instead of reaching here)
        if (existingDoc) throw replaceErr;
        await uploadVendorDocument(vendorId, selectedFile, docType);
      }
      toast.success(existingDoc ? 'Document replaced successfully.' : 'Document uploaded successfully.');
      restoreToken();
      setStage(STAGE.DONE);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (stage === STAGE.BLOCKED) {
    return (
      <FullPageCard
        iconStyle={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)', boxShadow: '0 0 32px rgba(34,197,94,0.2)' }}
        icon={CheckCircle2} iconClass="text-green-400"
        heading="Account Already Active"
      >
        <p className="text-slate-400 text-sm mb-7 leading-relaxed">
          <strong className="text-green-400">{vendorName}</strong>, your account is already{' '}
          <strong className="text-green-400">ACTIVE</strong>. Document re-upload is only available for pending accounts.
        </p>
        <div className="space-y-3">
          <Link to="/login"
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)', boxShadow: '0 4px 24px rgba(37,99,235,0.5)' }}>
            Go to Login <ArrowRight size={14} />
          </Link>
          <button onClick={() => setStage(STAGE.LOGIN)}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
            Try a different account
          </button>
        </div>
      </FullPageCard>
    );
  }

  if (stage === STAGE.DONE) {
    return (
      <FullPageCard
        iconStyle={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', boxShadow: '0 0 32px rgba(16,185,129,0.2)' }}
        icon={CheckCircle2} iconClass="text-emerald-400"
        heading="Document Submitted!"
      >
        <p className="text-slate-400 text-sm mb-7 leading-relaxed">
          Your document is under review. Our compliance team will verify it and activate your account
          within <strong className="text-amber-400">1–2 business days</strong>.
        </p>
        <div className="p-4 rounded-2xl text-left mb-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] text-slate-500 mb-3 font-semibold uppercase tracking-widest">What happens next</p>
          {['Compliance team reviews your document', 'You receive an email confirmation on approval', 'Login with your credentials to access the portal'].map((t, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>{i + 1}</div>
              <p className="text-xs text-slate-300">{t}</p>
            </div>
          ))}
        </div>
        <Link to="/login"
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)', boxShadow: '0 4px 24px rgba(37,99,235,0.5)' }}>
          Go to Login <ArrowRight size={14} />
        </Link>
      </FullPageCard>
    );
  }

  if (stage === STAGE.DOCS) {
    const meta       = existingDoc ? (STATUS_META[existingDoc.status] || STATUS_META.PENDING) : null;
    const StatusIcon = meta?.Icon;
    const isReplace  = Boolean(existingDoc);

    let uploadBtnContent;
    if (uploading) {
      uploadBtnContent = <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>;
    } else if (isReplace) {
      uploadBtnContent = <><RefreshCw size={14} /> Replace Document</>;
    } else {
      uploadBtnContent = <><UploadCloud size={14} /> Upload Document</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={PAGE_BG}>
        <PageBackground />
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)', boxShadow: '0 8px 24px rgba(37,99,235,0.5)' }}>
              <HardHat size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg,#ffffff,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {isReplace ? 'Replace Document' : 'Upload Document'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome back, <span className="text-blue-300 font-medium">{vendorName}</span>
            </p>
          </div>

          <div className="rounded-3xl p-7 shadow-2xl" style={CARD_STYLE}>
            {isReplace ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl mb-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <FileText size={16} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{existingDoc.fileName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                    {existingDoc.documentType?.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
                {meta && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
                    style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                    <StatusIcon size={10} style={{ color: meta.color }} />
                    <span className="text-[10px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl mb-5"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <ShieldCheck size={14} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  No document found on your account. Upload one to begin the verification process.
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">DOCUMENT TYPE</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.7)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}>
                {DOC_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value} style={{ background: '#0d1b3e' }}>{dt.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                {isReplace ? 'NEW FILE' : 'FILE'}
              </label>
              {selectedFile ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <FileText size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-sm text-slate-200 truncate flex-1">{selectedFile.name}</p>
                  <button onClick={() => { setSelectedFile(null); fileInputRef.current.value = ''; }}
                    className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl cursor-pointer transition-all"
                  style={{ border: '2px dashed rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.04)' }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; }}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)';
                    const f = e.dataTransfer.files[0];
                    if (f) setSelectedFile(f);
                  }}>
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }} />
                  <Upload size={22} className="text-blue-400" />
                  <div className="text-center">
                    <p className="text-sm text-slate-300 font-medium">Drop file here or <span className="text-blue-400">browse</span></p>
                    <p className="text-xs text-slate-600 mt-0.5">PDF up to 10 MB</p>
                  </div>
                </label>
              )}
            </div>

            {isReplace && (
              <p className="text-[10px] text-slate-600 text-center mb-4">
                Replacing the document will reset its review status to Pending.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { restoreToken(); setStage(STAGE.LOGIN); setSelectedFile(null); }}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{
                  background: isReplace ? 'linear-gradient(135deg,#b45309,#d97706,#f59e0b)' : 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)',
                  boxShadow: isReplace ? '0 4px 24px rgba(217,119,6,0.4)' : '0 4px 24px rgba(37,99,235,0.4)',
                }}>
                {uploadBtnContent}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={PAGE_BG}>
      <PageBackground />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)', boxShadow: '0 8px 24px rgba(37,99,235,0.5)' }}>
            <HardHat size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg,#ffffff,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Re-upload Document
          </h1>
          <p className="text-sm text-slate-400 mt-1">Sign in with your vendor credentials</p>
        </div>

        <div className="rounded-3xl p-7 shadow-2xl" style={CARD_STYLE}>
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl mb-5"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <ShieldCheck size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Only <strong className="text-blue-300">pending</strong> vendor accounts can upload or
              replace documents. Active accounts must contact support.
            </p>
          </div>

          {loginError && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl mb-5"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <span className="text-red-300 text-sm">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">USERNAME</label>
              <div className="relative group">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="text" autoComplete="username" placeholder="Enter your vendor username"
                  value={creds.username}
                  onChange={e => { setCreds(p => ({ ...p, username: e.target.value })); if (loginError) setLoginError(''); }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.7)'; e.target.style.background = 'rgba(59,130,246,0.08)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">PASSWORD</label>
              <div className="relative group">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password"
                  value={creds.password}
                  onChange={e => { setCreds(p => ({ ...p, password: e.target.value })); if (loginError) setLoginError(''); }}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.7)'; e.target.style.background = 'rgba(59,130,246,0.08)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-300 transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loginLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm mt-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)', boxShadow: '0 4px 24px rgba(37,99,235,0.5)' }}
              onMouseEnter={e => !loginLoading && (e.currentTarget.style.boxShadow = '0 6px 32px rgba(37,99,235,0.65)')}
              onMouseLeave={e => !loginLoading && (e.currentTarget.style.boxShadow = '0 4px 24px rgba(37,99,235,0.5)')}>
              {loginLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                : <>Continue <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs text-slate-600 font-medium">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <Link to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}>
            Back to Login
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 mt-3">
          New vendor?{' '}
          <Link to="/vendor/register" className="text-blue-400 hover:text-blue-300 font-medium">Register here</Link>
        </p>
      </div>
    </div>
  );
}
