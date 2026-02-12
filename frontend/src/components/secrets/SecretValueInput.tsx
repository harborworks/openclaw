import { useState } from "react";

interface SecretValueInputProps {
  placeholder: string;
  saving: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function SecretValueInput({ placeholder, saving, onSave, onCancel }: SecretValueInputProps) {
  const [value, setValue] = useState("");

  return (
    <div className="secret-edit">
      <input
        type="password"
        className="form-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSave(value.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="secret-edit-actions">
        <button className="admin-btn admin-btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="admin-btn admin-btn-sm admin-btn-primary"
          disabled={saving || !value.trim()}
          onClick={() => onSave(value.trim())}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
