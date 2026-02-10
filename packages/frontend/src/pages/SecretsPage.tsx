import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import * as api from "../api";
import type { Secret } from "../api/secrets";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";

const REQUIRED_KEYS = [
  { name: "ANTHROPIC_API_KEY", description: "Claude API key for agent reasoning" },
  { name: "BRAVE_SEARCH_API_KEY", description: "Brave Search API for web search" },
  { name: "OPENAI_API_KEY", description: "OpenAI API key (optional, for GPT models)" },
  { name: "OPENROUTER_API_KEY", description: "OpenRouter API key (optional, multi-model routing)" },
];

function SecretStatus({ secret }: { secret?: Secret }) {
  if (!secret) {
    return <Badge variant="outline" className="text-muted-foreground">Not set</Badge>;
  }
  if (secret.pendingSync) {
    return <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">⏳ Syncing</Badge>;
  }
  return <Badge variant="secondary" className="text-green-700 bg-green-100">✓ Set</Badge>;
}

function SecretRow({
  name,
  description,
  secret,
  onSave,
  onDelete,
  saving,
}: {
  name: string;
  description?: string;
  secret?: Secret;
  onSave: (name: string, value: string, category: "required" | "custom", description?: string) => void;
  onDelete?: (id: number) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(name, value, secret?.category ?? "required", description ?? undefined);
    setValue("");
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-2 py-3 border-b last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <code className="text-sm font-semibold">{name}</code>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SecretStatus secret={secret} />
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              {secret?.isSet ? "Replace" : "Set"}
            </Button>
          )}
          {onDelete && secret && !editing && !confirmDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
          {confirmDelete && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  onDelete!(secret!.id);
                  setConfirmDelete(false);
                }}
              >
                Yes, delete
              </Button>
            </div>
          )}
        </div>
      </div>
      {editing && (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={`Paste your ${name}...`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setEditing(false); setValue(""); }
            }}
            autoFocus
            className="flex-1"
          />
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setValue(""); }}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving || !value.trim()} onClick={handleSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SecretsPage() {
  const queryClient = useQueryClient();
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const { data: secrets = [] } = useQuery({
    queryKey: ["secrets"],
    queryFn: api.getSecrets,
    refetchInterval: 3000,
  });

  const upsertMutation = useMutation({
    mutationFn: api.upsertSecret,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secrets"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSecret,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secrets"] }),
  });

  const secretsByName = new Map(secrets.map((s) => [s.name, s]));
  const customSecrets = secrets
    .filter((s) => s.category === "custom")
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = (name: string, value: string, category: "required" | "custom", description?: string) => {
    upsertMutation.mutate({ name, value, category, description });
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customValue.trim()) return;
    upsertMutation.mutate(
      { name: customName, value: customValue, category: "custom", description: customDesc || undefined },
      {
        onSuccess: () => {
          setCustomName("");
          setCustomValue("");
          setCustomDesc("");
          setAddingCustom(false);
        },
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔑 Required Keys
          </CardTitle>
          <CardDescription>API keys needed for agent capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          {REQUIRED_KEYS.map(({ name, description }) => (
            <SecretRow
              key={name}
              name={name}
              description={description}
              secret={secretsByName.get(name)}
              onSave={handleSave}
              saving={upsertMutation.isPending}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔧 Custom Variables
          </CardTitle>
          <CardDescription>Additional environment variables for your agents</CardDescription>
        </CardHeader>
        <CardContent>
          {customSecrets.length === 0 && !addingCustom && (
            <p className="text-sm text-muted-foreground py-2">No custom variables yet</p>
          )}
          {customSecrets.map((secret) => (
            <SecretRow
              key={secret.id}
              name={secret.name}
              description={secret.description ?? undefined}
              secret={secret}
              onSave={handleSave}
              onDelete={(id) => deleteMutation.mutate(id)}
              saving={upsertMutation.isPending}
            />
          ))}

          {addingCustom && (
            <div className="flex flex-col gap-2 py-3 border-t">
              <Input
                placeholder="VARIABLE_NAME"
                value={customName}
                onChange={(e) => setCustomName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                autoFocus
              />
              <Input
                placeholder="Description (optional)"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Value"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustom();
                  if (e.key === "Escape") { setAddingCustom(false); setCustomName(""); setCustomValue(""); setCustomDesc(""); }
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAddingCustom(false); setCustomName(""); setCustomValue(""); setCustomDesc(""); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={upsertMutation.isPending || !customName.trim() || !customValue.trim()}
                  onClick={handleAddCustom}
                >
                  {upsertMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}

          {!addingCustom && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setAddingCustom(true)}>
              + Add Variable
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 px-4 py-3 bg-muted rounded-lg text-sm text-muted-foreground">
        🔒 Secrets are encrypted at rest in the database. They are synced to your harbor host's <code>.env</code> file by the daemon.
      </div>
    </div>
  );
}
