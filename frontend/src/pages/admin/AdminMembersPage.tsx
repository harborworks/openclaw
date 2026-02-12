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
const DEFAULT_ROLE = "admin" as const;

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
  const removeMember = useMutation(api.admin.members.remove);

  const [modal, setModal] = useState<"create" | null>(null);
  const [form, setForm] = useState({ userId: "", orgId: "" });

  const openCreate = () => {
    setForm({ userId: "", orgId: "" });
    setModal("create");
  };

  const handleSubmit = async () => {
    if (modal === "create") {
      await createMember({
        cognitoSub,
        userId: form.userId as any,
        orgId: form.orgId as any,
        role: DEFAULT_ROLE,
      });
    }
    setModal(null);
  };

  const handleDelete = useCallback(
    async (row: Member) => {
      if (!confirm(`Remove ${row.userEmail} from ${row.orgName}?`)) return;
      await removeMember({ cognitoSub, id: row._id as any });
    },
    [cognitoSub, removeMember]
  );

  const columns: Column<Member>[] = [
    { key: "email", header: "Email", render: (r) => r.userEmail },
    { key: "org", header: "Organization", render: (r) => r.orgName },
  ];

  const users = (allUsers.results ?? []) as { _id: string; name: string; email: string }[];
  const orgs = (allOrgs.results ?? []) as { _id: string; name: string }[];

  return (
    <div>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-back" onClick={() => navigate("/admin")}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
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
        onDelete={handleDelete}
        hasMore={status === "CanLoadMore"}
        isLoadingMore={status === "LoadingMore"}
        onLoadMore={() => loadMore(PAGE_SIZE)}
      />

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title="Add Member"
      >
        <div className="form-group">
          <label className="form-label">User</label>
          <select
            className="form-select"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
          >
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.email}</option>
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
        <div className="form-actions">
          <button className="admin-btn" onClick={() => setModal(null)}>
            Cancel
          </button>
          <button className="admin-btn admin-btn-primary" onClick={handleSubmit}>
            Add
          </button>
        </div>
      </Modal>
    </div>
  );
}
