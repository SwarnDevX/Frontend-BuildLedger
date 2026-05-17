import { useState, useEffect, useCallback } from "react";
import {
  Bell, FileText, Truck, CreditCard, ShieldCheck, User,
  ShieldAlert, Activity, Check, CheckCheck, Loader2, RefreshCw,
} from "lucide-react";
import {
  getMyNotifications, getAllNotifications,
  markNotificationAsRead, markNotificationAdminRead,
  markAllNotificationsAdminRead, getAdminUnreadCount, getUnreadCount,
} from "../../api/notifications";
import { useAuth } from "../../context/AuthContext";

/* ─── lookup maps ─── */
const typeIcons = {
  Contract: FileText, Delivery: Truck, Invoice: CreditCard,
  Compliance: ShieldCheck, Vendor: User, Payment: CreditCard,
  Audit: FileText, IAM: ShieldAlert, Service: Activity, Other: Bell,
};
const typeColors = {
  Contract: "#2563EB", Delivery: "#14B8A6", Invoice: "#F59E0B",
  Compliance: "#EF4444", Vendor: "#8B5CF6", Payment: "#0EA5E9",
  Audit: "#0F766E", IAM: "#9333EA", Service: "#F97316", Other: "#64748B",
};
const typeBg = {
  Contract: "rgba(37,99,235,0.08)", Delivery: "rgba(20,184,166,0.08)",
  Invoice: "rgba(245,158,11,0.08)", Compliance: "rgba(239,68,68,0.08)",
  Vendor: "rgba(139,92,246,0.08)", Payment: "rgba(14,165,233,0.08)",
  Audit: "rgba(15,118,110,0.08)", IAM: "rgba(147,51,234,0.08)",
  Service: "rgba(249,115,22,0.08)", Other: "rgba(100,116,139,0.08)",
};
const severityBorder = {
  error: "border-l-red-400", warning: "border-l-amber-400",
  info: "border-l-blue-400", success: "border-l-green-400",
};
const FILTERS = [
  "All","Unread","Contract","Delivery","Invoice","Compliance",
  "Vendor","Payment","Audit","IAM","Service","Other",
];

/* ─── pure helpers ─── */
function getCategory(type) {
  if (!type) return "Other";
  const u = type.toUpperCase();
  if (u.startsWith("CONTRACT"))  return "Contract";
  if (u.startsWith("DELIVERY") || u.startsWith("SCHEDULER_DELIVERY")) return "Delivery";
  if (u.startsWith("INVOICE"))   return "Invoice";
  if (u.startsWith("PAYMENT"))   return "Payment";
  if (u.startsWith("COMPLIANCE")) return "Compliance";
  if (u.startsWith("VENDOR"))    return "Vendor";
  if (u.startsWith("AUDIT"))     return "Audit";
  if (u.startsWith("IAM") || u.startsWith("USER")) return "IAM";
  if (u.startsWith("SERVICE"))   return "Service";
  return "Other";
}
function humanize(type) {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}
function getSeverity(type) {
  const u = (type || "").toUpperCase();
  if (["OVERDUE","REJECTED","FAILED","TERMINATED","EXPIRED"].some(k => u.includes(k))) return "error";
  if (["PENDING","DUE","PROCESSING","DELAY","STARTED"].some(k => u.includes(k))) return "warning";
  return "success";
}
function mapNotif(n) {
  return {
    id:        n.id,
    rawType:   n.type || "Unknown",
    category:  getCategory(n.type),
    type:      humanize(n.type || "Notification"),
    message:   n.message || n.subject || humanize(n.type || "Notification"),
    severity:  getSeverity(n.type),
    read:      Boolean(n.read),
    adminRead: Boolean(n.adminRead),
    createdAt: n.createdAt ?? null,   // ← preserved for sort
    time:      n.createdAt ? new Date(n.createdAt).toLocaleString() : "—",
  };
}

