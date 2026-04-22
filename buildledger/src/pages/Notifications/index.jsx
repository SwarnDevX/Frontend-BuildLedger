import { useState } from 'react';
import { Bell, FileText, Truck, CreditCard, ShieldCheck, Check, CheckCheck } from 'lucide-react';
import { notifications } from '../../data/mockData';

const typeIcons = { Contract: FileText, Delivery: Truck, Invoice: CreditCard, Compliance: ShieldCheck };
const typeColors = { Contract: '#2563EB', Delivery: '#14B8A6', Invoice: '#F59E0B', Compliance: '#EF4444' };
const typeBg = { Contract: 'rgba(37,99,235,0.08)', Delivery: 'rgba(20,184,166,0.08)', Invoice: 'rgba(245,158,11,0.08)', Compliance: 'rgba(239,68,68,0.08)' };
const severityBorder = { error: 'border-l-red-400', warning: 'border-l-amber-400', info: 'border-l-blue-400', success: 'border-l-green-400' };

const filters = ['All', 'Unread', 'Contract', 'Delivery', 'Invoice', 'Compliance'];

export default function Notifications() {
  const [filter, setFilter] = useState('All');
  const [items, setItems] = useState(notifications);

  const filtered = items.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.read;
    return n.type === filter;
  });

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <div className="animate-fadeIn space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Bell size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
            <p className="text-sm text-slate-400">{unreadCount} unread alerts</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-xs">
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="glass-card p-3 flex gap-2 flex-wrap">
        {filters.map(f => {
          const count = f === 'All' ? items.length
            : f === 'Unread' ? items.filter(n => !n.read).length
            : items.filter(n => n.type === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-white/60 text-slate-500 border border-white/80 hover:bg-white'}`}>
              {f}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Type stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Contract','Delivery','Invoice','Compliance'].map(type => {
          const Icon = typeIcons[type];
          const count = items.filter(n => n.type === type && !n.read).length;
          return (
            <div key={type} className="glass-card p-4 flex items-center gap-3 cursor-pointer" onClick={() => setFilter(type)}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: typeBg[type] }}>
                <Icon size={16} style={{ color: typeColors[type] }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">{type}</p>
                {count > 0 ? (
                  <p className="text-[10px] text-red-500 font-semibold">{count} unread</p>
                ) : (
                  <p className="text-[10px] text-slate-400">All clear</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="glass-card p-10 text-center">
            <CheckCheck size={28} className="mx-auto text-green-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">All caught up!</p>
            <p className="text-xs text-slate-400">No notifications to show.</p>
          </div>
        )}
        {filtered.map(n => {
          const Icon = typeIcons[n.type] || Bell;
          return (
            <div key={n.id}
              className={`glass-card p-4 flex items-start gap-3 border-l-4 transition-all ${severityBorder[n.severity]} ${!n.read ? 'bg-white/80' : 'opacity-70'}`}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: typeBg[n.type] }}>
                <Icon size={15} style={{ color: typeColors[n.type] }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs leading-snug ${!n.read ? 'text-slate-800 font-semibold' : 'text-slate-600'}`}>{n.message}</p>
                  {!n.read && (
                    <button onClick={() => markRead(n.id)}
                      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-all">
                      <Check size={12} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">{n.time}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span className="text-[10px] font-medium" style={{ color: typeColors[n.type] }}>{n.type}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

