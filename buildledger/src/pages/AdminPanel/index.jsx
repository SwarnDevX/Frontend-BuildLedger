import { useState, useEffect } from "react";
import {
  Edit2,
  Trash2,
  Shield,
  Settings,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import {
  Button,
  FormInput,
  PageHeader,
  SectionCard,
  FilterPills,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../components/ui";
import { getAllUsers, deleteUser } from "../../api/users";
import { getProjectsByManager } from "../../api/projects";
import toast from "react-hot-toast";
import { useUserForm } from "../../hooks/useUserForm";

const ROLES = [
  "ADMIN",
  "PROJECT_MANAGER",
  "FINANCE_OFFICER",
  "COMPLIANCE_OFFICER",
];
const ROLE_LABELS = {
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  FINANCE_OFFICER: "Finance Officer",
  COMPLIANCE_OFFICER: "Compliance Officer",
};

const permissions = [
  "View Contracts",
  "Edit Contracts",
  "View Vendors",
  "Edit Vendors",
  "View Invoices",
  "Approve Invoices",
  "View Reports",
  "Export Data",
  "Manage Users",
  "System Settings",
];
const defaultPerms = {
  ADMIN: [true, true, true, true, true, true, true, true, true, true],
  PROJECT_MANAGER: [
    true,
    true,
    true,
    false,
    true,
    false,
    true,
    true,
    false,
    false,
  ],
  FINANCE_OFFICER: [
    true,
    false,
    true,
    false,
    true,
    true,
    true,
    true,
    false,
    false,
  ],
  COMPLIANCE_OFFICER: [
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    true,
    false,
    false,
  ],
};

const ROLE_FILTER_OPTIONS = ROLES.map((r) => ({
  key: r,
  label: ROLE_LABELS[r],
}));

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("PROJECT_MANAGER");
  const [perms, setPerms] = useState(defaultPerms);
  const [toggles, setToggles] = useState({
    autoApproval: false,
    twoFactor: true,
    auditLogging: true,
    notifications: true,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [remarks, setRemarks] = useState("");

  // ── All form + validation logic lives in this hook ──
  const {
    form,
    setForm,
    formErr,
    setFormErr,
    saving,
    set,
    handleBlur,
    handleSave,
    resetForm,
    populateForm,
  } = useUserForm(editUser, fetchUsers, setShowCreate);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await getAllUsers();
      setUsers(res.data?.data || res.data || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    resetForm();
    setEditUser(null);
    setShowCreate(true);
  };

  const openEdit = (u) => {
    populateForm(u);
    setEditUser(u);
    setShowCreate(true);
  };

  const handleDelete = async (u) => {
    // Check role-based restrictions
    if (u.role === "COMPLIANCE_OFFICER" || u.role === "FINANCE_OFFICER") {
      toast.error(
        `Cannot delete ${u.role.replace("_", " ")}. Only one officer allowed in the system.`,
      );
      return;
    }

    // For PROJECT_MANAGER, check if assigned to any projects
    if (u.role === "PROJECT_MANAGER") {
      try {
        const res = await getProjectsByManager(u.userId);
        const assignedProjects = res.data?.data || res.data || [];
        if (assignedProjects.length > 0) {
          toast.error(
            `Cannot delete. This Project Manager is assigned to ${assignedProjects.length} project(s).`,
          );
          return;
        }
      } catch (err) {
        console.warn("Could not check project assignments", err);
      }
      // Open remarks modal for PM deletion
      setDeleteTarget(u);
      setRemarks("");
      setShowDeleteModal(true);
      return;
    }

    // For other roles, proceed with normal delete
    if (!confirm(`Delete user "${u.name || u.username}"?`)) return;
    try {
      await deleteUser(u.userId);
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Delete failed");
    }
  };

  const confirmDeleteWithRemarks = async () => {
    if (!deleteTarget) return;
    if (!remarks.trim()) {
      toast.error("Please provide remarks before deleting");
      return;
    }
    try {
      await deleteUser(deleteTarget.userId);
      toast.success(`User deleted. Remarks recorded: ${remarks}`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setRemarks("");
      fetchUsers();
    } catch {
      toast.error("Delete failed");
    }
  };

  const togglePerm = (role, idx) => {
    if (role === "ADMIN") return;
    setPerms((prev) => ({
      ...prev,
      [role]: prev[role].map((v, i) => (i === idx ? !v : v)),
    }));
  };

  const roleBadge = (role) =>
    ({
      ADMIN: "Admin",
      PROJECT_MANAGER: "Project Manager",
      FINANCE_OFFICER: "Finance",
      COMPLIANCE_OFFICER: "Compliance",
      VENDOR: "Compliance",
    })[role] || role;

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="Admin Panel"
        subtitle="User management & system configuration"
        actions={
          <>
            <Button
              variant="secondary"
              size="xs"
              icon={<RefreshCw size={13} />}
              onClick={fetchUsers}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="xs"
              icon={<UserPlus size={14} />}
              onClick={openCreate}
            >
              Add User
            </Button>
          </>
        }
      />

      {/* Quick role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map((r) => {
          const count = users.filter((u) => u.role === r).length;
          return (
            <div key={r} className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {count}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {ROLE_LABELS[r]}
              </p>
            </div>
          );
        })}
      </div>

      {/* User table */}
      <SectionCard
        title={`All Users (${users.length})`}
        actions={
          loading ? (
            <Loader2 size={15} className="text-blue-600 animate-spin" />
          ) : null
        }
      >
        <div className="overflow-x-auto">
          <Table elevated={false}>
            <TableHead>
              {["User", "Email", "Role", "Status", "Joined", ""].map((h) => (
                <TableHeader key={h}>{h}</TableHeader>
              ))}
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(u.name || u.username || "U")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {u.name || "—"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          @{u.username}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge status={roleBadge(u.role)} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-semibold w-fit ${u.status === "ACTIVE" ? "text-green-600" : "text-slate-400"}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${u.status === "ACTIVE" ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}
                      />
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {u.createdAt?.slice(0, 10) || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit2 size={13} />
                      </button>
                      {u.role !== "ADMIN" &&
                        u.role !== "COMPLIANCE_OFFICER" &&
                        u.role !== "FINANCE_OFFICER" && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete user"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-slate-400"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* RBAC Panel */}
      {/* <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Role Permissions Matrix
          </h3>
        </div>
        <div className="mb-4">
          <FilterPills
            options={ROLE_FILTER_OPTIONS}
            value={selectedRole}
            onChange={setSelectedRole}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {permissions.map((perm, idx) => {
            const enabled = (perms[selectedRole] || [])[idx];
            return (
              <div
                key={perm}
                onClick={() => togglePerm(selectedRole, idx)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none
                  ${
                    enabled
                      ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700/40 dark:text-blue-400"
                      : "bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800/40 dark:border-slate-700/40"
                  }
                  ${selectedRole === "ADMIN" ? "cursor-default" : "hover:shadow-sm"}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="leading-tight">{perm}</span>
                  {enabled ? (
                    <ToggleRight
                      size={13}
                      className="text-blue-600 shrink-0 ml-1"
                    />
                  ) : (
                    <ToggleLeft
                      size={13}
                      className="text-slate-300 shrink-0 ml-1"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {selectedRole === "ADMIN" && (
          <p className="text-[10px] text-slate-400 mt-2">
            Admin has full access and cannot be modified.
          </p>
        )}
      </div> */}

      {/* System Settings */}
      {/* <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            System Configuration
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              key: "autoApproval",
              label: "Auto-Approve Invoices under $10K",
              desc: "Automatically approve small invoices",
            },
            {
              key: "twoFactor",
              label: "Two-Factor Authentication",
              desc: "Require 2FA for all users",
            },
            {
              key: "auditLogging",
              label: "Audit Logging",
              desc: "Log all system actions",
            },
            {
              key: "notifications",
              label: "Email Notifications",
              desc: "Send alerts via email",
            },
          ].map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-800/30 border border-white/80 dark:border-slate-700/40"
            >
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {s.label}
                </p>
                <p className="text-[10px] text-slate-400">{s.desc}</p>
              </div>
              <button
                onClick={() =>
                  setToggles((p) => ({ ...p, [s.key]: !p[s.key] }))
                }
                className={`relative w-10 h-5 rounded-full transition-all ${toggles[s.key] ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${toggles[s.key] ? "left-5" : "left-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div> */}

      {/* Delete with Remarks Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
          setRemarks("");
        }}
        title={`Delete Project Manager: ${deleteTarget?.name || deleteTarget?.username}`}
      >
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              ⚠️ Deletion requires remarks
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
              Please provide a reason for deleting this Project Manager.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter reason for deletion (e.g., transferred, resigned, etc.)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteTarget(null);
                setRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={confirmDeleteWithRemarks}
              className="bg-red-600! hover:bg-red-700!"
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit User Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setFormErr({});
        }}
        title={
          editUser
            ? `Edit User: ${editUser.name || editUser.username}`
            : "Create New User"
        }
      >
        <div className="space-y-4">
          {!editUser && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">
                Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.filter((r) => r !== "ADMIN").map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: r }))}
                    className={`text-xs px-3 py-2.5 rounded-xl font-medium transition-all border ${
                      form.role === r
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                        : "bg-white/60 text-slate-600 border-slate-200 hover:bg-white dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/40 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <FormInput
            label="Full Name"
            required
            placeholder="John"
            value={form.name}
            onChange={set("name")}
            onBlur={handleBlur("name")}
            error={formErr.name}
          />
          <FormInput
            label="Username"
            required
            placeholder="john.smith"
            value={form.username}
            onChange={set("username")}
            onBlur={handleBlur("username")}
            error={formErr.username}
            disabled={editUser || !form.name.trim() || !!formErr.name}
          />
          <FormInput
            label="Email"
            required
            placeholder="john@buildledger.com"
            value={form.email}
            onChange={set("email")}
            onBlur={handleBlur("email")}
            error={formErr.email}
            disabled={!form.username.trim() || !!formErr.username}
          />
          <FormInput
            label="Phone"
            placeholder="9999999999"
            value={form.phone}
            onChange={set("phone")}
            onBlur={handleBlur("phone")}
            error={formErr.phone}
            disabled={!form.email.trim() || !!formErr.email}
          />
          {editUser && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">
                Status
              </label>
              <select
                value={form.status}
                onChange={set("status")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          )}
          {!editUser && (
            <FormInput
              label="Password"
              required
              type="password"
              placeholder="Min. 8 chars, A-Z, a-z, 0-9, @$!%*?&"
              value={form.password}
              onChange={set("password")}
              onBlur={handleBlur("password")}
              error={formErr.password}
              disabled={!form.email.trim() || !!formErr.email}
            />
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                setShowCreate(false);
                setFormErr({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={handleSave}
              loading={saving}
            >
              {editUser ? "Update User" : "Create User"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