/* ─── NotificationItem — custom reusable component ─── */
function NotificationItem({ n, isAdmin, onMarkRead }) {
  const Icon    = typeIcons[n.category] || Bell;
  const isUnread = isAdmin ? !n.adminRead : !n.read;

  return (
    <div
      className={`glass-card p-4 flex items-start gap-3 border-l-4 transition-all
        ${severityBorder[n.severity]}
        ${isUnread ? "bg-white/80 dark:bg-slate-800/70" : "opacity-60"}`}
    >
      {/* Category icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: typeBg[n.category] }}
      >
        <Icon size={15} style={{ color: typeColors[n.category] }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs leading-snug ${
            isUnread
              ? "text-slate-800 dark:text-slate-100 font-semibold"
              : "text-slate-500 dark:text-slate-400"
          }`}>
            {n.message}
          </p>
          {isUnread && (
            <button
              onClick={() => onMarkRead(n.id)}
              title="Mark as read"
              className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
                text-slate-400 hover:bg-slate-100 hover:text-blue-600
                dark:hover:bg-slate-700/60 dark:hover:text-blue-400 transition-all"
            >
              <Check size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-400">{n.time}</span>
          <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
          <span className="text-[10px] font-medium" style={{ color: typeColors[n.category] }}>
            {n.category}
          </span>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Notifications() {
  const { user }   = useAuth();
  const isAdmin    = user?.role === "ADMIN";

  const [filter,   setFilter]   = useState("All");
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [backendUnreadCount, setBackendUnreadCount] = useState(null);

  /* ── shared fetch logic ── */
  const loadNotifications = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [notifRes, unreadRes] = await Promise.allSettled([
        isAdmin ? getAllNotifications() : getMyNotifications(),
        isAdmin
          ? Promise.resolve({ status: "fulfilled", value: { data: null } })
          : getUnreadCount(),
      ]);

      const raw = notifRes.status === "fulfilled" && Array.isArray(notifRes.value.data)
        ? notifRes.value.data
        : [];

      // Admin: show only admin-addressed notifications
      const filtered = isAdmin ? raw.filter(n => n.recipientEmail === "admin") : raw;

      const unreadFromApi =
        unreadRes.status === "fulfilled" && typeof unreadRes.value.data === "number"
          ? unreadRes.value.data
          : null;

      setItems(filtered.map(mapNotif));
      setBackendUnreadCount(unreadFromApi);
    } catch (err) {
      console.error("Unable to load notifications", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [isAdmin]);

  /* ── initial load ── */
  const fetchAll = useCallback(() => loadNotifications(true),  [loadNotifications]);

  /* ── silent background poll — no spinner, no flicker ── */
  const silentPoll = useCallback(() => loadNotifications(false), [loadNotifications]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(silentPoll, 10_000); // refresh every 10 s
    return () => clearInterval(id);
  }, [silentPoll]);

  /* ── mark read ── */
  const markRead = async (id) => {
    try {
      if (isAdmin) {
        await markNotificationAdminRead(id);
        setItems(prev => prev.map(n => n.id === id ? { ...n, adminRead: true } : n));
        try {
          const res = await getAdminUnreadCount();
          const remaining = typeof res.data === "number" ? res.data : 0;
          window.dispatchEvent(new CustomEvent("notif-read-change", { detail: { count: remaining } }));
        } catch {
          window.dispatchEvent(new CustomEvent("notif-read-change", { detail: { count: 0 } }));
        }
      } else {
        await markNotificationAsRead(id);
        setItems(prev => {
          const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
          const remaining = updated.filter(n => !n.read).length;
          window.dispatchEvent(new CustomEvent("notif-read-change", { detail: { count: remaining } }));
          return updated;
        });
      }
      setBackendUnreadCount(prev => prev === null ? null : Math.max(prev - 1, 0));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllRead = async () => {
    if (isAdmin) {
      await markAllNotificationsAdminRead().catch(() => null);
      setItems(prev => prev.map(n => ({ ...n, adminRead: true })));
    } else {
      const unread = items.filter(n => !n.read);
      await Promise.all(unread.map(n => markNotificationAsRead(n.id).catch(() => null)));
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    }
    setBackendUnreadCount(0);
    window.dispatchEvent(new CustomEvent("notif-read-change", { detail: { count: 0 } }));
  };

  /* ── derived values ── */
  const unreadCount = isAdmin
    ? items.filter(n => !n.adminRead).length
    : items.filter(n => !n.read).length;

  const displayUnreadCount = isAdmin
    ? unreadCount
    : (backendUnreadCount != null ? backendUnreadCount : unreadCount);

  /* ── filter + sort newest-first ── */
  const displayed = items
    .filter(n => {
      if (filter === "All")    return true;
      if (filter === "Unread") return isAdmin ? !n.adminRead : !n.read;
      return n.category === filter;
    })
    .sort((a, b) => {
      // createdAt is now always preserved — sort newest → oldest
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

  /* ── render ── */
  return (
    <div className="animate-fadeIn space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Notifications
            </h2>
            <p className="text-sm text-slate-400">{displayUnreadCount} unread alerts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-xs flex items-center gap-1.5">
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="glass-card p-3 flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const count =
            f === "All"    ? items.length :
            f === "Unread" ? (isAdmin ? items.filter(n => !n.adminRead).length : items.filter(n => !n.read).length) :
            items.filter(n => n.category === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filter === f
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white/60 text-slate-500 border border-white/80 hover:bg-white dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/40 dark:hover:bg-slate-700/60"
              }`}
            >
              {f}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === f
                  ? "bg-white/25 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 size={18} className="animate-spin text-blue-500" />
          <span className="text-sm">Loading notifications…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <CheckCheck size={28} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="text-xs text-slate-400">No notifications to show.</p>
            </div>
          ) : (
            displayed.map(n => (
              <NotificationItem
                key={n.id}
                n={n}
                isAdmin={isAdmin}
                onMarkRead={markRead}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
