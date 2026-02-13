import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { PageHeader } from "../components/PageHeader";
import { useHarborContext } from "../contexts/HarborContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const harborPromptsApi = (api as any).harborPrompts;

interface Sections {
  principles?: string;
  rules?: string;
  tone?: string;
  userInfo?: string;
  toolNotes?: string;
}

interface SectionConfig {
  key: keyof Sections;
  label: string;
  description: string;
  placeholder: string;
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: "principles",
    label: "Core Principles",
    description: "What matters to your team — values, priorities, and operating principles for your agents.",
    placeholder: "Be helpful, accurate, and concise.\nPrioritize clarity over cleverness.\nAlways verify before acting.",
  },
  {
    key: "rules",
    label: "Rules",
    description: "Do's and don'ts — specific behavioral constraints for your agents.",
    placeholder: "Don't share internal data externally.\nAlways ask before running destructive commands.\nKeep responses concise unless asked for detail.",
  },
  {
    key: "tone",
    label: "Tone",
    description: "How your agents should communicate — voice, formality, and style.",
    placeholder: "Professional and direct. Skip unnecessary pleasantries.\nUse plain language, avoid jargon unless the audience expects it.",
  },
  {
    key: "userInfo",
    label: "User Info",
    description: "Information about the human owner — name, preferences, timezone, context.",
    placeholder: "Name: Jane Smith\nTimezone: America/New_York\nPreferences: Prefers bullet points over paragraphs.",
  },
  {
    key: "toolNotes",
    label: "Tool Notes",
    description: "Custom guidance for tools and integrations your agents use.",
    placeholder: "Use the staging API endpoint for testing.\nAlways include auth headers in API calls.",
  },
];

function SectionCard({
  config,
  value,
  onChange,
  onReset,
}: {
  config: SectionConfig;
  value: string;
  onChange: (val: string) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(!!value);

  return (
    <div className="prompt-section-card">
      <div
        className="prompt-section-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
      >
        <div className="prompt-section-header-left">
          <span className="prompt-section-chevron">{expanded ? "▾" : "▸"}</span>
          <span className="prompt-section-label">{config.label}</span>
          {value && <span className="prompt-section-badge">customized</span>}
        </div>
        {value && (
          <button
            className="admin-btn admin-btn-sm"
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            title="Reset to default"
          >
            Reset
          </button>
        )}
      </div>
      {expanded && (
        <div className="prompt-section-body">
          <p className="prompt-section-description">{config.description}</p>
          <textarea
            className="prompt-section-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder}
            rows={6}
          />
        </div>
      )}
    </div>
  );
}

export function PromptsPage() {
  const { harborId } = useHarborContext();
  const harborPrompts = useQuery(harborPromptsApi.get, harborId ? { harborId } : "skip");
  const updatePrompts = useMutation(harborPromptsApi.update);

  const [sections, setSections] = useState<Sections>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Sync from server when data arrives
  useEffect(() => {
    if (harborPrompts !== undefined && !loaded) {
      setSections(harborPrompts?.sections ?? {});
      setLoaded(true);
    }
  }, [harborPrompts, loaded]);

  // Reset loaded state if harborId changes
  useEffect(() => {
    setLoaded(false);
  }, [harborId]);

  const serverSections = harborPrompts?.sections ?? {};
  const isDirty = loaded && JSON.stringify(sections) !== JSON.stringify(serverSections);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrompts({ harborId, sections });
    } finally {
      setSaving(false);
    }
  };

  const handleSectionChange = (key: keyof Sections, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleReset = (key: keyof Sections) => {
    setSections((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (!loaded) {
    return (
      <div className="prompts-page">
        <PageHeader title="Prompts" />
        <p className="agents-empty">Loading…</p>
      </div>
    );
  }

  return (
    <div className="prompts-page">
      <PageHeader title="Prompts">
        <button
          className="admin-btn admin-btn-accent"
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </PageHeader>

      <p className="prompts-intro">
        Customize the prompt sections that shape how your agents behave. Empty sections use platform defaults.
      </p>

      <div className="prompts-sections">
        {SECTION_CONFIGS.map((config) => (
          <SectionCard
            key={config.key}
            config={config}
            value={sections[config.key] ?? ""}
            onChange={(val) => handleSectionChange(config.key, val)}
            onReset={() => handleReset(config.key)}
          />
        ))}
      </div>
    </div>
  );
}
