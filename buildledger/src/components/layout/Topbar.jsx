import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, ChevronDown, Moon, Sun, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  getAllNotifications,
  getNotificationsByEmail,
} from "../../api/notifications";

const pageTitles = {
  "/": "Dashboard",
  "/vendors": "Vendor Management",
  "/projects": "Project Management",
  "/contracts": "Contract Management",
  "/deliveries": "Delivery Tracking",
  "/invoices": "Invoices & Payments",
  "/compliance": "Compliance & Audit",
  "/admin": "Admin Panel",
  "/notifications": "Notifications",
  "/vendor/dashboard": "Vendor Portal",
};

export default function Topbar({ sidebarWidth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      )
        setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refreshUnread = async () => {
      if (!user?.email) {
        if (isMounted) {
          setUnread(0);
          setNotifications([]);
        }
        return;
      }
      try {
        const res =
          user.role === "ADMIN"
            ? await getAllNotifications()
            : await getNotificationsByEmail(user.email);
        const data = Array.isArray(res.data) ? res.data : [];
        if (isMounted) {
          setNotifications(data);
          setUnread(data.filter((n) => !n.read).length);
        }
      } catch {
        if (isMounted) {
          setUnread(0);
          setNotifications([]);
        }
      }
    };

    refreshUnread();
    const interval = setInterval(refreshUnread, 1000); // Refresh every 5 seconds for new notifications
    window.addEventListener("notif-read-change", refreshUnread);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("notif-read-change", refreshUnread);
    };
  }, [user]);

  const title = pageTitles[location.pathname] || "BuildLedger";
  const initials = (user?.name || user?.username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const iconBtn = `w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm
    bg-white/60 border border-white/80 text-slate-500 hover:bg-white
    dark:bg-slate-800/50 dark:border-slate-600/40 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-slate-100`;

  return (
    <header
      className="glass-topbar fixed top-0 right-0 z-20 flex items-center gap-4 px-6"
      style={{ left: sidebarWidth, height: 64 }}
    >
      <div className="flex-1">
        <h1 className="text-base font-semibold text-slate-700 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">{today}</p>
      </div>
      {/* Search */}
      <div
        className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 w-56 shadow-sm
        bg-white/60 border border-white/80
        dark:bg-slate-800/50 dark:border-slate-600/40"
      >
        <Search
          size={14}
          className="text-slate-400 dark:text-slate-400 shrink-0"
        />
        <input
          className="bg-transparent text-sm outline-none w-full
            text-slate-600 placeholder-slate-400
            dark:text-slate-200 dark:placeholder-slate-500"
          placeholder="Search…"
        />
      </div>
      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className={`${iconBtn} cursor-pointer`}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun size={15} className="text-amber-400" />
        ) : (
          <Moon size={15} />
        )}
      </button>
      {/* Notifications */}
      <div className="relative" ref={notificationsRef}>
        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative ${iconBtn} cursor-pointer`}
        >
          <Bell size={15} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white border border-black/10 py-1 shadow-xl animate-fadeIn z-50 dark:bg-slate-950 dark:border-slate-700 max-h-96 overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/50">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Unread Notifications ({unread})
              </p>
            </div>
            {notifications.filter((n) => !n.read).length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No unread notifications
              </div>
            ) : (
              notifications
                .filter((n) => !n.read)
                .sort((a, b) => {
                  const dateA = new Date(a.createdAt || 0).getTime();
                  const dateB = new Date(b.createdAt || 0).getTime();
                  return dateB - dateA; // Newest first
                })
                .slice(0, 5) // Show only first 5
                .map((notification) => (
                  <div
                    key={notification.id}
                    className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => {
                      navigate("/notifications");
                      setShowNotifications(false);
                    }}
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {notification.title || notification.message}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
            )}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={() => {
                  navigate("/notifications");
                  setShowNotifications(false);
                }}
                className="w-full text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>
      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {user?.name || user?.username}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
          <ChevronDown
            size={13}
            className="text-slate-400 dark:text-slate-400"
          />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white border border-black/10 py-1 shadow-xl animate-fadeIn z-50 dark:bg-slate-950 dark:border-slate-700">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/50">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {user?.name || user?.username}
              </p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setShowMenu(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
