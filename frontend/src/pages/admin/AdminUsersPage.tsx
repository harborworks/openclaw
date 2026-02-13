import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePaginatedQuery, useMutation, useAction } from "convex/react";

import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { useAuth } from "../../auth";
import { AdminTable, type Column } from "../../components/AdminTable";
import { Modal } from "../../components/Modal";

type User = {
  _id: Id<"users">;
  email: string;
  cognitoSub: string;
  isSuperAdmin?: boolean;
  isStaff?: boolean;
};

const PAGE_SIZE = 25;

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const cognitoSub = authUser?.userId;
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.users.list,
    cognitoSub != null ? { cognitoSub } : "skip",
    { initialNumItems: PAGE_SIZE }
  );

  const inviteUser = useAction(api.admin.cognitoActions.invite);
  const updateUser = useMutation(api.admin.users.update);
  const deleteUserAction = useAction(api.admin.cognitoActions.deleteUser);

  const [modal, setModal] = useState<"invite" | "edit" | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", isSuperAdmin: false, isStaff: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const openInvite = () => {
    setForm({ email: "", isSuperAdmin: false, isStaff: false });
    setError("");
    setModal("invite");
  };

  const openEdit = (row: User) => {
    setEditing(row);
    setForm({ email: row.email, isSuperAdmin: !!row.isSuperAdmin, isStaff: !!row.isStaff });
    setError("");
    setModal("edit");
  };

  const isSelf = useCallback((row: User) => row.cognitoSub === cognitoSub, [cognitoSub]);

  const handleSubmit = async () => {
    if (!cognitoSub) return;
    setSubmitting(true);
    setError("");
    try {
      if (modal === "invite") {
        await inviteUser({
          cognitoSub,
          email: form.email,
          isSuperAdmin: form.isSuperAdmin,
        });
      } else if (modal === "edit" && editing) {
        await updateUser({
          cognitoSub,
          id: editing._id,
          email: form.email,
          isSuperAdmin: form.isSuperAdmin,
          isStaff: form.isStaff,
        });
      }
      setModal(null);
      setEditing(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = useCallback(
    async (row: User) => {
      if (!cognitoSub) return;
      if (isSelf(row)) {
        alert("You cannot delete yourself.");
        return;
      }
      if (!confirm(`Delete user "${row.email}"? This will also remove their Cognito account.`)) return;
      try {
        await deleteUserAction({ cognitoSub, userId: row._id });
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to delete user");
      }
    },
    [cognitoSub, deleteUserAction, isSelf]
  );

  const columns: Column<User>[] = [
    { key: "email", header: "Email", render: (r) => r.email },
    {
      key: "role",
      header: "Role",
      render: (r) =>
        r.isSuperAdmin ? (
          <span className="badge badge-amber">Super Admin</span>
        ) : r.isStaff ? (
          <span className="badge badge-sky">Staff</span>
        ) : (
          <span className="badge badge-blue">User</span>
        ),
    },
  ];

  return (
    <div>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-back" onClick={() => navigate("/admin")}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          <h1>Users</h1>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openInvite}>
          Invite user
        </button>
      </div>

      <AdminTable
        columns={columns}
        rows={(results ?? []) as User[]}
        getRowId={(r) => r._id}
        onEdit={openEdit}
        onDelete={handleDelete}
        hasMore={status === "CanLoadMore"}
        isLoadingMore={status === "LoadingMore"}
        onLoadMore={() => loadMore(PAGE_SIZE)}
      />

      <Modal
        open={modal !== null}
        onClose={() => { setModal(null); setEditing(null); }}
        title={modal === "invite" ? "Invite User" : "Edit User"}
      >
        {error && (
          <div style={{ color: "#f87171", fontSize: "var(--font-size-sm)", marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={modal === "edit"}
          />
        </div>
        <div className="form-group">
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.isStaff}
              onChange={(e) => setForm({ ...form, isStaff: e.target.checked })}
              disabled={modal === "edit" && editing != null && isSelf(editing)}
            />
            Staff
          </label>
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.isSuperAdmin}
              onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
              disabled={modal === "edit" && editing != null && isSelf(editing)}
            />
            Super Admin
          </label>
          {modal === "edit" && editing != null && isSelf(editing) && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 4 }}>
              You cannot change your own admin status
            </p>
          )}
        </div>
        <div className="form-actions">
          <button className="admin-btn" onClick={() => { setModal(null); setEditing(null); }} disabled={submitting}>
            Cancel
          </button>
          <button className="admin-btn admin-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Working…" : modal === "invite" ? "Send invite" : "Save"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
