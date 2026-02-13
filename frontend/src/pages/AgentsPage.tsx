import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const telegramApi = (api as any).telegram;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pairingApi = (api as any).pairing;

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
  telegramBotToken?: string;
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

interface PairingRequestDoc {
  _id: Id<"pairingRequests">;
  senderId: string;
  code: string;
  senderMeta?: { username?: string; first_name?: string; last_name?: string };
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function PairingPanel({ harborId }: { harborId: string }) {
  const requests = useQuery(pairingApi.list, { harborId }) as PairingRequestDoc[] | undefined;
  const submitCode = useMutation(pairingApi.submitCode);
  const removeMut = useMutation(pairingApi.remove);

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const approved = (requests ?? []).filter((r) => r.status === "approved");
  const rejected = (requests ?? []).filter((r) => r.status === "rejected");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitCode({ harborId: harborId as Id<"harbors">, channel: "telegram", code: code.trim() });
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: Id<"pairingRequests">) => {
    await removeMut({ id });
  };

  const senderLabel = (r: PairingRequestDoc) => {
    const parts: string[] = [];
    if (r.senderMeta?.first_name) parts.push(r.senderMeta.first_name);
    if (r.senderMeta?.username) parts.push(`@${r.senderMeta.username}`);
    if (parts.length === 0 && r.senderId) parts.push(r.senderId);
    return parts.join(" ") || "Unknown";
  };

  return (
    <div className="pairing-panel">
      <div className="pairing-section-title">Paired Users</div>
      <p className="pairing-help">
        When someone messages this bot, they'll receive a pairing code. Paste it here to grant access.
      </p>

      <form className="pairing-code-form" onSubmit={handleSubmit}>
        <input
          className="agent-input pairing-code-input"
          placeholder="Pairing code"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          maxLength={8}
          style={{ fontFamily: "monospace", letterSpacing: "0.1em" }}
        />
        <button
          className="admin-btn admin-btn-accent"
          type="submit"
          disabled={!code.trim() || submitting}
        >
          {submitting ? "Approving…" : "Approve"}
        </button>
      </form>

      {error && <div className="pairing-error">{error}</div>}

      {pending.length > 0 && (
        <div className="pairing-group">
          <div className="pairing-group-label">Processing</div>
          {pending.map((r) => (
            <div key={r._id} className="pairing-row pairing-row-pending">
              <span className="pairing-code-display">{r.code}</span>
              <span className="pairing-status-pending">⏳ Waiting for confirmation…</span>
            </div>
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="pairing-group">
          <div className="pairing-group-label">Failed</div>
          {rejected.map((r) => (
            <div key={r._id} className="pairing-row pairing-row-failed">
              <span className="pairing-code-display">{r.code}</span>
              <span className="pairing-status-failed">Code not found or expired</span>
              <button
                className="admin-btn admin-btn-sm"
                onClick={() => handleRemove(r._id)}
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <div className="pairing-group">
          <div className="pairing-group-label">Approved</div>
          {approved.map((r) => (
            <div key={r._id} className="pairing-row">
              <span className="pairing-sender">{senderLabel(r)}</span>
              <span className="pairing-badge-approved">✓</span>
              <button
                className="admin-btn admin-btn-sm agent-btn-danger"
                onClick={() => handleRemove(r._id)}
                title="Revoke access"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TelegramConfig({
  agentId,
  harborId,
  currentToken,
}: {
  agentId: Id<"agents">;
  harborId: string;
  currentToken?: string;
}) {
  const updateAgent = useMutation(agentsApi.update);
  const validateToken = useAction(telegramApi.validateToken);

  const [token, setToken] = useState(currentToken ?? "");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    bot?: { username: string; firstName: string };
    error?: string;
  } | null>(null);
  const [showToken, setShowToken] = useState(!currentToken);

  const hasToken = !!currentToken;

  const handleValidate = async () => {
    if (!token.trim()) return;
    setValidating(true);
    setValidation(null);
    try {
      const result = await validateToken({ botToken: token.trim() });
      setValidation(result);
    } catch {
      setValidation({ valid: false, error: "Failed to validate token" });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!token.trim()) return;
    setSaving(true);
    try {
      await updateAgent({ id: agentId, telegramBotToken: token.trim() });
      setShowToken(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await updateAgent({ id: agentId, telegramBotToken: "" });
      setToken("");
      setValidation(null);
      setShowToken(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="telegram-config">
      <div className="telegram-config-header">
        <svg className="telegram-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
        <span className="telegram-config-title">Telegram</span>
        {hasToken && !showToken && (
          <span className="telegram-badge telegram-badge-connected">Connected</span>
        )}
      </div>

      {hasToken && !showToken ? (
        <>
          <div className="telegram-connected">
            <div className="telegram-connected-info">
              <span className="telegram-token-masked">Token: •••••{currentToken!.slice(-8)}</span>
            </div>
            <div className="telegram-connected-actions">
              <button
                className="admin-btn admin-btn-sm"
                onClick={() => setShowToken(true)}
                disabled={saving}
              >
                Change
              </button>
              <button
                className="admin-btn admin-btn-sm agent-btn-danger"
                onClick={handleRemove}
                disabled={saving}
              >
                Remove
              </button>
            </div>
          </div>
          <PairingPanel harborId={harborId} />
        </>
      ) : (
        <div className="telegram-setup">
          <p className="telegram-help">
            Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a> on Telegram and paste the token below.
          </p>
          <div className="telegram-token-row">
            <input
              className="agent-input telegram-token-input"
              type="password"
              placeholder="123456789:ABCdef..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setValidation(null);
              }}
            />
            <button
              className="admin-btn admin-btn-sm"
              onClick={handleValidate}
              disabled={!token.trim() || validating}
            >
              {validating ? "Checking…" : "Validate"}
            </button>
          </div>

          {validation && (
            <div className={`telegram-validation ${validation.valid ? "telegram-validation-ok" : "telegram-validation-err"}`}>
              {validation.valid ? (
                <span>✓ Valid — @{validation.bot!.username} ({validation.bot!.firstName})</span>
              ) : (
                <span>✗ {validation.error}</span>
              )}
            </div>
          )}

          <div className="telegram-setup-actions">
            <button
              className="admin-btn admin-btn-accent"
              onClick={handleSave}
              disabled={!token.trim() || !validation?.valid || saving}
            >
              {saving ? "Saving…" : hasToken ? "Update Token" : "Connect"}
            </button>
            {hasToken && (
              <button
                className="admin-btn admin-btn-accent-muted"
                onClick={() => {
                  setToken(currentToken ?? "");
                  setShowToken(false);
                  setValidation(null);
                }}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
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
        {agent.telegramBotToken && (
          <span className="agent-row-channel-badge" title="Telegram connected">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </span>
        )}
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
            <>
              <AgentForm
                initial={agent}
                isEdit
                existingNames={existingNames}
                availableModels={availableModels}
                saving={saving}
                onSave={(data) => handleUpdate(agent._id, data)}
                onCancel={() => setEditingId(null)}
              />
              <div className="agent-edit-divider" />
              <h3 className="agent-edit-section-title">Channels</h3>
              <TelegramConfig
                agentId={agent._id}
                harborId={harborId}
                currentToken={agent.telegramBotToken}
              />
            </>
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
