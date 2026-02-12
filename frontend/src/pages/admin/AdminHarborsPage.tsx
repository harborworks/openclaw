import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { useAuth } from "../../auth";
import { AdminTable, type Column } from "../../components/AdminTable";
import { Modal } from "../../components/Modal";
import { toSlug } from "../../lib/slug";

type Harbor = {
  _id: Id<"harbors">;
  name: string;
  slug: string;
  orgId: Id<"orgs">;
  orgName: string;
};

const PAGE_SIZE = 25;

export function AdminHarborsPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const cognitoSub = authUser?.userId;
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.harbors.list,
    cognitoSub != null ? { cognitoSub } : "skip",
    { initialNumItems: PAGE_SIZE }
  );

  const allOrgs = usePaginatedQuery(
    api.admin.orgs.list,
    cognitoSub != null ? { cognitoSub } : "skip",
    { initialNumItems: 100 }
  );

  const createHarbor = useMutation(api.admin.harbors.create);
  const updateHarbor = useMutation(api.admin.harbors.update);
  const removeHarbor = useMutation(api.admin.harbors.remove);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Harbor | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", orgId: "" });
  const [slugTouched, setSlugTouched] = useState(false);


  const openCreate = () => {
    setForm({ name: "", slug: "", orgId: "" });
    setSlugTouched(false);
    setModal("create");
  };

  const openEdit = (row: Harbor) => {
    setEditing(row);
    setForm({ name: row.name, slug: row.slug, orgId: row.orgId });
    setSlugTouched(true);
    setModal("edit");
  };

  const handleSubmit = async () => {
    if (!cognitoSub) return;
    if (modal === "create") {
      await createHarbor({ cognitoSub, name: form.name, slug: form.slug, orgId: form.orgId as Id<"orgs"> });
    } else if (modal === "edit" && editing) {
      await updateHarbor({ cognitoSub, id: editing._id, name: form.name, slug: form.slug, orgId: form.orgId as Id<"orgs"> });
    }
    setModal(null);
    setEditing(null);
  };

  const handleDelete = useCallback(
    async (row: Harbor) => {
      if (!cognitoSub || !confirm(`Delete harbor "${row.name}"?`)) return;
      await removeHarbor({ cognitoSub, id: row._id });
    },
    [cognitoSub, removeHarbor]
  );

  const columns: Column<Harbor>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "slug", header: "Slug", render: (r) => r.slug },
    { key: "org", header: "Organization", render: (r) => r.orgName },
  ];

  const orgs = (allOrgs.results ?? []) as { _id: string; name: string }[];

  return (
    <div>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-back" onClick={() => navigate("/admin")}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          <h1>Harbors</h1>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}>
          Create harbor
        </button>
      </div>

      <AdminTable
        columns={columns}
        rows={(results ?? []) as Harbor[]}
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
        title={modal === "create" ? "Create Harbor" : "Edit Harbor"}
      >
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm({ ...form, name, ...(!slugTouched ? { slug: toSlug(name) } : {}) });
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Slug</label>
          <input
            className="form-input"
            value={form.slug}
            onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }}
          />
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
