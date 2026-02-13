import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { useHarborContext } from "../contexts/HarborContext";
import { randomAgentName } from "../lib/agentNames";
import { toSlug } from "../lib/slug";
import { ALL_MODELS, modelToDisplay, modelRequiredKey } from "../lib/models";
import type { SecretInfo } from "../lib/secrets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentsApi = (api as any).agents;

/** Role categories and options */
const ROLE_OPTIONS = [
  { group: "Leadership", roles: ["Project Manager", "Executive Assistant"] },
  { group: "Operations", roles: ["Software Developer", "DevOps", "Sales", "Marketing"] },
  { group: "Testing", roles: ["Software Quality Assurance", "Copy Editor"] },
  { group: "Research", roles: ["Software Architect", "Business Analyst", "Data Analyst"] },
  { group: "Maintenance", roles: ["System Administrator"] },
] as const;

/** Map display name → stored value (kebab-case) */
function roleToValue(display: string): string {
  return display.toLowerCase().replace(/\s+/g, "-");
}

/** Map stored value → display name */
function roleToDisplay(value: string): string {
  for (const group of ROLE_OPTIONS) {
    for (const role of group.roles) {
      if (roleToValue(role) === value) return role;
    }
  }
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const secretsApi = (api as any).secrets;

interface AgentDoc {
  _id: Id<"agents">;
  _creationTime: number;
  name: string;
  sessionKey: string;
  role: string;
  model?: string;
  status: "idle" | "active" | "blocked";
}

function AgentForm({
  initial,
  isEdit,
  existingNames = [],
  availableModels,
  saving,
  onSave,
  onCancel,
}: {
  initial?: { name: string; sessionKey: string; role: string; model?: string };
  isEdit?: boolean;
  existingNames?: string[];
  availableModels: typeof ALL_MODELS;
  saving: boolean;
  onSave: (data: { name: string; sessionKey: string; role: string; model?: string }) => void;
  onCancel: () => void;
}) {
  const defaultName = isEdit ? "" : randomAgentName(existingNames);
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [sessionKey, setSessionKey] = useState(initial?.sessionKey ?? (isEdit ? "" : toSlug(defaultName)));
  const [idTouched, setIdTouched] = useState(!!isEdit);
  const [role, setRole] = useState(initial?.role ?? "");
  const [model, setModel] = useState(initial?.model ?? availableModels[0]?.value ?? "");

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!idTouched) setSessionKey(toSlug(newName));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sessionKey.trim() || !role) return;
    onSave({ name: name.trim(), sessionKey: sessionKey.trim(), role, model: model || undefined });
  };

  return (
    <form className="agent-form" onSubmit={handleSubmit}>
      <div className="agent-form-fields">
        <label className="agent-field">
          <span className="agent-field-label">Name</span>
          <div className="agent-name-row">
            <input
              className="agent-input"
              placeholder="Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
            <button
              type="button"
              className="agent-btn-dice"
              title="Random name"
              onClick={() => handleNameChange(randomAgentName(existingNames))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" />
                <path d="M2.5 11.5a10 10 0 0 1 18.4-4.5" /><path d="M21.5 12.5a10 10 0 0 1-18.4 4.5" />
              </svg>
            </button>
          </div>
        </label>
        <label className="agent-field">
          <span className="agent-field-label">Agent ID</span>
          <input
            className={`agent-input${isEdit ? " agent-input-readonly" : ""}`}
            placeholder="Agent ID"
            value={sessionKey}
            onChange={(e) => { if (!isEdit) { setSessionKey(e.target.value); setIdTouched(true); } }}
            readOnly={isEdit}
            required
          />
        </label>
        <label className="agent-field">
          <span className="agent-field-label">Role</span>
          {isEdit ? (
            <input
              className="agent-input agent-input-readonly"
              value={roleToDisplay(role)}
              readOnly
            />
          ) : (
            <select
              className="agent-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="">Select Role</option>
              {ROLE_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.roles.map((r) => (
                    <option key={r} value={roleToValue(r)}>{r}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </label>
        <label className="agent-field">
          <span className="agent-field-label">Model</span>
          {availableModels.length === 0 ? (
            <input
              className="agent-input agent-input-readonly"
              value="No model providers configured"
              readOnly
            />
          ) : (
            <select
              className="agent-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {availableModels.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}
        </label>
      </div>
      <div className="agent-form-actions">
        <button type="submit" className="admin-btn admin-btn-accent" disabled={saving}>
          {initial ? "Save" : "Create"}
        </button>
        <button type="button" className="admin-btn admin-btn-accent-muted" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AgentRow({
  agent,
  saving,
  canDelete,
  modelMisconfigured,
  onEdit,
  onDelete,
}: {
  agent: AgentDoc;
  saving: boolean;
  canDelete: boolean;
  modelMisconfigured: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`agent-row${modelMisconfigured ? " agent-row-warn" : ""}`}>
      <div className="agent-row-info">
        <span className="agent-row-name">{agent.name}</span>
        <span className="agent-row-meta"><code>{agent.sessionKey}</code></span>
        <span className="agent-row-detail">{roleToDisplay(agent.role)}</span>
        <span className="agent-row-detail">
          {agent.model ? modelToDisplay(agent.model) : "—"}

        </span>
      </div>
      <div className="agent-row-right">
        <button className="admin-btn admin-btn-sm" onClick={onEdit} disabled={saving}>Edit</button>
        <button
          className="admin-btn admin-btn-sm agent-btn-danger"
          onClick={onDelete}
          disabled={saving}
          style={canDelete ? undefined : { visibility: "hidden" }}
        >Delete</button>
      </div>
      {modelMisconfigured && (
        <div className="agent-row-warning-banner">
          ⚠️ API key not configured for this model. Add it on the Models page.
        </div>
      )}
    </div>
  );
}

export function AgentsPage() {
  const { harborId } = useHarborContext();
  const agents = useQuery(agentsApi.list, harborId ? { harborId } : "skip") as AgentDoc[] | undefined;
  const secrets = useQuery(secretsApi.list, harborId ? { harborId } : "skip") as SecretInfo[] | undefined;
  const createAgent = useMutation(agentsApi.create);
  const updateAgent = useMutation(agentsApi.update);
  const removeAgent = useMutation(agentsApi.remove);

  const configuredKeys = new Set(
    (secrets ?? []).filter((s) => s.isSet).map((s) => s.name),
  );
  const availableModels = ALL_MODELS.filter((m) => configuredKeys.has(m.requiredKey));

  const isModelMisconfigured = (model?: string) => {
    if (!model) return false;
    const key = modelRequiredKey(model);
    return key ? !configuredKeys.has(key) : false;
  };

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"agents"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"agents"> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (data: { name: string; sessionKey: string; role: string; model?: string }) => {
    setSaving(true);
    try {
      await createAgent({ harborId, ...data });
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: Id<"agents">, data: { name: string; sessionKey: string; role: string; model?: string }) => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sessionKey: _, ...updateData } = data;
      await updateAgent({ id, ...updateData });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"agents">) => {
    setSaving(true);
    try {
      await removeAgent({ id });
      setDeletingId(null);
    } finally {
      setSaving(false);
    }
  };

  const sortedAgents = [...(agents ?? [])].sort((a, b) => a._creationTime - b._creationTime);
  const existingNames = sortedAgents.map((a) => a.name);

  return (
    <div className="agents-page">
      <PageHeader title="Agents" />

      <div className="agents-list">
        {sortedAgents.length === 0 && (
          <p className="agents-empty">No agents configured yet</p>
        )}
        {sortedAgents.map((agent) => (
          <AgentRow
            key={agent._id}
            agent={agent}
            saving={saving}
            canDelete={agent.sessionKey !== "main"}
            modelMisconfigured={isModelMisconfigured(agent.model)}
            onEdit={() => setEditingId(agent._id)}
            onDelete={() => setDeletingId(agent._id)}
          />
        ))}
      </div>

      <button
        className="admin-btn"
        onClick={() => setAdding(true)}
        style={{ marginTop: "var(--space-md)" }}
      >
        + Add Agent
      </button>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Agent">
        <AgentForm
          existingNames={existingNames}
          availableModels={availableModels}
          saving={saving}
          onSave={handleCreate}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit Agent"
      >
        {editingId && (() => {
          const agent = sortedAgents.find((a) => a._id === editingId);
          if (!agent) return null;
          return (
            <AgentForm
              initial={agent}
              isEdit
              existingNames={existingNames}
              availableModels={availableModels}
              saving={saving}
              onSave={(data) => handleUpdate(agent._id, data)}
              onCancel={() => setEditingId(null)}
            />
          );
        })()}
      </Modal>

      <Modal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Agent"
      >
        {deletingId && (() => {
          const agent = sortedAgents.find((a) => a._id === deletingId);
          if (!agent) return null;
          return (
            <div className="agent-delete-confirm">
              <p className="agent-delete-warning">
                ⚠️ This will permanently remove <strong>{agent.name}</strong> from this harbor. This cannot be undone.
              </p>
              <div className="agent-form-actions">
                <button
                  className="admin-btn admin-btn-danger"
                  disabled={saving}
                  onClick={() => handleDelete(agent._id)}
                >
                  Delete Agent
                </button>
                <button
                  className="admin-btn admin-btn-accent-muted"
                  disabled={saving}
                  onClick={() => setDeletingId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
