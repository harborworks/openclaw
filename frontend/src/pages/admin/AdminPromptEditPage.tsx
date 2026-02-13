import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../../auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const promptTemplatesApi = (api as any).promptTemplates;

interface PromptTemplate {
  _id: string;
  fileKey: string;
  content: string;
  version: number;
  updatedAt: number;
}

export function AdminPromptEditPage() {
  const navigate = useNavigate();
  const { fileKey } = useParams<{ fileKey: string }>();
  const { user: authUser } = useAuth();
  const cognitoSub = authUser?.userId;

  const templates = useQuery(
    promptTemplatesApi.list,
    cognitoSub ? { cognitoSub } : "skip"
  ) as PromptTemplate[] | undefined;

  const updateTemplate = useMutation(promptTemplatesApi.update);

  const template = templates?.find((t) => t.fileKey === fileKey);

  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (template && !loaded) {
      setContent(template.content);
      setLoaded(true);
    }
  }, [template, loaded]);

  const isDirty = loaded && content !== template?.content;

  const handleSave = async () => {
    if (!cognitoSub || !fileKey) return;
    setSaving(true);
    try {
      await updateTemplate({ cognitoSub, fileKey, content });
      navigate("/admin/prompts");
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  };

  if (!templates) {
    return <p className="admin-loading">Loading…</p>;
  }

  if (!template) {
    return (
      <div>
        <p>Template not found: {fileKey}</p>
        <button className="admin-btn" onClick={() => navigate("/admin/prompts")}>Back</button>
      </div>
    );
  }

  return (
    <div className="prompt-editor">
      <div className="prompt-editor-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="admin-back" onClick={() => navigate("/admin/prompts")}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h2 className="prompt-editor-title">{template.fileKey}</h2>
            <span className="prompt-editor-meta">
              v{template.version} · Last updated {new Date(template.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="prompt-editor-actions">
          <button
            className="admin-btn"
            onClick={() => navigate("/admin/prompts")}
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
