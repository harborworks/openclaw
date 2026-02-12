import { useState } from "react";
import type { SecretInfo } from "../../lib/secrets";
import { SecretStatus } from "./SecretStatus";
import { SecretValueInput } from "./SecretValueInput";

interface SecretRowProps {
  name: string;
  description?: string;
  secret?: SecretInfo;
  disabled: boolean;
  saving: boolean;
  onSave: (value: string) => void;
  onDelete?: () => void;
}

export function SecretRow({
  name,
  description,
  secret,
  disabled,
  saving,
  onSave,
  onDelete,
}: SecretRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="secret-row">
      <div className="secret-row-main">
        <div className="secret-info">
          <code className="secret-name">{name}</code>
          {description && <span className="secret-desc">{description}</span>}
        </div>
        <div className="secret-row-actions">
          <SecretStatus secret={secret} />
          {!editing && (
            <>
              <button
                className="admin-btn admin-btn-sm"
                disabled={disabled}
                onClick={() => setEditing(true)}
              >
                {secret?.isSet ? "Replace" : "Set"}
              </button>
              {onDelete && !confirmDelete && (
                <button
                  className="admin-btn admin-btn-sm admin-btn-danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
              )}
              {onDelete && confirmDelete && (
                <div className="secret-delete-confirm">
                  <button
                    className="admin-btn admin-btn-sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    No
                  </button>
                  <button
                    className="admin-btn admin-btn-sm admin-btn-danger"
                    onClick={() => {
                      onDelete();
                      setConfirmDelete(false);
                    }}
                  >
                    Yes, delete
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {editing && (
        <SecretValueInput
          placeholder={`Paste your ${name}…`}
          saving={saving}
          onSave={(v) => {
            onSave(v);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}
