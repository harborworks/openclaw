import { useState } from "react";
import { isReservedName } from "../../lib/secrets";

interface AddSecretFormProps {
  saving: boolean;
  onSave: (name: string, value: string, description?: string) => void;
  onCancel: () => void;
}

export function AddSecretForm({ saving, onSave, onCancel }: AddSecretFormProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (isReservedName(name)) {
      setError(`"${name}" is a reserved system variable.`);
      return;
    }
    setError(null);
    onSave(name, value, description || undefined);
  };

  return (
    <div className="secret-row">
      <div className="secret-add-form">
        {error && <p className="secret-error">{error}</p>}
        <div className="secret-add-fields">
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
            placeholder="VARIABLE_NAME"
            autoFocus
          />
          <input
            type="text"
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <input
            type="password"
            className="form-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim() && value.trim()) handleSave();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>
        <div className="secret-edit-actions">
          <button className="admin-btn admin-btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="admin-btn admin-btn-sm admin-btn-primary"
            disabled={saving || !name.trim() || !value.trim()}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
