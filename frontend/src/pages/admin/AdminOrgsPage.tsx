import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../../auth";
import { AdminTable, type Column } from "../../components/AdminTable";
import { Modal } from "../../components/Modal";

type Org = {
  _id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
};

const PAGE_SIZE = 25;
const PLANS = ["free", "pro", "enterprise"] as const;
const PLAN_BADGE: Record<string, string> = {
  free: "badge-blue",
  pro: "badge-green",
  enterprise: "badge-amber",
};

export function AdminOrgsPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const cognitoSub = authUser?.userId;
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.orgs.list,
    cognitoSub != null ? { cognitoSub } : "skip",
    { initialNumItems: PAGE_SIZE }
  );

  const createOrg = useMutation(api.admin.orgs.create);
  const updateOrg = useMutation(api.admin.orgs.update);
  const removeOrg = useMutation(api.admin.orgs.remove);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Org | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", plan: "free" as Org["plan"] });

  const openCreate = () => {
    setForm({ name: "", slug: "", plan: "free" });
    setModal("create");
  };

  const openEdit = (row: Org) => {
    setEditing(row);
    setForm({ name: row.name, slug: row.slug, plan: row.plan });
    setModal("edit");
  };

  const handleSubmit = async () => {
    if (modal === "create") {
      await createOrg({ cognitoSub, name: form.name, slug: form.slug, plan: form.plan });
    } else if (modal === "edit" && editing) {
      await updateOrg({ cognitoSub, id: editing._id as any, name: form.name, slug: form.slug, plan: form.plan });
    }
    setModal(null);
    setEditing(null);
  };

  const handleDelete = useCallback(
    async (row: Org) => {
      if (!confirm(`Delete org "${row.name}"?`)) return;
      await removeOrg({ cognitoSub, id: row._id as any });
    },
    [cognitoSub, removeOrg]
  );

  const columns: Column<Org>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "slug", header: "Slug", render: (r) => r.slug },
    {
      key: "plan",
      header: "Plan",
      render: (r) => <span className={`badge ${PLAN_BADGE[r.plan]}`}>{r.plan}</span>,
    },
  ];

  return (
    <div>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-btn admin-btn-sm" onClick={() => navigate("/admin")}>← Back</button>
          <h1>Organizations</h1>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>
          Create org
        </button>
      </div>

      <AdminTable
        columns={columns}
        rows={(results ?? []) as Org[]}
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
        title={modal === "create" ? "Create Organization" : "Edit Organization"}
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
          <label className="form-label">Slug</label>
          <input
            className="form-input"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Plan</label>
          <select
            className="form-select"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value as Org["plan"] })}
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
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
