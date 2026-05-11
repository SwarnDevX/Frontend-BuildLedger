import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  FileText,
  Truck,
  CreditCard,
  ShieldCheck,
  User,
  ShieldAlert,
  Activity,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  getMyNotifications,
  getAllNotifications,
  markNotificationAsRead,
  getUnreadCount,
} from "../../api/notifications";
import { useAuth } from "../../context/AuthContext";

const typeIcons = {
  Contract: FileText,
  Delivery: Truck,
  Invoice: CreditCard,
  Compliance: ShieldCheck,
  Vendor: User,
  Payment: CreditCard,
  Audit: FileText,
  IAM: ShieldAlert,
  Service: Activity,
  Other: Bell,
};
const typeColors = {
  Contract: "#2563EB",
  Delivery: "#14B8A6",
  Invoice: "#F59E0B",
  Compliance: "#EF4444",
  Vendor: "#8B5CF6",
  Payment: "#0EA5E9",
  Audit: "#0F766E",
  IAM: "#9333EA",
  Service: "#F97316",
  Other: "#64748B",
};
const typeBg = {
  Contract: "rgba(37,99,235,0.08)",
  Delivery: "rgba(20,184,166,0.08)",
  Invoice: "rgba(245,158,11,0.08)",
  Compliance: "rgba(239,68,68,0.08)",
  Vendor: "rgba(139,92,246,0.08)",
  Payment: "rgba(14,165,233,0.08)",
  Audit: "rgba(15,118,110,0.08)",
  IAM: "rgba(147,51,234,0.08)",
  Service: "rgba(249,115,22,0.08)",
  Other: "rgba(100,116,139,0.08)",
};
const severityBorder = {
  error: "border-l-red-400",
  warning: "border-l-amber-400",
  info: "border-l-blue-400",
  success: "border-l-green-400",
};

const filters = [
  "All",
  "Unread",
  "Contract",
  "Delivery",
  "Invoice",
  "Compliance",
  "Vendor",
  "Payment",
  "Audit",
  "IAM",
  "Service",
  "Other",
];

const getNotificationCategory = (type) => {
  if (!type) return "Other";
  const normalized = type.toUpperCase();
  if (normalized.startsWith("CONTRACT")) return "Contract";
  if (
    normalized.startsWith("DELIVERY") ||
    normalized.startsWith("SCHEDULER_DELIVERY")
  )
    return "Delivery";
  if (normalized.startsWith("INVOICE")) return "Invoice";
  if (normalized.startsWith("PAYMENT")) return "Payment";
  if (normalized.startsWith("COMPLIANCE")) return "Compliance";
  if (normalized.startsWith("VENDOR")) return "Vendor";
  if (normalized.startsWith("AUDIT")) return "Audit";
  if (normalized.startsWith("IAM") || normalized.startsWith("USER"))
    return "IAM";
  if (normalized.startsWith("SERVICE")) return "Service";
  return "Other";
};

const humanizeType = (type) =>
  type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

const getSeverity = (type) => {
  const warningKeywords = ["PENDING", "DUE", "PROCESSING", "DELAY", "STARTED"];
  const errorKeywords = [
    "OVERDUE",
    "REJECTED",
    "FAILED",
    "TERMINATED",
    "EXPIRED",
  ];
  const normalized = (type || "").toUpperCase();
  if (errorKeywords.some((keyword) => normalized.includes(keyword)))
    return "error";
  if (warningKeywords.some((keyword) => normalized.includes(keyword)))
    return "warning";
  return "success";
};

export default function Notifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendUnreadCount, setBackendUnreadCount] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [notificationsRes, unreadRes] = await Promise.allSettled([
        isAdmin ? getAllNotifications() : getMyNotifications(),
        getUnreadCount(),
      ]);

      const notifications =
        notificationsRes.status === "fulfilled" &&
        Array.isArray(notificationsRes.value.data)
          ? notificationsRes.value.data
          : [];

      const unreadCountFromApi =
        unreadRes.status === "fulfilled" &&
        typeof unreadRes.value.data === "number"
          ? unreadRes.value.data
          : null;

      const mappedItems = notifications.map((n) => ({
        id: n.id,
        rawType: n.type || "Unknown",
        category: getNotificationCategory(n.type),
        type: humanizeType(n.type || "Notification"),
        message:
          n.message || n.subject || humanizeType(n.type || "Notification"),
        severity: getSeverity(n.type),
        read: Boolean(n.read),
        time: n.createdAt ? new Date(n.createdAt).toLocaleString() : "—",
      }));

      setItems(mappedItems);
      setBackendUnreadCount(unreadCountFromApi);
    } catch (error) {
      console.error("Unable to load notifications", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = items
    .filter((n) => {
      if (filter === "All") return true;
      if (filter === "Unread") return !n.read;
      return n.category === filter;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Newest first
    });

  const markAllRead = async () => {
    const unreadItems = items.filter((n) => !n.read);
    await Promise.all(
      unreadItems.map((n) => markNotificationAsRead(n.id).catch(() => null)),
    );
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setBackendUnreadCount(0);

    window.dispatchEvent(new Event("notif-read-change"));
  };

  const markRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setBackendUnreadCount((prev) =>
        prev === null ? null : Math.max(prev - 1, 0),
      );

      window.dispatchEvent(new Event("notif-read-change"));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const unreadCount = items.filter((n) => !n.read).length;
  const displayUnreadCount =
    backendUnreadCount != null ? backendUnreadCount : unreadCount;

  return (
    <div className="animate-fadeIn space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
            <p className="text-sm text-slate-400">
            {displayUnreadCount} unread alerts
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-xs">
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="glass-card p-3 flex gap-2 flex-wrap">
        {filters.map((f) => {
          const count =
            f === "All"
              ? items.length
              : f === "Unread"
                ? items.filter((n) => !n.read).length
                : items.filter((n) => n.category === f).length;
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
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === f
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          "Contract",
          "Delivery",
          "Invoice",
          "Compliance",
          "Vendor",
          "Payment",
          "Audit",
          "IAM",
          "Service",
        ].map((type) => {
          const Icon = typeIcons[type] || Bell;
          const count = items.filter(
            (n) => n.category === type && !n.read,
          ).length;
          return (
            <div
              key={type}
              className="glass-card p-4 flex items-center gap-3 cursor-pointer"
              onClick={() => setFilter(type)}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: typeBg[type] }}
              >
                <Icon size={16} style={{ color: typeColors[type] }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {type}
                </p>
                {count > 0 ? (
                  <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold">
                    {count} unread
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">All clear</p>
                )}
              </div>
            </div>
          );
        })}
      </div> */}

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 size={18} className="animate-spin text-blue-500" />
          <span className="text-sm">Loading notifications…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="glass-card p-10 text-center">
              <CheckCheck size={28} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                All caught up!
              </p>
              <p className="text-xs text-slate-400">
                No notifications to show.
              </p>
            </div>
          )}
          {filtered.map((n) => {
            const Icon = typeIcons[n.category] || Bell;
            return (
              <div
                key={n.id}
                className={`glass-card p-4 flex items-start gap-3 border-l-4 transition-all ${severityBorder[n.severity]} ${!n.read ? "bg-white/80 dark:bg-slate-800/70" : "opacity-70"}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: typeBg[n.category] }}
                >
                  <Icon size={15} style={{ color: typeColors[n.category] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-xs leading-snug ${!n.read ? "text-slate-800 dark:text-slate-100 font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                    >
                      {n.message}
                    </p>
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700/60 dark:hover:text-blue-400 transition-all"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: typeColors[n.category] }}
                    >
                      {n.category}
                    </span>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
