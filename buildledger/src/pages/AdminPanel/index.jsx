import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Settings, ToggleLeft, ToggleRight, UserPlus, X, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getAllUsers, createUser, deleteUser, updateUser } from '../../api/users';
import toast from 'react-hot-toast';

const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'FINANCE_OFFICER', 'COMPLIANCE_OFFICER'];
const ROLE_LABELS = { ADMIN: 'Admin', PROJECT_MANAGER: 'Project Manager', FINANCE_OFFICER: 'Finance Officer', COMPLIANCE_OFFICER: 'Compliance Officer' };

const permissions = ['View Contracts','Edit Contracts','View Vendors','Edit Vendors','View Invoices','Approve Invoices','View Reports','Export Data','Manage Users','System Settings'];
const defaultPerms = {
  'ADMIN': [true,true,true,true,true,true,true,true,true,true],
  'PROJECT_MANAGER': [true,true,true,false,true,false,true,true,false,false],
  'FINANCE_OFFICER': [true,false,true,false,true,true,true,true,false,false],
  'COMPLIANCE_OFFICER': [true,false,true,false,true,false,true,true,false,false],
};

const EMPTY_FORM = { name: '', username: '', email: '', phone: '', password: '', role: 'PROJECT_MANAGER' };

export default function AdminPanel() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [editUser, setEditUser]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErr, setFormErr]         = useState({});
  const [saving, setSaving]           = useState(false);
  const [selectedRole, setSelectedRole] = useState('PROJECT_MANAGER');
  const [perms, setPerms]             = useState(defaultPerms);
  const [toggles, setToggles]         = useState({ autoApproval: false, twoFactor: true, auditLogging: true, notifications: true });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAllUsers();
      setUsers(res.data?.data || res.data || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setFormErr({}); setEditUser(null); setShowCreate(true); };
  const openEdit   = (u) => { setForm({ name: u.name || '', username: u.username || '', email: u.email || '', phone: u.phone || '', password: '', role: u.role }); setFormErr({}); setEditUser(u); setShowCreate(true); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.username.trim()) e.username = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    if (!editUser && !form.password) e.password = 'Required for new users';
    setFormErr(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editUser) {
        const payload = { name: form.name, username: form.username, email: form.email, phone: form.phone, role: form.role };
        if (form.password) payload.password = form.password;
        await updateUser(editUser.userId, payload);
        toast.success('User updated successfully');
      } else {
        await createUser({ name: form.name, username: form.username, email: form.email, phone: form.phone, password: form.password, role: form.role, status: 'ACTIVE' });
        toast.success(`${ROLE_LABELS[form.role]} created successfully`);
      }
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.name || u.username}"?`)) return;
    try {
      await deleteUser(u.userId);
      toast.success('User deleted');
      fetchUsers();
    } catch { toast.error('Delete failed'); }
  };

  const togglePerm = (role, idx) => {
    if (role === 'ADMIN') return;
    setPerms(prev => ({ ...prev, [role]: prev[role].map((v, i) => i === idx ? !v : v) }));
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target?.value ?? e }));

  // Badge status mapping
  const roleBadge = (role) => ({ ADMIN: 'Admin', PROJECT_MANAGER: 'Project Manager', FINANCE_OFFICER: 'Finance', COMPLIANCE_OFFICER: 'Compliance', VENDOR: 'Compliance' })[role] || role;

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Admin Panel</h2>
          <p className="text-sm text-slate-400">User management & system configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="btn-secondary text-xs"><RefreshCw size={13} /> Refresh</button>
          <button onClick={openCreate} className="btn-primary text-xs"><UserPlus size={14} /> Add User</button>
        </div>
      </div>

      {/* Quick role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(r => {
          const count = users.filter(u => u.role === r).length;
          return (
            <div key={r} className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{count}</p>
              <p className="text-[10px] text-slate-400 font-medium">{ROLE_LABELS[r]}</p>
            </div>
          );
        })}
      </div>

      {/* User table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">All Users ({users.length})</h3>
          {loading && <Loader2 size={15} className="text-blue-600 animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                {['User','Email','Role','Status','Joined',''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(u.name || u.username || 'U').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{u.name || '—'}</p>
                        <p className="text-[10px] text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{u.email}</td>
                  <td className="px-5 py-3"><Badge status={roleBadge(u.role)} /></td>
                  <td className="px-5 py-3">
                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold w-fit ${u.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{u.createdAt?.slice(0,10) || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50"><Edit2 size={13} /></button>
                      {u.role !== 'ADMIN' && (
                        <button onClick={() => handleDelete(u)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Panel */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-700">Role Permissions Matrix</h3>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {ROLES.map(r => (
            <button key={r} onClick={() => setSelectedRole(r)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${selectedRole === r ? 'bg-blue-600 text-white shadow-sm' : 'bg-white/60 text-slate-500 border border-white/80 hover:bg-white'}`}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {permissions.map((perm, idx) => {
            const enabled = (perms[selectedRole] || [])[idx];
            return (
              <div key={perm} onClick={() => togglePerm(selectedRole, idx)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none
                  ${enabled ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}
                  ${selectedRole === 'ADMIN' ? 'cursor-default' : 'hover:shadow-sm'}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="leading-tight">{perm}</span>
                  {enabled ? <ToggleRight size={13} className="text-blue-600 shrink-0 ml-1" /> : <ToggleLeft size={13} className="text-slate-300 shrink-0 ml-1" />}
                </div>
              </div>
            );
          })}
        </div>
        {selectedRole === 'ADMIN' && <p className="text-[10px] text-slate-400 mt-2">Admin has full access and cannot be modified.</p>}
      </div>

      {/* System Settings */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-700">System Configuration</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'autoApproval', label: 'Auto-Approve Invoices under $10K', desc: 'Automatically approve small invoices' },
            { key: 'twoFactor', label: 'Two-Factor Authentication', desc: 'Require 2FA for all users' },
            { key: 'auditLogging', label: 'Audit Logging', desc: 'Log all system actions' },
            { key: 'notifications', label: 'Email Notifications', desc: 'Send alerts via email' },
          ].map(s => (
            <div key={s.key} className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/80">
              <div>
                <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                <p className="text-[10px] text-slate-400">{s.desc}</p>
              </div>
              <button onClick={() => setToggles(p => ({ ...p, [s.key]: !p[s.key] }))}
                className={`relative w-10 h-5 rounded-full transition-all ${toggles[s.key] ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${toggles[s.key] ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit User Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editUser ? `Edit User: ${editUser.name || editUser.username}` : 'Create New User'}>
        <div className="space-y-4">
          {/* Role selector (only for create) */}
          {!editUser && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.filter(r => r !== 'ADMIN').map(r => (
                  <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                    className={`text-xs px-3 py-2.5 rounded-xl font-medium transition-all border ${form.role === r ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20' : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'}`}>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {[
            { key: 'name', label: 'Full Name', placeholder: 'John Smith' },
            { key: 'username', label: 'Username', placeholder: 'john.smith' },
            { key: 'email', label: 'Email', placeholder: 'john@buildledger.com' },
            { key: 'phone', label: 'Phone', placeholder: '+1 555-0000' },
            { key: 'password', label: editUser ? 'New Password (leave blank to keep)' : 'Password', placeholder: 'Min. 6 chars', type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-600 block mb-1">{f.label}</label>
              <input type={f.type || 'text'} placeholder={f.placeholder} value={form[f.key]} onChange={set(f.key)}
                className="w-full text-sm bg-white/60 border rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:bg-white transition-all"
                style={{ borderColor: formErr[f.key] ? '#EF4444' : undefined }} />
              {formErr[f.key] && <p className="text-xs text-red-500 mt-0.5">{formErr[f.key]}</p>}
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary text-xs" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : editUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

