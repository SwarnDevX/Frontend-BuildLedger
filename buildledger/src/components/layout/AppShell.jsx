import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useTheme } from '../../context/ThemeContext';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { isDark } = useTheme();
  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <div
      className="min-h-screen"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #060b18 0%, #0a1228 55%, #06101e 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 40%, #e8f4f8 100%)',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Decorative ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/2 -left-32 w-80 h-80 rounded-full"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-20 right-1/4 w-64 h-64 rounded-full"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
          }}
        />
        {/* Extra dark-mode-only accent blob */}
        {isDark && (
          <div
            className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }}
          />
        )}
      </div>

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Topbar sidebarWidth={sidebarWidth} />

      <main
        className="relative z-10 transition-all duration-300 pt-16 min-h-screen"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
