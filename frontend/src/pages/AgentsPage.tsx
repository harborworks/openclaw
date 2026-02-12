import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { PageHeader } from "../components/PageHeader";
import { useHarborContext } from "../contexts/HarborContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentsApi = (api as any).agents;

type AgentLevel = "intern" | "specialist" | "lead";

interface AgentDoc {
  _id: Id<"agents">;
  name: string;
  sessionKey: string;
  role: string;
  level?: AgentLevel;
  status: "idle" | "active" | "blocked";
}

const LEVELS: AgentLevel[] = ["intern", "specialist", "lead"];

function AgentForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: { name: string; sessionKey: string; role: string; level?: AgentLevel };
  saving: boolean;
  onSave: (data: { name: string; sessionKey: string; role: string; level?: AgentLevel }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sessionKey, setSessionKey] = useState(initial?.sessionKey ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [level, setLevel] = useState<AgentLevel | "">(initial?.level ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sessionKey.trim() || !role.trim()) return;
    onSave({ name: name.trim(), sessionKey: sessionKey.trim(), role: role.trim(), level: level || undefined });
  };

  return (
    <form className="agent-form" onSubmit={handleSubmit}>
      <div className="agent-form-fields">
        <input
          className="agent-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="agent-input"
          placeholder="Session Key"
          value={sessionKey}
          onChange={(e) => setSessionKey(e.target.value)}
          required
        />
        <input
          className="agent-input"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
        <select
          className="agent-input"
          value={level}
          onChange={(e) => setLevel(e.target.value as AgentLevel | "")}
        >
          <option value="">Level (optional)</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <div className="agent-form-actions">
        <button type="submit" className="admin-btn" disabled={saving}>
          {initial ? "Save" : "Create"}
        </button>
        <button type="button" className="admin-btn agent-btn-cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AgentRow({
  agent,
  saving,
  onEdit,
  onDelete,
}: {
  agent: AgentDoc;
  saving: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="agent-row">
      <div className="agent-row-info">
        <span className="agent-row-name">{agent.name}</span>
        <span className="agent-row-meta">
          <code>{agent.sessionKey}</code>
          <span className="agent-row-sep">·</span>
          {agent.role}
          {agent.level && (
            <>
              <span className="agent-row-sep">·</span>
              {agent.level}
            </>
          )}
        </span>
      </div>
      <div className="agent-row-status">
        <span className={`agent-status agent-status-${agent.status}`}>
          {agent.status}
        </span>
      </div>
      <div className="agent-row-actions">
        <button className="admin-btn admin-btn-sm" onClick={onEdit} disabled={saving}>
          Edit
        </button>
        <button className="admin-btn admin-btn-sm agent-btn-danger" onClick={onDelete} disabled={saving}>
          Delete
        </button>
      </div>
    </div>
  );
}

export function AgentsPage() {
  const { harborId } = useHarborContext();
  const agents = useQuery(agentsApi.list, harborId ? { harborId } : "skip") as AgentDoc[] | undefined;
  const createAgent = useMutation(agentsApi.create);
  const updateAgent = useMutation(agentsApi.update);
  const removeAgent = useMutation(agentsApi.remove);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"agents"> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (data: { name: string; sessionKey: string; role: string; level?: AgentLevel }) => {
    setSaving(true);
    try {
      await createAgent({ harborId, ...data });
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: Id<"agents">, data: { name: string; sessionKey: string; role: string; level?: AgentLevel }) => {
    setSaving(true);
    try {
      await updateAgent({ id, ...data });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"agents">) => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    setSaving(true);
    try {
      await removeAgent({ id });
    } finally {
      setSaving(false);
    }
  };

  const sortedAgents = [...(agents ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="agents-page">
      <PageHeader title="Agents" />

      <div className="agents-list">
        {sortedAgents.length === 0 && !adding && (
          <p className="agents-empty">No agents configured yet</p>
        )}
        {sortedAgents.map((agent) =>
          editingId === agent._id ? (
            <AgentForm
              key={agent._id}
              initial={agent}
              saving={saving}
              onSave={(data) => handleUpdate(agent._id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <AgentRow
              key={agent._id}
              agent={agent}
              saving={saving}
              onEdit={() => setEditingId(agent._id)}
              onDelete={() => handleDelete(agent._id)}
            />
          ),
        )}
        {adding && (
          <AgentForm
            saving={saving}
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      {!adding && (
        <button
          className="admin-btn"
          onClick={() => setAdding(true)}
          style={{ marginTop: "var(--space-md)" }}
        >
          + Add Agent
        </button>
      )}
    </div>
  );
}
