import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../../auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const promptTemplatesApi = (api as any).promptTemplates;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adminPromptsApi = (api as any).admin.promptTemplates;

interface PromptTemplate {
  _id: string;
  fileKey: string;
  content: string;
  version: number;
  updatedAt: number;
}

const FILE_DESCRIPTIONS: Record<string, string> = {
  "SOUL.md": "Core personality, principles, rules, and security framework",
  "IDENTITY.md": "Agent identity, role descriptions, and custom instructions",
  "USER.md": "Information about the human owner",
  "TOOLS.md": "Tool-specific guidance and notes",
  "AGENTS.md": "Team coordination and collaboration rules",
  "HEARTBEAT.md": "Wake behavior and task flow",
};

function TemplateEditor({
  template,
  cognitoSub,
  onClose,
}: {
  template: PromptTemplate;
  cognitoSub: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState(template.content);
  const [saving, setSaving] = useState(false);
  const updateTemplate = useMutation(promptTemplatesApi.update);

  const isDirty = content !== template.content;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTemplate({
        cognitoSub,
        fileKey: template.fileKey,
        content,
      });
      onClose();
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="prompt-editor">
      <div className="prompt-editor-header">
        <div>
          <h2 className="prompt-editor-title">{template.fileKey}</h2>
          <span className="prompt-editor-meta">
            v{template.version} · Last updated {new Date(template.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="prompt-editor-actions">
          <button
            className="admin-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <textarea
        className="prompt-editor-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />
      <div className="prompt-editor-hint">
        Handlebars placeholders: <code>{"{{agent.name}}"}</code>, <code>{"{{sections.principles}}"}</code>, <code>{"{{{raw_markdown}}}"}</code>, <code>{"{{#if}}...{{/if}}"}</code>, <code>{"{{#eq agent.role \"value\"}}...{{/eq}}"}</code>
      </div>
    </div>
  );
}

export function AdminPromptsPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const cognitoSub = authUser?.userId;

  const templates = useQuery(
    promptTemplatesApi.list,
    cognitoSub ? { cognitoSub } : "skip"
  ) as PromptTemplate[] | undefined;

  const seedTemplates = useMutation(adminPromptsApi.seed);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const editingTemplate = templates?.find((t) => t.fileKey === editingKey);

  const handleSeed = async () => {
    if (!cognitoSub) return;
    setSeeding(true);
    try {
      const result = await seedTemplates({ cognitoSub });
      alert(`Seeded ${result.created} template(s)`);
    } finally {
      setSeeding(false);
    }
  };

  if (editingTemplate && cognitoSub) {
    return (
      <div>
        <TemplateEditor
          key={editingTemplate._id}
          template={editingTemplate}
          cognitoSub={cognitoSub}
          onClose={() => setEditingKey(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-back" onClick={() => navigate("/admin")}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1>Prompt Templates</h1>
        </div>
        {templates && templates.length === 0 && (
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? "Seeding…" : "Seed Default Templates"}
          </button>
        )}
      </div>

      {!templates && <p className="admin-loading">Loading…</p>}

      {templates && templates.length > 0 && (
        <div className="prompt-list">
          {templates
            .sort((a, b) => {
              const order = ["SOUL.md", "IDENTITY.md", "USER.md", "TOOLS.md", "AGENTS.md", "HEARTBEAT.md"];
              return (order.indexOf(a.fileKey) ?? 99) - (order.indexOf(b.fileKey) ?? 99);
            })
            .map((t) => (
              <button
                key={t._id}
                className="prompt-card"
                onClick={() => setEditingKey(t.fileKey)}
              >
                <div className="prompt-card-header">
                  <code className="prompt-card-file">{t.fileKey}</code>
                  <span className="prompt-card-version">v{t.version}</span>
                </div>
                <p className="prompt-card-desc">
                  {FILE_DESCRIPTIONS[t.fileKey] ?? "Custom template"}
                </p>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
