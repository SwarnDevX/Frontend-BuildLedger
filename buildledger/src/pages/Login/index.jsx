import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, HardHat, ArrowRight, Lock, User, AlertCircle, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const DEMO_HINTS = [
  { role: "Admin",    username: "admin12", color: "#60a5fa", dot: "#2563EB" },
  { role: "Manager",  username: "string",  color: "#34d399", dot: "#059669" },
  { role: "Vendor",   username: "vendor",  color: "#fbbf24", dot: "#d97706" },
];

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
  try {
  const user = await login(form.username, form.password);

  // ← Redirect to change password page if required
  if (user?.requiresPasswordChange) {
    navigate("/change-password", {
      state: { username: user.username },
      replace: true,
    });
    return;
  }

  toast.success(`Welcome back, ${user.name || user.username}!`);
  navigate(user.role === "VENDOR" ? "/vendor/dashboard" : from, { replace: true });
} catch (err) {
      const msg = err.response?.data?.message || "Invalid username or password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 35%, #0f2855 60%, #0a1628 100%)",
      }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary blue orb */}
        <div
          className="absolute -top-48 -left-24 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        {/* Teal accent orb */}
        <div
          className="absolute top-1/3 -right-32 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
        {/* Bottom orb */}
        <div
          className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        {/* Fine grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Diagonal highlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, transparent 40%, rgba(37,99,235,0.06) 60%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Glass card */}
        <div
          className="rounded-3xl p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)",
                boxShadow: "0 8px 32px rgba(37,99,235,0.5)",
              }}
            >
              <HardHat size={28} className="text-white" />
            </div>
            <h1
              className="text-2xl font-bold"
              style={{
                background: "linear-gradient(135deg, #ffffff, #93c5fd)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              BuildLedger
            </h1>
            <p className="text-xs text-slate-400 mt-1 tracking-wide">
              Construction Contract & Vendor Management
            </p>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
            <p className="text-sm text-slate-400 mt-0.5">Enter your credentials to continue</p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="flex items-center gap-2.5 p-3.5 rounded-2xl mb-5 text-sm"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                USERNAME
              </label>
              <div className="relative group">
                <User
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"
                />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={(e) => { setForm(p => ({ ...p, username: e.target.value })); if (error) setError(""); }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.7)";
                    e.target.style.background  = "rgba(59,130,246,0.08)";
                    e.target.style.boxShadow   = "0 0 0 3px rgba(59,130,246,0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.background  = "rgba(255,255,255,0.06)";
                    e.target.style.boxShadow   = "none";
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                PASSWORD
              </label>
              <div className="relative group">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"
                />
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => { setForm(p => ({ ...p, password: e.target.value })); if (error) setError(""); }}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.7)";
                    e.target.style.background  = "rgba(59,130,246,0.08)";
                    e.target.style.boxShadow   = "0 0 0 3px rgba(59,130,246,0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.background  = "rgba(255,255,255,0.06)";
                    e.target.style.boxShadow   = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-300 transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)",
                boxShadow: loading ? "none" : "0 4px 24px rgba(37,99,235,0.5)",
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = "0 6px 32px rgba(37,99,235,0.65)")}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.boxShadow = "0 4px 24px rgba(37,99,235,0.5)")}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-xs text-slate-600 font-medium">or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Vendor register */}
          <Link
            to="/vendor/register"
            className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.09)";
              e.currentTarget.style.color = "#e2e8f0";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <Building2 size={15} />
            Register as a Vendor
          </Link>

          {/* Vendor re-upload documents */}
          <Link
            to="/vendor/reupload-documents"
            className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-sm font-medium transition-all mt-2"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#64748b",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            Already registered? Re-upload documents
          </Link>

          <p className="text-center text-[11px] text-slate-600 mt-6">
            Secured · BuildLedger © 2026
          </p>
        </div>

        {/* Demo role hint cards */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {DEMO_HINTS.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => setForm(p => ({ ...p, username: r.username }))}
              className="rounded-2xl p-3 text-center transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: r.dot }} />
              <p className="text-[10px] font-semibold" style={{ color: r.color }}>{r.role}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">{r.username}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
