import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HardHat, ArrowRight, ArrowLeft, CheckCircle2,
  Building2, User, Mail, Phone, MapPin, Tag,
  Lock, Eye, EyeOff, FileText, Upload, X, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { registerVendor, uploadVendorDocument } from '../../api/vendors';
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
  { id: 1, label: 'Business',  icon: Building2 },
  { id: 2, label: 'Contact',   icon: User },
  { id: 3, label: 'Account',   icon: Lock },
  { id: 4, label: 'Documents', icon: FileText },
  { id: 5, label: 'Done',      icon: CheckCircle2 },
];

/* ── Background layout shared between all steps ── */
function PageBackground() {
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

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-7">
      {STEPS.map((step, i) => {
        const done   = current > step.id;
        const active = current === step.id;
        const Icon   = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  done   ? 'shadow-lg'
                  : active ? 'shadow-lg'
                  : ''
                }`}
                style={{
                  background: done
                    ? 'linear-gradient(135deg,#059669,#10b981)'
                    : active
                    ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                    : 'rgba(255,255,255,0.07)',
                  border: done || active ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: done
                    ? '0 4px 16px rgba(16,185,129,0.4)'
                    : active
                    ? '0 4px 16px rgba(37,99,235,0.4)'
                    : 'none',
                }}
              >
                {done
                  ? <CheckCircle2 size={15} className="text-white" />
                  : <Icon size={14} className={active ? 'text-white' : 'text-slate-500'} />
                }
              </div>
              <span className={`text-[9px] font-semibold whitespace-nowrap hidden sm:block transition-colors ${
                active ? 'text-blue-400' : done ? 'text-emerald-400' : 'text-slate-600'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-8 sm:w-12 h-0.5 mb-5 mx-1 transition-all duration-500"
                style={{ background: done ? 'linear-gradient(90deg,#10b981,#10b981)' : 'rgba(255,255,255,0.08)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inputStyle = (err) => ({
  background: 'rgba(255,255,255,0.06)',
  border: `1px solid ${err ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
  color: 'white',
});

const focusStyle = {
  borderColor: 'rgba(59,130,246,0.7)',
  background:  'rgba(59,130,246,0.08)',
  boxShadow:   '0 0 0 3px rgba(59,130,246,0.12)',
};

const blurStyle = (err) => ({
  borderColor: err ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
  background:  'rgba(255,255,255,0.06)',
  boxShadow:   'none',
});

function Field({ icon: Icon, label, type = 'text', value, onChange, placeholder, required, options, error }) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
        {label.toUpperCase()} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative group">
        {Icon && (
          <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
        )}
        {options ? (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all appearance-none"
            style={inputStyle(error)}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => Object.assign(e.target.style, blurStyle(error))}
          >
            <option value="" style={{ background: '#0d1b3e' }}>Select {label}</option>
            {options.map(o => <option key={o} value={o} style={{ background: '#0d1b3e' }}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all resize-none placeholder-slate-500"
            style={inputStyle(error)}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => Object.assign(e.target.style, blurStyle(error))}
          />
        ) : (
          <input
            type={type === 'password' ? (show ? 'text' : 'password') : type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all placeholder-slate-500"
            style={inputStyle(error)}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => Object.assign(e.target.style, blurStyle(error))}
          />
        )}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-300 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

export default function VendorRegister() {
  const navigate  = useNavigate();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [errors, setErrors]   = useState({});

  const [form, setForm] = useState({
    name: '', category: '', address: '',
    contactInfo: '', email: '', phone: '',
    username: '', password: '', confirmPassword: '',
  });

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.name.trim())     e.name     = 'Company name is required';
      if (!form.category)        e.category = 'Category is required';
      if (!form.address.trim())  e.address  = 'Address is required';
    }
    if (step === 2) {
      if (!form.contactInfo.trim()) e.contactInfo = 'Contact person is required';
      if (!form.email.trim())       e.email       = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
      if (!form.phone.trim())       e.phone       = 'Phone is required';
    }
    if (step === 3) {
      if (!form.username.trim()) e.username = 'Username is required';
      if (!form.password)        e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'Minimum 6 characters';
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
          for (const doc of documents) {
            await uploadVendorDocument(vendorId, doc.file, doc.type);
          }
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

  const addFiles = (files) => {
    setDocuments(p => [...p, ...Array.from(files).map(f => ({ file: f, type: 'PAN_CARD', name: f.name }))]);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 5) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 35%, #0f2855 60%, #0a1628 100%)' }}
      >
        <PageBackground />
        <div className="relative z-10 w-full max-w-md px-4 text-center animate-fadeIn">
          <div
            className="rounded-3xl p-10 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{
                background: 'rgba(16,185,129,0.15)',
                border: '2px solid rgba(16,185,129,0.4)',
                boxShadow: '0 0 32px rgba(16,185,129,0.2)',
              }}
            >
              <CheckCircle2 size={38} className="text-emerald-400" />
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg,#ffffff,#93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Registration Submitted!
            </h2>
            <p className="text-slate-400 text-sm mb-7 leading-relaxed">
              Your vendor registration is{' '}
              <strong className="text-amber-400">pending review</strong>. Our team will verify
              your documents and activate your account within 1–2 business days.
            </p>

            <div
              className="p-4 rounded-2xl text-left mb-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-[10px] text-slate-500 mb-3 font-semibold uppercase tracking-widest">What happens next</p>
              {[
                'Compliance team reviews your documents',
                'You receive an email confirmation on approval',
                'Login with your credentials to access the portal',
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div
                    className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-300">{t}</p>
                </div>
              ))}
            </div>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)',
                boxShadow: '0 4px 24px rgba(37,99,235,0.5)',
              }}
            >
              Go to Login <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden py-10"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 35%, #0f2855 60%, #0a1628 100%)' }}
    >
      <PageBackground />

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
            style={{
              background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)',
              boxShadow: '0 8px 24px rgba(37,99,235,0.5)',
            }}>
            <HardHat size={22} className="text-white" />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg,#ffffff,#93c5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Join BuildLedger
          </h1>
          <p className="text-sm text-slate-400 mt-1">Complete your vendor profile in a few steps</p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-3xl p-7 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <StepIndicator current={step} />

          {/* ── Step 1 ── Business Info */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-5">
                <h3 className="text-base font-bold text-white">Business Information</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tell us about your company</p>
              </div>
              <Field icon={Building2} label="Company Name" value={form.name} onChange={set('name')} placeholder="Acme Construction Ltd." required error={errors.name} />
              <Field icon={Tag}       label="Category"     value={form.category} onChange={set('category')} options={CATEGORIES} required error={errors.category} />
              <Field icon={MapPin}    label="Business Address" type="textarea" value={form.address} onChange={set('address')} placeholder="123 Builder St, City, State ZIP" required error={errors.address} />
            </div>
          )}

          {/* ── Step 2 ── Contact */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-5">
                <h3 className="text-base font-bold text-white">Contact Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">How can we reach you?</p>
              </div>
              <Field icon={User}  label="Contact Person" value={form.contactInfo} onChange={set('contactInfo')} placeholder="John Smith" required error={errors.contactInfo} />
              <Field icon={Mail}  label="Business Email" type="email" value={form.email} onChange={set('email')} placeholder="contact@company.com" required error={errors.email} />
              <Field icon={Phone} label="Phone Number"   value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" required error={errors.phone} />
            </div>
          )}

          {/* ── Step 3 ── Account Setup */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-5">
                <h3 className="text-base font-bold text-white">Account Setup</h3>
                <p className="text-xs text-slate-400 mt-0.5">Create your login credentials</p>
              </div>
              <Field icon={User} label="Username"         value={form.username}        onChange={set('username')}        placeholder="yourcompany123"      required error={errors.username} />
              <Field icon={Lock} label="Password"         type="password" value={form.password}        onChange={set('password')}        placeholder="Min. 6 characters"   required error={errors.password} />
              <Field icon={Lock} label="Confirm Password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat your password" required error={errors.confirmPassword} />
              {form.password && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wide font-semibold">Password strength</p>
                  <div className="flex gap-1">
                    {[1,2,3,4].map(n => {
                      const filled = form.password.length >= n * 2 + 2;
                      return (
                        <div key={n} className="flex-1 h-1.5 rounded-full transition-all"
                          style={{
                            background: filled
                              ? n <= 2 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)'
                              : 'rgba(255,255,255,0.08)',
                          }} />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4 ── Documents */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-5">
                <h3 className="text-base font-bold text-white">Upload Documents</h3>
                <p className="text-xs text-slate-400 mt-0.5">Compliance docs speed up your approval (optional)</p>
              </div>

              {/* Accepted doc types */}
              <div className="grid grid-cols-2 gap-2 mb-1">
                {DOC_TYPES.map(dt => (
                  <div key={dt.value}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-xs"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <ShieldCheck size={11} className="text-blue-400 shrink-0" />
                    <span className="text-slate-400">{dt.label}</span>
                  </div>
                ))}
              </div>

              {/* Drop zone */}
              <label
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl cursor-pointer transition-all"
                style={{ border: '2px dashed rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.04)' }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; }}
                onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; }}
              >
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => addFiles(e.target.files)} />
                <Upload size={22} className="text-blue-400" />
                <div className="text-center">
                  <p className="text-sm text-slate-300 font-medium">Drop files here or <span className="text-blue-400">browse</span></p>
                  <p className="text-xs text-slate-600 mt-0.5">PDF, PNG, JPG up to 10 MB each</p>
                </div>
              </label>

              {/* Added files */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((d, i) => (
                    <div key={i}
                      className="flex items-center gap-2 p-3 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <FileText size={12} className="text-emerald-400 shrink-0" />
                      <p className="text-xs text-slate-300 truncate flex-1 max-w-[130px]">{d.name}</p>
                      <select
                        value={d.type}
                        onChange={e => setDocuments(p => p.map((doc, j) => j === i ? { ...doc, type: e.target.value } : doc))}
                        className="text-xs rounded-lg px-2 py-1 outline-none"
                        style={{ background: 'rgba(13,27,62,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}
                      >
                        {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                      </select>
                      <button onClick={() => setDocuments(p => p.filter((_, j) => j !== i))}
                        className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 text-center">You can also upload documents after login from your vendor portal.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-7">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)',
                boxShadow: '0 4px 24px rgba(37,99,235,0.4)',
              }}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
              ) : step === 3 ? (
                <>Create Account <ArrowRight size={14} /></>
              ) : step === 4 ? (
                <>{documents.length > 0 ? 'Upload & Continue' : 'Skip for now'} <ArrowRight size={14} /></>
              ) : (
                <>Continue <ArrowRight size={14} /></>
              )}
            </button>
          </div>

          {step === 1 && (
            <p className="text-center text-xs text-slate-500 mt-4">
              Already registered?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in here
              </Link>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-3">
          Step {step} of {STEPS.length} — {STEPS[step - 1].label}
        </p>
      </div>
    </div>
  );
}
