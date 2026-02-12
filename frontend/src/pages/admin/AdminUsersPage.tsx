import { useState, useCallback } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../../auth";
import { AdminTable, Column } from "../../components/AdminTable";
import { Modal } from "../../components/Modal";

type User = {
  _id: string;
  name: string;
  email: string;
  cognitoSub: string;
  isSuperAdmin?: boolean;
};

const PAGE_SIZE = 25;

export function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const cognitoSub = authUser?.userId ?? "";
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.users.list,
    cognitoSub ? { cognitoSub } : "skip",
    { initialNumItems: PAGE_SIZE }
  );

  const createUser = useMutation(api.admin.users.create);
  const updateUser = useMutation(api.admin.users.update);
  const removeUser = useMutation(api.admin.users.remove);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", cognitoSub: "", isSuperAdmin: false });

  const openCreate = () => {
    setForm({ name: "", email: "", cognitoSub: "", isSuperAdmin: false });
    setModal("create");
  };

  const openEdit = (row: User) => {
    setEditing(row);
    setForm({ name: row.name, email: row.email, cognitoSub: row.cognitoSub, isSuperAdmin: !!row.isSuperAdmin });
    setModal("edit");
  };

  const handleSubmit = async () => {
    if (modal === "create") {
      await createUser({
        cognitoSub,
        name: form.name,
        email: form.email,
        userCognitoSub: form.cognitoSub,
        isSuperAdmin: form.isSuperAdmin,
      });
    } else if (modal === "edit" && editing) {
      await updateUser({
        cognitoSub,
        id: editing._id as any,
        name: form.name,
        email: form.email,
        isSuperAdmin: form.isSuperAdmin,
      });
    }
    setModal(null);
    setEditing(null);
  };

  const handleDelete = useCallback(
    async (row: User) => {
      if (!confirm(`Delete user "${row.name}"?`)) return;
      await removeUser({ cognitoSub, id: row._id as any });
    },
    [cognitoSub, removeUser]
  );

  const columns: Column<User>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "email", header: "Email", render: (r) => r.email },
    {
      key: "role",
      header: "Role",
      render: (r) =>
        r.isSuperAdmin ? (
          <span className="badge badge-amber">Super Admin</span>
        ) : (
          <span className="badge badge-blue">User</span>
        ),
    },
  ];

  return (
    <div>
      <div className="admin-header">
        <h1>Users</h1>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>
          Create user
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
        title={modal === "create" ? "Create User" : "Edit User"}
      >
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        {modal === "create" && (
          <div className="form-group">
            <label className="form-label">Cognito Sub</label>
            <input
              className="form-input"
              value={form.cognitoSub}
              onChange={(e) => setForm({ ...form, cognitoSub: e.target.value })}
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.isSuperAdmin}
              onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
            />
            Super Admin
          </label>
        </div>
        <div className="form-actions">
          <button className="admin-btn" onClick={() => { setModal(null); setEditing(null); }}>
            Cancel
          </button>
          <button className="admin-btn admin-btn-primary" onClick={handleSubmit}>
            {modal === "create" ? "Create" : "Save"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
