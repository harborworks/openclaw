import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { encryptWithPublicKey } from "../lib/crypto";
import { ENCRYPTION_NOTICE, type SecretInfo } from "../lib/secrets";
import { PageHeader } from "../components/PageHeader";
import { SecretStatus } from "../components/secrets/SecretStatus";
import { useHarborContext } from "../contexts/HarborContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const secretsApi = (api as any).secrets;

/** Model provider definitions — each maps to an env-var secret. */
const MODEL_PROVIDERS = [
  {
    key: "ANTHROPIC_API_KEY",
    name: "Anthropic",
    description: "Powers Claude models for agent reasoning",
    placeholder: "sk-ant-api03-…",
  },
  {
    key: "OPENAI_API_KEY",
    name: "OpenAI",
    description: "Powers OpenAI models and embeddings",
    placeholder: "sk-…",
  },
] as const;

function ProviderCard({
  provider,
  secret,
  disabled,
  saving,
  onSave,
}: {
  provider: (typeof MODEL_PROVIDERS)[number];
  secret?: SecretInfo;
  disabled: boolean;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(value.trim());
    setValue("");
    setEditing(false);
  };

  const isSet = secret?.isSet ?? false;

  return (
    <div className="model-card">
      <div className="model-card-header">
        <div className="model-card-info">
          <span className="model-card-name">{provider.name}</span>
        </div>
        <SecretStatus secret={secret} labels={{ unset: "Not configured", set: "✓ Connected" }} />
      </div>
      <p className="model-card-desc">{provider.description}</p>
      {!editing && (
        <button
          className="admin-btn"
          disabled={disabled}
          onClick={() => setEditing(true)}
        >
          {isSet ? "Replace API Key" : "Add API Key"}
        </button>
      )}
      {editing && (
        <div className="model-card-form">
          <input
            className="agent-input"
            type="password"
            placeholder={provider.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <div className="model-card-form-actions">
            <button
              className="admin-btn admin-btn-accent"
              disabled={saving || !value.trim()}
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="admin-btn admin-btn-accent-muted"
              disabled={saving}
              onClick={() => { setEditing(false); setValue(""); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ModelsPage() {
  const { harborId, publicKey: publicKeyJson } = useHarborContext();

  const secrets = useQuery(
    secretsApi.list,
    harborId ? { harborId } : "skip",
  );
  const setSecret = useMutation(secretsApi.set);

  const [saving, setSaving] = useState(false);
  const hasPublicKey = !!publicKeyJson;

  const encrypt = useCallback(
    async (plaintext: string): Promise<string> => {
      if (!publicKeyJson) throw new Error("No public key — is the daemon running?");
      const jwk = JSON.parse(publicKeyJson) as JsonWebKey;
      return encryptWithPublicKey(plaintext, jwk);
    },
    [publicKeyJson],
  );

  const handleSave = async (name: string, value: string, description: string) => {
    if (!harborId) return;
    setSaving(true);
    try {
      const encrypted = hasPublicKey ? await encrypt(value) : value;
      await setSecret({ harborId, name, value: encrypted, category: "required", description });
    } finally {
      setSaving(false);
    }
  };

  const secretsList = (secrets ?? []) as SecretInfo[];
  const secretsByName = new Map(secretsList.map((s) => [s.name, s]));

  const hasAnyProvider = MODEL_PROVIDERS.some(
    (p) => secretsByName.get(p.key)?.isSet,
  );

  return (
    <div className="models-page">
      <PageHeader title="Models" />

      {!hasPublicKey && (
        <div className="secrets-warning">
          ⚠️ No encryption key found. Start the daemon to generate a keypair
          before configuring model providers.
        </div>
      )}

      {hasPublicKey && secrets && !hasAnyProvider && (
        <div className="secrets-warning">
          ⚠️ At least one model provider is required for agents to function.
        </div>
      )}

      <div className="model-cards">
        {MODEL_PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.key}
            provider={provider}
            secret={secretsByName.get(provider.key)}
            disabled={!hasPublicKey}
            saving={saving}
            onSave={(v) => handleSave(provider.key, v, provider.description)}
          />
        ))}
      </div>

      <div className="secrets-info-box">
        <p>🔒 {ENCRYPTION_NOTICE}</p>
      </div>
    </div>
  );
}
