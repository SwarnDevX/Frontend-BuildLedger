import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { Toaster } from 'react-hot-toast';

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: isDark ? {
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '12px',
          color: '#e2e8f0',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
        } : {
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: '12px',
          color: '#0f172a',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        },
        success: { iconTheme: { primary: '#22C55E', secondary: isDark ? '#0f172a' : 'white' } },
        error:   { iconTheme: { primary: '#EF4444', secondary: isDark ? '#0f172a' : 'white' } },
      }}
    />
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
