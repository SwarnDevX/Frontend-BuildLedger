import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HardHat, ArrowRight, ArrowLeft, CheckCircle2,
  Building2, User, Mail, Phone, MapPin, Tag,
  Lock, Eye, EyeOff, FileText, Upload, X, AlertCircle
} from 'lucide-react';
import { registerVendor, uploadVendorDocument } from '../../api/vendors';
import toast from 'react-hot-toast';

const CATEGORIES = ['Materials', 'Electrical', 'Safety', 'Energy', 'Structural', 'Plumbing', 'Civil', 'Mechanical', 'IT & Technology', 'Other'];

const DOC_TYPES = [
  { label: 'PAN Card',                   value: 'PAN_CARD' },
  { label: 'GST Certificate',            value: 'GST_CERTIFICATE' },
  { label: 'Business License',           value: 'BUSINESS_LICENSE' },
  { label: 'Incorporation Certificate',  value: 'INCORPORATION_CERTIFICATE' },
  { label: 'Bank Statement',             value: 'BANK_STATEMENT' },
  { label: 'Quality Certificate',        value: 'QUALITY_CERTIFICATE' },
  { label: 'ISO Certificate',            value: 'ISO_CERTIFICATE' },
  { label: 'Other',                      value: 'OTHER' },
];

const STEPS = [
  { id: 1, label: 'Business Info',  icon: Building2 },
  { id: 2, label: 'Contact',        icon: User },
  { id: 3, label: 'Account Setup',  icon: Lock },
  { id: 4, label: 'Documents',      icon: FileText },
  { id: 5, label: 'Review',         icon: CheckCircle2 },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                ${done ? 'bg-green-500 shadow-lg shadow-green-500/30' : active ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white/10'}`}>
                {done ? <CheckCircle2 size={16} className="text-white" /> : <Icon size={15} className={active ? 'text-white' : 'text-slate-500'} />}
              </div>
              <span className={`text-[9px] font-semibold whitespace-nowrap hidden sm:block ${active ? 'text-blue-400' : done ? 'text-green-400' : 'text-slate-600'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 sm:w-14 h-0.5 mb-4 mx-1 transition-all duration-500 ${done ? 'bg-green-500' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldRow({ icon: Icon, label, type = 'text', value, onChange, placeholder, required, options, error }) {
  const [show, setShow] = useState(false);
  const inputStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
    color: 'white',
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />}
        {options ? (
          <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all appearance-none"
            style={inputStyle}>
            <option value="">Select {label}</option>
            {options.map(o => <option key={o} value={o} style={{ background: '#1e3a5f' }}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
            style={inputStyle} />
        ) : (
          <input
            type={type === 'password' ? (show ? 'text' : 'password') : type}
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all placeholder-slate-500"
            style={inputStyle}
          />
        )}
        {type === 'password' && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export default function VendorRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '', category: '', address: '',
    contactInfo: '', email: '', phone: '',
    username: '', password: '', confirmPassword: '',
  });

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.name.trim()) e.name = 'Company name is required';
      if (!form.category) e.category = 'Category is required';
      if (!form.address.trim()) e.address = 'Address is required';
    }
    if (step === 2) {
      if (!form.email.trim()) e.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format';
      if (!form.phone.trim()) e.phone = 'Phone is required';
      if (!form.contactInfo.trim()) e.contactInfo = 'Contact person name is required';
    }
    if (step === 3) {
      if (!form.username.trim()) e.username = 'Username is required';
      if (!form.password) e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'Minimum 6 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;

    if (step === 3) {
      // Submit registration
      setLoading(true);
      try {
        const payload = {
          name: form.name,
          category: form.category,
          address: form.address,
          contactInfo: form.contactInfo,
          email: form.email,
          phone: form.phone,
          username: form.username,
          password: form.password,
        };
        const res = await registerVendor(payload);
        console.log('Register response:', res.data);
        const data = res.data?.data || res.data;
        const extractedId = data?.vendorId || data?.id || data?.vendor_id || data?.vendor?.id || data?.vendor?.vendorId;
        console.log('Extracted vendorId:', extractedId);
        setVendorId(extractedId);
        // Save token if returned so document upload is authenticated
        const token = data?.token || res.data?.token;
        if (token) {
          localStorage.setItem('bl_token', token);
        }
        toast.success('Account created! Now upload your documents.');
        setStep(4);
      } catch (err) {
        const msg = err.response?.data?.message || 'Registration failed. Please try again.';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 4) {
      // Upload documents (optional, skip allowed)
      if (documents.length > 0) {
        if (!vendorId) {
          console.error('vendorId is missing — cannot upload documents');
          toast.error('Vendor ID missing. Please re-register or upload documents after login.');
          setStep(5);
          return;
        }
        setLoading(true);
        try {
          for (const doc of documents) {
            console.log('Uploading doc:', doc.name, 'type:', doc.type, 'vendorId:', vendorId);
            await uploadVendorDocument(vendorId, doc.file, doc.type);
          }
          toast.success('Documents uploaded!');
        } catch (err) {
          console.error('Document upload error:', err);
          console.error('Response:', err.response?.data);
          toast.error('Document upload failed, but you can upload later.');
        } finally {
          setLoading(false);
        }
      }
      setStep(5);
      return;
    }

    setStep(s => s + 1);
  };

  const addDocument = (e) => {
    const files = Array.from(e.target.files);
    const mapped = files.map(f => ({ file: f, type: 'PAN_CARD', name: f.name }));
    setDocuments(p => [...p, ...mapped]);
  };

  if (success || step === 5) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d4a6f 100%)' }}>
        <div className="relative z-10 w-full max-w-md px-4 text-center">
          <div className="rounded-3xl p-10 shadow-2xl animate-fadeIn"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={36} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Your vendor registration is <strong className="text-amber-400">pending review</strong>. Our team will verify your documents and activate your account within 1–2 business days.
            </p>
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-2xl text-left" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">What's Next?</p>
                {['Document review by compliance team','Email notification on approval','Login with your credentials'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                    <p className="text-xs text-slate-300">{t}</p>
                  </div>
                ))}
              </div>
              <Link to="/login"
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#2563EB,#1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}>
                Go to Login <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-10"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d4a6f 100%)' }}>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -right-24 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #14B8A6 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-4"
            style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)' }}>
            <HardHat size={14} className="text-teal-400" />
            <span className="text-xs font-semibold text-teal-300">Vendor Registration</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Join BuildLedger</h1>
          <p className="text-sm text-slate-400 mt-1">Complete your vendor profile in a few steps</p>
        </div>

        <div className="rounded-3xl p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.15)' }}>

          <StepIndicator current={step} />

          {/* Step 1 — Business Info */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-4">
                <h3 className="text-base font-bold text-white">Business Information</h3>
                <p className="text-xs text-slate-400">Tell us about your company</p>
              </div>
              <FieldRow icon={Building2} label="Company Name" value={form.name} onChange={set('name')} placeholder="Acme Construction Ltd." required error={errors.name} />
              <FieldRow icon={Tag} label="Category" value={form.category} onChange={set('category')} options={CATEGORIES} required error={errors.category} />
              <FieldRow icon={MapPin} label="Business Address" type="textarea" value={form.address} onChange={set('address')} placeholder="123 Builder St, City, State ZIP" required error={errors.address} />
            </div>
          )}

          {/* Step 2 — Contact */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-4">
                <h3 className="text-base font-bold text-white">Contact Details</h3>
                <p className="text-xs text-slate-400">How can we reach you?</p>
              </div>
              <FieldRow icon={User} label="Contact Person" value={form.contactInfo} onChange={set('contactInfo')} placeholder="John Smith" required error={errors.contactInfo} />
              <FieldRow icon={Mail} label="Business Email" type="email" value={form.email} onChange={set('email')} placeholder="contact@company.com" required error={errors.email} />
              <FieldRow icon={Phone} label="Phone Number" value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" required error={errors.phone} />
            </div>
          )}

          {/* Step 3 — Account Setup */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-4">
                <h3 className="text-base font-bold text-white">Account Setup</h3>
                <p className="text-xs text-slate-400">Create your login credentials</p>
              </div>
              <FieldRow icon={User} label="Username" value={form.username} onChange={set('username')} placeholder="yourcompany123" required error={errors.username} />
              <FieldRow icon={Lock} label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required error={errors.password} />
              <FieldRow icon={Lock} label="Confirm Password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat your password" required error={errors.confirmPassword} />
              {/* Password strength */}
              {form.password && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Password strength</p>
                  <div className="flex gap-1">
                    {[1,2,3,4].map(n => {
                      const s = form.password.length >= n * 2 + 2 ? (n <= 2 ? 'bg-amber-500' : 'bg-green-500') : 'bg-white/10';
                      return <div key={n} className={`flex-1 h-1.5 rounded-full transition-all ${s}`} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Documents */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="mb-4">
                <h3 className="text-base font-bold text-white">Upload Documents</h3>
                <p className="text-xs text-slate-400">Compliance docs speed up approval (optional)</p>
              </div>
              {/* Doc types */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {DOC_TYPES.map(dt => (
                  <div key={dt.value} className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <FileText size={12} className="text-teal-400 shrink-0" />
                    {dt.label}
                  </div>
                ))}
              </div>
              {/* Drop zone */}
              <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl cursor-pointer transition-all"
                style={{ border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setDocuments(p => [...p, ...Array.from(e.dataTransfer.files).map(f => ({ file: f, type: 'PAN_CARD', name: f.name }))]); }}>
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={addDocument} />
                <Upload size={24} className="text-blue-400" />
                <div className="text-center">
                  <p className="text-sm text-slate-300 font-medium">Drop files here or <span className="text-blue-400">browse</span></p>
                  <p className="text-xs text-slate-600">PDF, PNG, JPG up to 10MB each</p>
                </div>
              </label>
              {/* File list */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-xl"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <FileText size={13} className="text-green-400 shrink-0" />
                      <p className="text-xs text-slate-300 truncate flex-1 max-w-[140px]">{d.name}</p>
                      <select
                        value={d.type}
                        onChange={e => setDocuments(p => p.map((doc, j) => j === i ? { ...doc, type: e.target.value } : doc))}
                        className="text-xs rounded-lg px-2 py-1 outline-none"
                        style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8' }}>
                        {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                      </select>
                      <button onClick={() => setDocuments(p => p.filter((_, j) => j !== i))}
                        className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500 text-center">You can also upload documents after login</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} disabled={loading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}>
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <button onClick={handleNext} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#2563EB,#1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}>
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                : step === 3 ? <> Create Account <ArrowRight size={15} /></>
                : step === 4 ? <> {documents.length > 0 ? 'Upload & Continue' : 'Skip for now'} <ArrowRight size={15} /></>
                : <> Continue <ArrowRight size={15} /></>
              }
            </button>
          </div>

          {step === 1 && (
            <p className="text-center text-xs text-slate-500 mt-4">
              Already registered? <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in here</Link>
            </p>
          )}
        </div>

        {/* Progress text */}
        <p className="text-center text-xs text-slate-600 mt-4">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
      </div>
    </div>
  );
}

