import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HardHat, ArrowRight, ArrowLeft, CheckCircle2,
  Building2, User, Mail, Phone, MapPin, Tag,
  Lock, Eye, EyeOff, FileText, Upload, X, AlertCircle,
  ShieldCheck, Sparkles, Star, Zap,
} from 'lucide-react';
import { registerVendor, uploadVendorDocument } from '../../api/vendors';
import PageBackground from '../../components/ui/PageBackground';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Materials', 'Electrical', 'Safety', 'Energy', 'Structural',
  'Plumbing', 'Civil', 'Mechanical', 'IT & Technology', 'Other',
];

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

const STEPS = [
  {
    id: 1, label: 'Business Info',  sub: 'Company & category',       icon: Building2,
  },
  {
    id: 2, label: 'Contact Details', sub: 'Email & phone',           icon: User,
  },
  {
    id: 3, label: 'Account Setup',   sub: 'Login credentials',       icon: Lock,
  },
  {
    id: 4, label: 'Documents',       sub: 'Upload for faster review', icon: FileText,
  },
  {
    id: 5, label: 'All Done',        sub: 'Pending approval',         icon: CheckCircle2,
  },
];

 
/* ─── Animated background blobs ──────────────────────────────────────────── */
function Blobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute rounded-full"
        style={{
          width: 700, height: 700,
          top: '-200px', left: '-200px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 65%)',
          filter: 'blur(60px)',
          animation: 'blobDrift1 18s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          bottom: '-150px', right: '-100px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 65%)',
          filter: 'blur(70px)',
          animation: 'blobDrift2 22s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 400, height: 400,
          top: '40%', left: '50%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 65%)',
          filter: 'blur(55px)',
          animation: 'blobDrift1 15s ease-in-out infinite alternate-reverse',
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
 
/* ─── Left branding panel ─────────────────────────────────────────────────── */
function BrandPanel({ current }) {
  return (
    <div
      className="hidden lg:flex flex-col justify-between w-[340px] xl:w-[380px] shrink-0 relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Inner accent blob */}
      <div
        className="absolute top-0 left-0 w-full h-64 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 0%, rgba(59,130,246,0.18) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 p-10 flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
              boxShadow: '0 8px 20px rgba(37,99,235,0.45)',
            }}
          >
            <HardHat size={19} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">BuildLedger</p>
            <p className="text-slate-500 text-[10px] tracking-widest uppercase">Vendor Portal</p>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h2
            className="text-2xl xl:text-3xl font-bold leading-tight mb-2"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 60%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Start your journey with us
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Join hundreds of verified vendors on India's leading construction procurement platform.
          </p>
        </div>

        {/* Step list */}
        <div className="flex flex-col gap-0">
          {STEPS.map((step, i) => {
            const done   = current > step.id;
            const active = current === step.id;
            const Icon   = step.icon;
            return (
              <div key={step.id} className="flex gap-3.5">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
                    style={{
                      background: done
                        ? 'linear-gradient(135deg,#059669,#10b981)'
                        : active
                        ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                        : 'rgba(255,255,255,0.06)',
                      border: done || active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: done
                        ? '0 4px 14px rgba(16,185,129,0.4)'
                        : active
                        ? '0 4px 14px rgba(37,99,235,0.5)'
                        : 'none',
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={14} className="text-white" />
                      : <Icon size={13} className={active ? 'text-white' : 'text-slate-500'} />
                    }
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="w-px flex-1 my-1 transition-all duration-700"
                      style={{
                        minHeight: 24,
                        background: done
                          ? 'linear-gradient(180deg,#10b981,#10b98188)'
                          : 'rgba(255,255,255,0.07)',
                      }}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="pb-5">
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${active ? 'text-slate-400' : 'text-slate-600'}`}>
                    {step.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust badges */}
      <div className="relative z-10 p-8 pt-0">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-3">
            Why BuildLedger?
          </p>
          {[
            { icon: ShieldCheck, text: 'Bank-grade data security',  color: '#10b981' },
            { icon: Zap,         text: '24h avg. approval time',    color: '#f59e0b' },
            { icon: Star,        text: '500+ active vendors',       color: '#3b82f6' },
          ].map(({ icon: I, text, color }) => (
            <div key={text} className="flex items-center gap-2.5 py-1.5">
              <I size={12} style={{ color }} className="shrink-0" />
              <span className="text-xs text-slate-400">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Shared input styles ─────────────────────────────────────────────────── */
const inputBase = (err) => ({
  background: err ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.055)',
  border: `1px solid ${err ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.1)'}`,
  color: 'white',
  transition: 'all 0.2s ease',
});

const focusStyle = {
  borderColor: 'rgba(99,102,246,0.75)',
  background:  'rgba(99,102,246,0.09)',
  boxShadow:   '0 0 0 3px rgba(99,102,246,0.14)',
  outline:     'none',
};

const blurStyle = (err) => ({
  borderColor:  err ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.1)',
  background:   err ? 'rgba(245,158,11,0.07)'  : 'rgba(255,255,255,0.055)',
  boxShadow:    'none',
});

/* ─── Field component ─────────────────────────────────────────────────────── */
function Field({ icon: Icon, label, type = 'text', value, onChange, placeholder, required, options, error }) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 tracking-widest uppercase">
        {Icon && <Icon size={10} className="text-slate-500" />}
        {label}
        {required && <span className="text-amber-400 ml-0.5">*</span>}
      </label>

      <div className="relative">
        {options ? (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none appearance-none"
            style={inputBase(error)}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, blurStyle(error))}
          >
            <option value="" style={{ background: '#0d1120' }}>Select {label}</option>
            {options.map(o => (
              <option key={o} value={o} style={{ background: '#0d1120' }}>{o}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none placeholder-slate-600"
            style={inputBase(error)}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, blurStyle(error))}
          />
        ) : (
          <input
            type={type === 'password' ? (show ? 'text' : 'password') : type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none placeholder-slate-600"
            style={{ ...inputBase(error), paddingRight: type === 'password' ? '2.5rem' : undefined }}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, blurStyle(error))}
          />
        )}

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-300 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1 text-[11px] text-amber-400">
          <AlertCircle size={11} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Mobile step bar ─────────────────────────────────────────────────────── */
function MobileSteps({ current }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6 lg:hidden">
      {STEPS.map((step, i) => {
        const done   = current > step.id;
        const active = current === step.id;
        const Icon   = step.icon;
        return (
          <div key={step.id} className="flex items-center gap-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                background: done
                  ? 'linear-gradient(135deg,#059669,#10b981)'
                  : active
                  ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                  : 'rgba(255,255,255,0.07)',
                border: done || active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: active ? '0 0 12px rgba(37,99,235,0.5)' : 'none',
              }}
            >
              {done
                ? <CheckCircle2 size={12} className="text-white" />
                : <Icon size={11} className={active ? 'text-white' : 'text-slate-600'} />
              }
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-5 h-px" style={{ background: done ? '#10b981' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function VendorRegister() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [errors, setErrors]     = useState({});
  const [form, setForm] = useState({
    name: '', category: '', address: '',
    contactInfo: '', email: '', phone: '',
    username: '', password: '', confirmPassword: '',
  });

  const set = (key) => (val) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.name.trim())    e.name     = 'Company name is required';
      if (!form.category)       e.category = 'Please select a category';
      if (!form.address.trim()) e.address  = 'Business address is required';
    }
    if (step === 2) {
      if (!form.contactInfo.trim()) e.contactInfo = 'Contact person is required';
      if (!form.email.trim())       e.email       = 'Business email is required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
      if (!form.phone.trim())       e.phone       = 'Phone number is required';
      else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';
    }
    if (step === 3) {
      if (!form.username.trim()) e.username = 'Username is required';
      if (!form.password)        e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'Minimum 6 characters required';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;

    if (step === 3) {
      setLoading(true);
      try {
        const res = await registerVendor({
          name: form.name, category: form.category, address: form.address,
          contactInfo: form.contactInfo, email: form.email, phone: form.phone,
          username: form.username, password: form.password,
        });
        const data = res.data?.data || res.data;
        const id   = data?.vendorId || data?.id || data?.vendor_id;
        setVendorId(id);
        const token = data?.token || res.data?.token;
        if (token) localStorage.setItem('bl_token', token);
        toast.success('Account created! Upload your documents now.');
        setStep(4);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
      } finally { setLoading(false); }
      return;
    }

    if (step === 4) {
      if (documents.length > 0) {
        if (!vendorId) { toast.error('Vendor ID missing — please contact support.'); setStep(5); return; }
        setLoading(true);
        try {
          for (const doc of documents) await uploadVendorDocument(vendorId, doc.file, doc.type);
          toast.success('Documents uploaded successfully!');
        } catch (err) {
          toast.error('Document upload failed. You can upload documents after login.');
        } finally { setLoading(false); }
      }
      setStep(5);
      return;
    }

    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => s - 1);
  };

  const addFiles = (files) => {
    setDocuments(p => [
      ...p,
      ...Array.from(files).map(f => ({ file: f, type: 'PAN_CARD', name: f.name })),
    ]);
  };

  const pwStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6)  s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const pwColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
  const pwLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  /* ── Success screen ──────────────────────────────────────────────────────── */
  if (step === 5) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#080d1c 0%,#0c1530 45%,#0a0d1f 100%)' }}
      >
        <Blobs />
        <div className="relative z-10 w-full max-w-md px-4 py-10">
          <div
            className="rounded-3xl p-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(48px)',
              WebkitBackdropFilter: 'blur(48px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Glow ring */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.05) 60%)',
                border: '2px solid rgba(16,185,129,0.35)',
                boxShadow: '0 0 40px rgba(16,185,129,0.25), 0 0 80px rgba(16,185,129,0.1)',
              }}
            >
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>

            <div
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)',
                color: '#34d399',
              }}
            >
              <Sparkles size={10} /> Registration Complete
            </div>

            <h2
              className="text-2xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg,#ffffff,#93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              You're on the list!
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Your vendor registration is <span className="text-amber-400 font-semibold">pending review</span>.
              Our compliance team will verify your documents and activate your account within{' '}
              <span className="text-white font-medium">1–2 business days</span>.
            </p>

            <div
              className="rounded-2xl p-5 text-left mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">What happens next</p>
              {[
                'Compliance team reviews your documents',
                'You receive an email confirmation on approval',
                'Login with your credentials to access the portal',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                  <div
                    className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white w-full transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)',
                boxShadow: '0 6px 28px rgba(37,99,235,0.5)',
              }}
            >
              Go to Login <ArrowRight size={14} />
            </Link>

            <Link
              to="/vendor/reupload-documents"
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium mt-3 transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#64748b',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              Forgot to upload documents? Re-upload here
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main form ───────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Global keyframes */}
      <style>{`
        @keyframes blobDrift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px, 30px) scale(1.08); } }
        @keyframes blobDrift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-30px, -40px) scale(1.05); } }
        @keyframes stepIn     { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        .step-enter { animation: stepIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#080d1c 0%,#0c1530 45%,#0a0d1f 100%)' }}
      >
        <Blobs />

        {/* Outer glass shell */}
        <div
          className="relative z-10 flex w-full max-w-4xl xl:max-w-[900px] mx-4 my-8 rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.045)',
            backdropFilter: 'blur(52px)',
            WebkitBackdropFilter: 'blur(52px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.09)',
          }}
        >
          {/* ── Left panel ── */}
          <BrandPanel current={step} />

          {/* ── Right form panel ── */}
          <div className="flex-1 p-7 sm:p-10 flex flex-col justify-center min-h-[580px]">

            {/* Top bar: logo on mobile + step counter */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 lg:hidden">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.45)' }}
                >
                  <HardHat size={15} className="text-white" />
                </div>
                <span className="text-white font-bold text-sm">BuildLedger</span>
              </div>
              <div
                className="ml-auto flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#64748b',
                }}
              >
                <span className="text-white">{step}</span>
                <span>/</span>
                <span>{STEPS.length}</span>
                <span className="text-slate-400 ml-1">{STEPS[step - 1].label}</span>
              </div>
            </div>

            {/* Mobile step dots */}
            <MobileSteps current={step} />

            {/* Step content with animation key */}
            <div key={step} className="step-enter flex flex-col gap-5 flex-1">

              {/* Step heading */}
              <div>
                <h3
                  className="text-lg font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg,#ffffff,#c7d2fe)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {STEPS[step - 1].label}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{STEPS[step - 1].sub}</p>
              </div>

              {/* ── Step 1: Business Info ── */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <Field icon={Building2} label="Company Name"     value={form.name}     onChange={set('name')}     placeholder="Acme Construction Ltd."              required error={errors.name}     />
                  <Field icon={Tag}       label="Industry Category" value={form.category} onChange={set('category')} options={CATEGORIES}                              required error={errors.category} />
                  <Field icon={MapPin}    label="Business Address"  value={form.address}  onChange={set('address')}  type="textarea" placeholder="123 Builder St, City, State, PIN" required error={errors.address}  />
                </div>
              )}

              {/* ── Step 2: Contact ── */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <Field icon={User}  label="Contact Person" value={form.contactInfo} onChange={set('contactInfo')} placeholder="John Smith"            required error={errors.contactInfo} />
                  <Field icon={Mail}  label="Business Email" type="email" value={form.email} onChange={set('email')} placeholder="contact@company.com" required error={errors.email}       />
                  <Field icon={Phone} label="Phone Number"   value={form.phone}       onChange={set('phone')}       placeholder="+91 98765 43210"      required error={errors.phone}       />
                </div>
              )}

              {/* ── Step 3: Account ── */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <Field icon={User} label="Username"         value={form.username}        onChange={set('username')}        placeholder="yourcompany123"      required error={errors.username}        />
                  <Field icon={Lock} label="Password"         type="password" value={form.password}        onChange={set('password')}        placeholder="Min. 6 characters"   required error={errors.password}        />
                  <Field icon={Lock} label="Confirm Password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat your password" required error={errors.confirmPassword} />

                  {form.password && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Password strength</p>
                        {pwStrength > 0 && (
                          <span className="text-[10px] font-bold" style={{ color: pwColors[pwStrength - 1] }}>
                            {pwLabels[pwStrength - 1]}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map(n => (
                          <div
                            key={n}
                            className="flex-1 h-1 rounded-full transition-all duration-300"
                            style={{
                              background: n <= pwStrength
                                ? pwColors[pwStrength - 1]
                                : 'rgba(255,255,255,0.07)',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Documents ── */}
              {step === 4 && (
                <div className="flex flex-col gap-4">
                  {/* Accepted types grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {DOC_TYPES.slice(0, 4).map(dt => (
                      <div
                        key={dt.value}
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px]"
                        style={{ background: 'rgba(99,102,246,0.08)', border: '1px solid rgba(99,102,246,0.15)' }}
                      >
                        <ShieldCheck size={9} className="text-indigo-400 shrink-0" />
                        <span className="text-slate-400 truncate">{dt.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Drop zone */}
                  <label
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl cursor-pointer transition-all duration-200"
                    style={{
                      border: '2px dashed rgba(99,102,246,0.3)',
                      background: 'rgba(99,102,246,0.04)',
                    }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(99,102,246,0.6)'; e.currentTarget.style.background = 'rgba(99,102,246,0.1)'; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,246,0.3)'; e.currentTarget.style.background = 'rgba(99,102,246,0.04)'; }}
                    onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); e.currentTarget.style.borderColor = 'rgba(99,102,246,0.3)'; e.currentTarget.style.background = 'rgba(99,102,246,0.04)'; }}
                  >
                    <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => addFiles(e.target.files)} />
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(99,102,246,0.12)', border: '1px solid rgba(99,102,246,0.2)' }}
                    >
                      <Upload size={20} className="text-indigo-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-300 font-medium">
                        Drop files here or <span className="text-indigo-400 underline underline-offset-2">browse</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1">PDF, PNG, JPG · Max 10 MB each</p>
                    </div>
                  </label>

                  {/* Added files */}
                  {documents.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                      {documents.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 p-3 rounded-xl"
                          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                        >
                          <FileText size={12} className="text-emerald-400 shrink-0" />
                          <p className="text-xs text-slate-300 truncate flex-1">{d.name}</p>
                          <select
                            value={d.type}
                            onChange={e => setDocuments(p => p.map((doc, j) => j === i ? { ...doc, type: e.target.value } : doc))}
                            className="text-[10px] rounded-lg px-2 py-1 outline-none shrink-0"
                            style={{ background: 'rgba(13,17,32,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                          >
                            {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                          </select>
                          <button onClick={() => setDocuments(p => p.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 text-center">
                    You can also upload documents after login from your vendor portal.
                  </p>
                </div>
              )}
            </div>

            {/* ── Navigation ── */}
            <div className="flex gap-3 mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {step > 1 && (
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: '#94a3b8',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#4f46e5)',
                  boxShadow: '0 4px 28px rgba(37,99,235,0.45)',
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing…
                  </>
                ) : step === 3 ? (
                  <><Sparkles size={13} /> Create Account</>
                ) : step === 4 ? (
                  <>{documents.length > 0 ? 'Upload & Finish' : 'Skip for now'} <ArrowRight size={14} /></>
                ) : (
                  <>Continue <ArrowRight size={14} /></>
                )}
              </button>
            </div>

            {step === 1 && (
              <p className="text-center text-xs text-slate-600 mt-4">
                Already registered?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Sign in here
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
