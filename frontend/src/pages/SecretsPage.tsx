import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { encryptWithPublicKey } from "../lib/crypto";
import { REQUIRED_KEYS, RECOMMENDED_KEYS, type SecretInfo } from "../lib/secrets";
import { SecretRow, AddSecretForm } from "../components/secrets";
import { useHarborContext } from "../contexts/HarborContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const secretsApi = (api as any).secrets;

export function SecretsPage() {
  const { harborId, publicKey: publicKeyJson } = useHarborContext();

  const secrets = useQuery(
    secretsApi.list,
    harborId ? { harborId } : "skip",
  );
  const setSecret = useMutation(secretsApi.set);
  const removeSecret = useMutation(secretsApi.remove);

  const [addingCustom, setAddingCustom] = useState(false);
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

  const handleSet = async (
    name: string,
    value: string,
    category: "required" | "recommended" | "custom",
    description?: string,
  ) => {
    if (!harborId) return;
    setSaving(true);
    try {
      const encrypted = hasPublicKey ? await encrypt(value) : value;
      await setSecret({ harborId, name, value: encrypted, category, description });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"secrets">) => {
    setSaving(true);
    try {
      await removeSecret({ id });
    } finally {
      setSaving(false);
    }
  };

  const secretsList = (secrets ?? []) as SecretInfo[];
  const secretsByName = new Map(secretsList.map((s) => [s.name, s]));
  const customSecrets = secretsList
    .filter((s) => s.category === "custom")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="secrets-page">
      <div className="secrets-page-header">
        <h1 className="page-title">Secrets</h1>
      </div>

      {!hasPublicKey && (
        <div className="secrets-warning">
          ⚠️ No encryption key found. Start the daemon to generate a keypair
          before setting secrets.
        </div>
      )}

      {/* Required Variables */}
      <section className="secrets-section">
        <div className="secrets-section-header">
          <h2 className="secrets-section-title">🔑 Required Variables</h2>
          <span className="secrets-section-hint">
            Nothing works without these
          </span>
        </div>
        <div className="secrets-list">
          {REQUIRED_KEYS.map((rk) => (
            <SecretRow
              key={rk.name}
              name={rk.name}
              description={rk.description}
              secret={secretsByName.get(rk.name)}
              disabled={!hasPublicKey}
              saving={saving}
              onSave={(v) => handleSet(rk.name, v, "required", rk.description)}
            />
          ))}
        </div>
      </section>

      {/* Recommended Variables */}
      <section className="secrets-section">
        <div className="secrets-section-header">
          <h2 className="secrets-section-title">⭐ Recommended Variables</h2>
          <span className="secrets-section-hint">
            Unlock important agent capabilities
          </span>
        </div>
        <div className="secrets-list">
          {RECOMMENDED_KEYS.map((rk) => {
            const secret = secretsByName.get(rk.name);
            return (
              <SecretRow
                key={rk.name}
                name={rk.name}
                description={rk.description}
                secret={secret}
                disabled={!hasPublicKey}
                saving={saving}
                onSave={(v) => handleSet(rk.name, v, "recommended", rk.description)}
                onDelete={secret?.isSet ? () => handleDelete(secret._id as Id<"secrets">) : undefined}
              />
            );
          })}
        </div>
      </section>

      {/* Custom Variables */}
      <section className="secrets-section">
        <div className="secrets-section-header">
          <h2 className="secrets-section-title">🔧 Custom Variables</h2>
          <span className="secrets-section-hint">
            Additional environment variables for your agents
          </span>
        </div>
        <div className="secrets-list">
          {customSecrets.length === 0 && !addingCustom && (
            <p className="secrets-empty">No custom variables yet</p>
          )}
          {customSecrets.map((secret) => (
            <SecretRow
              key={secret._id}
              name={secret.name}
              description={secret.description}
              secret={secret}
              disabled={!hasPublicKey}
              saving={saving}
              onSave={(v) => handleSet(secret.name, v, "custom", secret.description)}
              onDelete={() => handleDelete(secret._id as Id<"secrets">)}
            />
          ))}
          {addingCustom && (
            <AddSecretForm
              saving={saving}
              onSave={(name, value, desc) => {
                handleSet(name, value, "custom", desc);
                setAddingCustom(false);
              }}
              onCancel={() => setAddingCustom(false)}
            />
          )}
        </div>
        {!addingCustom && (
          <button
            className="admin-btn"
            disabled={!hasPublicKey}
            onClick={() => setAddingCustom(true)}
            style={{ marginTop: "var(--space-md)" }}
          >
            + Add Variable
          </button>
        )}
      </section>

      <div className="secrets-info-box">
        <p>
          🔒 Secrets are encrypted in your browser with your host's public key
          before leaving this device. They are never stored in plaintext in the
          cloud and cannot be revealed after saving.
        </p>
      </div>
    </div>
  );
}
