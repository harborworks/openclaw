import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../../auth";
import { AdminTable, type Column } from "../../components/AdminTable";
import { Modal } from "../../components/Modal";

type Member = {
  _id: string;
  userId: string;
  orgId: string;
  role: "owner" | "admin" | "member";
  userName: string;
  userEmail: string;
  orgName: string;
};

const PAGE_SIZE = 25;
const ROLES = ["owner", "admin", "member"] as const;
const ROLE_BADGE: Record<string, string> = {
  owner: "badge-amber",
  admin: "badge-green",
  member: "badge-blue",
};

export function AdminMembersPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const cognitoSub = authUser?.userId;
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.members.list,
    cognitoSub != null ? { cognitoSub } : "skip",
    { initialNumItems: PAGE_SIZE }
  );

  // For the create modal, we need lists of users and orgs
  const allUsers = usePaginatedQuery(
    api.admin.users.list,
    cognitoSub != null ? { cognitoSub } : "skip",
    { initialNumItems: 100 }
  );
  const allOrgs = usePaginatedQuery(
    api.admin.orgs.list,
    cognitoSub != null ? { cognitoSub } : "skip",
    { initialNumItems: 100 }
  );

  const createMember = useMutation(api.admin.members.create);
  const updateMember = useMutation(api.admin.members.update);
  const removeMember = useMutation(api.admin.members.remove);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ userId: "", orgId: "", role: "member" as Member["role"] });

  const openCreate = () => {
    setForm({ userId: "", orgId: "", role: "member" });
    setModal("create");
  };

  const openEdit = (row: Member) => {
    setEditing(row);
    setForm({ userId: row.userId, orgId: row.orgId, role: row.role });
    setModal("edit");
  };

  const handleSubmit = async () => {
    if (modal === "create") {
      await createMember({
        cognitoSub,
        userId: form.userId as any,
        orgId: form.orgId as any,
        role: form.role,
      });
    } else if (modal === "edit" && editing) {
      await updateMember({ cognitoSub, id: editing._id as any, role: form.role });
    }
    setModal(null);
    setEditing(null);
  };

  const handleDelete = useCallback(
    async (row: Member) => {
      if (!confirm(`Remove ${row.userName} from ${row.orgName}?`)) return;
      await removeMember({ cognitoSub, id: row._id as any });
    },
    [cognitoSub, removeMember]
  );

  const columns: Column<Member>[] = [
    { key: "user", header: "User", render: (r) => r.userName },
    { key: "email", header: "Email", render: (r) => r.userEmail },
    { key: "org", header: "Organization", render: (r) => r.orgName },
    {
      key: "role",
      header: "Role",
      render: (r) => <span className={`badge ${ROLE_BADGE[r.role]}`}>{r.role}</span>,
    },
  ];

  const users = (allUsers.results ?? []) as { _id: string; name: string; email: string }[];
  const orgs = (allOrgs.results ?? []) as { _id: string; name: string }[];

  return (
    <div>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-btn admin-btn-sm" onClick={() => navigate("/admin")}>← Back</button>
          <h1>Members</h1>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>
          Add member
        </button>
      </div>

      <AdminTable
        columns={columns}
        rows={(results ?? []) as Member[]}
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
        title={modal === "create" ? "Add Member" : "Edit Member"}
      >
        {modal === "create" && (
          <>
            <div className="form-group">
              <label className="form-label">User</label>
              <select
                className="form-select"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Organization</label>
              <select
                className="form-select"
                value={form.orgId}
                onChange={(e) => setForm({ ...form, orgId: e.target.value })}
              >
                <option value="">Select org…</option>
                {orgs.map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="form-group">
          <label className="form-label">Role</label>
          <select
            className="form-select"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Member["role"] })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button className="admin-btn" onClick={() => { setModal(null); setEditing(null); }}>
            Cancel
          </button>
          <button className="admin-btn admin-btn-primary" onClick={handleSubmit}>
            {modal === "create" ? "Add" : "Save"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
