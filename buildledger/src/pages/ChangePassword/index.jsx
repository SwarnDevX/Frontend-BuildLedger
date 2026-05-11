import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, HardHat } from "lucide-react";
import { changePassword } from "../../api/users";
import toast from "react-hot-toast";

export default function ChangePassword() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const username  = location.state?.username || "";

  const [form, setForm] = useState({
    username,
    currentPassword:  "",
    newPassword:      "",
    confirmPassword:  "",
  });

  const [show, setShow] = useState({
    current: false, newPw: false, confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError("New password cannot be the same as the current password.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(form);
      setSuccess(true);
      toast.success("Password changed successfully!");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Failed to change password. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 35%, #0f2855 60%, #0a1628 100%)",
        }}
      >
        <div
          className="rounded-3xl p-10 text-center max-w-sm w-full mx-4"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(34,197,94,0.15)" }}
          >
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Password Changed!
          </h2>
          <p className="text-sm text-slate-400">
            Redirecting you to login page…
          </p>
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
  const inputFocus = (e) => {
    e.target.style.borderColor = "rgba(59,130,246,0.7)";
    e.target.style.background  = "rgba(59,130,246,0.08)";
    e.target.style.boxShadow   = "0 0 0 3px rgba(59,130,246,0.12)";
  };
  const inputBlur = (e) => {
    e.target.style.borderColor = "rgba(255,255,255,0.1)";
    e.target.style.background  = "rgba(255,255,255,0.06)";
    e.target.style.boxShadow   = "none";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 35%, #0f2855 60%, #0a1628 100%)",
      }}
    >
      {/* Background orbs — same as Login */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-48 -left-24 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-1/3 -right-32 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
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
          <div className="text-center mb-6">
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
          </div>

          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={16} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-white">
                Change Your Password
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Your account requires a password change before you can continue.
            </p>
          </div>

          {/* Info banner */}
          <div
            className="flex items-start gap-2.5 p-3.5 rounded-2xl mb-5 text-sm"
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
            }}
          >
            <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <span className="text-blue-300 text-xs">
              Your account was created by an admin. Please set a new password
              using the temporary password sent to your email.
            </span>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="flex items-center gap-2.5 p-3.5 rounded-2xl mb-5"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username — readonly */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                USERNAME
              </label>
              <input
                type="text"
                value={form.username}
                readOnly
                className="w-full px-4 py-3 rounded-xl text-sm text-slate-400 outline-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  cursor: "not-allowed",
                }}
              />
            </div>

            {/* Current password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                CURRENT PASSWORD (from email)
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={show.current ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Enter temporary password"
                  value={form.currentPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShow((p) => ({ ...p, current: !p.current }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-300 transition-colors"
                >
                  {show.current ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                NEW PASSWORD
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={show.newPw ? "text" : "password"}
                  name="newPassword"
                  placeholder="Min. 8 characters"
                  value={form.newPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShow((p) => ({ ...p, newPw: !p.newPw }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-300 transition-colors"
                >
                  {show.newPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                CONFIRM NEW PASSWORD
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={show.confirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repeat new password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-300 transition-colors"
                >
                  {show.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {/* Match indicator */}
              {form.confirmPassword && (
                <p
                  className={`text-[11px] mt-1.5 ${
                    form.newPassword === form.confirmPassword
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {form.newPassword === form.confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)",
                boxShadow: loading ? "none" : "0 4px 24px rgba(37,99,235,0.5)",
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Changing password…
                </>
              ) : (
                <>
                  <CheckCircle size={15} /> Set New Password
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-600 mt-6">
            Secured · BuildLedger © 2026
          </p>
        </div>
      </div>
    </div>
  );
}