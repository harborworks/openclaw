import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { useAuth } from "../../auth";
import { AdminTable, type Column } from "../../components/AdminTable";
import { Modal } from "../../components/Modal";
import { toSlug } from "../../lib/slug";

type Org = {
  _id: Id<"orgs">;
  name: string;
  slug: string;
};

const PAGE_SIZE = 25;

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
  const [form, setForm] = useState({ name: "", slug: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ name: "", slug: "" });
    setSlugTouched(false);
    setError(null);
    setModal("create");
  };

  const openEdit = (row: Org) => {
    setEditing(row);
    setForm({ name: row.name, slug: row.slug });
    setError(null);
    setModal("edit");
  };

  const handleSubmit = async () => {
    if (!cognitoSub) return;
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }
    try {
      if (modal === "create") {
        await createOrg({ cognitoSub, name: form.name, slug: form.slug, plan: "free" });
      } else if (modal === "edit" && editing) {
        await updateOrg({ cognitoSub, id: editing._id, name: form.name, slug: form.slug });
      }
      setModal(null);
      setEditing(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.toLowerCase().includes("slug already taken")) {
        setError(`The slug "${form.slug}" is already in use. Please choose a different one.`);
      } else {
        setError(msg);
      }
    }
  };

  const handleDelete = useCallback(
    async (row: Org) => {
      if (!cognitoSub || !confirm(`Delete org "${row.name}"?`)) return;
      await removeOrg({ cognitoSub, id: row._id });
    },
    [cognitoSub, removeOrg]
  );

  const columns: Column<Org>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "slug", header: "Slug", render: (r) => r.slug },
  ];

  return (
    <div>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-back" onClick={() => navigate("/admin")}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
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
        onClose={() => { setModal(null); setEditing(null); setError(null); }}
        title={modal === "create" ? "Create Organization" : "Edit Organization"}
      >
        {error && <div className="form-alert form-alert-error">{error}</div>}
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
