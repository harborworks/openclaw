import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useAuth } from "../auth";
import * as admin from "../api/admin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// ── Harbor Section ─────────────────────────────────────────────

function HarborSection({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const { data: harbors = [] } = useQuery({
    queryKey: ["admin", "harbors", orgId],
    queryFn: () => admin.getHarbors(orgId),
    refetchInterval: 5000,
  });

  const createMut = useMutation({
    mutationFn: (params: { name: string; slug: string }) =>
      admin.createHarbor(orgId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "harbors", orgId] });
      setAdding(false);
      setName("");
      setSlug("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => admin.deleteHarbor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "harbors", orgId] });
    },
  });

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-2">Harbors</h4>
      {harbors.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground mb-2">No harbors yet</p>
      )}
      {harbors.map((h) => (
        <div key={h.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{h.name}</span>
            <Badge variant="outline" className="text-xs font-mono">{h.slug}</Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 h-7 px-2"
            onClick={() => deleteMut.mutate(h.id)}
          >
            ✕
          </Button>
        </div>
      ))}
      {adding ? (
        <div className="flex flex-col gap-2 mt-2">
          <Input
            placeholder="Harbor name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
            }}
            autoFocus
          />
          <Input
            placeholder="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setName(""); setSlug(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || !slug.trim() || createMut.isPending}
              onClick={() => createMut.mutate({ name, slug })}
            >
              {createMut.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
          {createMut.isError && (
            <p className="text-sm text-red-500">
              {(createMut.error as any)?.response?.data?.message || "Failed to create harbor"}
            </p>
          )}
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-2" onClick={() => setAdding(true)}>
          + Add Harbor
        </Button>
      )}
    </div>
  );
}

// ── Org Card ───────────────────────────────────────────────────

function OrgCard({ org, users }: { org: admin.Org; users: admin.User[] }) {
  const queryClient = useQueryClient();
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["admin", "members", org.id],
    queryFn: () => admin.getOrgMembers(org.id),
    refetchInterval: 5000,
  });

  const addMemberMut = useMutation({
    mutationFn: (params: { userId: number; role: string }) =>
      admin.addOrgMember(org.id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "members", org.id] });
      setAddingMember(false);
      setSelectedUserId("");
      setSelectedRole("member");
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (userId: number) => admin.removeMember(org.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "members", org.id] });
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      admin.updateMemberRole(org.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "members", org.id] });
    },
  });

  const deleteOrgMut = useMutation({
    mutationFn: () => admin.deleteOrg(org.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] });
      setConfirmDelete(false);
    },
  });

  const getUserEmail = (userId: number) => {
    const u = users.find((u) => u.id === userId);
    return u?.email ?? `User #${userId}`;
  };

  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableUsers = users.filter((u) => !memberUserIds.has(u.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{org.name}</CardTitle>
            <CardDescription className="font-mono text-xs">{org.slug}</CardDescription>
          </div>
          <div className="flex gap-2">
            {!confirmDelete ? (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleteOrgMut.isPending}
                  onClick={() => deleteOrgMut.mutate()}
                >
                  Confirm Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Members */}
        <h4 className="text-sm font-medium mb-2">Members</h4>
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground mb-2">No members yet</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">{getUserEmail(m.userId)}</span>
              <Badge variant="outline" className="text-xs">{m.role}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Select
                value={m.role}
                onValueChange={(role) => updateRoleMut.mutate({ userId: m.userId, role })}
              >
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">owner</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="member">member</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 h-7 px-2"
                onClick={() => removeMemberMut.mutate(m.userId)}
              >
                ✕
              </Button>
            </div>
          </div>
        ))}

        {addingMember ? (
          <div className="flex items-center gap-2 mt-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">owner</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="member">member</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!selectedUserId || addMemberMut.isPending}
              onClick={() =>
                addMemberMut.mutate({
                  userId: Number(selectedUserId),
                  role: selectedRole,
                })
              }
            >
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddingMember(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setAddingMember(true)}
          >
            + Add Member
          </Button>
        )}

        {/* Harbors */}
        <HarborSection orgId={org.id} />
      </CardContent>
    </Card>
  );
}

// ── Admin Page ─────────────────────────────────────────────────

export default function AdminPage() {
  const { isSuperadmin } = useAuth();
  const queryClient = useQueryClient();
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  const { data: orgs = [], isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: admin.getOrgs,
    refetchInterval: 5000,
    enabled: isSuperadmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: admin.getUsers,
    refetchInterval: 10000,
    enabled: isSuperadmin,
  });

  const createOrgMut = useMutation({
    mutationFn: admin.createOrg,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] });
      setCreatingOrg(false);
      setOrgName("");
      setOrgSlug("");
    },
  });

  if (!isSuperadmin) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-muted-foreground">403 — Forbidden</p>
      </div>
    );
  }

  if (orgsError) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-red-500">Failed to load admin data</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      {/* Create Org */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Manage organizations, members, and harbors</CardDescription>
        </CardHeader>
        <CardContent>
          {creatingOrg ? (
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Organization name"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setOrgSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  );
                }}
                autoFocus
              />
              <Input
                placeholder="slug (lowercase, hyphens)"
                value={orgSlug}
                onChange={(e) =>
                  setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreatingOrg(false);
                    setOrgName("");
                    setOrgSlug("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!orgName.trim() || !orgSlug.trim() || createOrgMut.isPending}
                  onClick={() => createOrgMut.mutate({ name: orgName, slug: orgSlug })}
                >
                  {createOrgMut.isPending ? "Creating..." : "Create Org"}
                </Button>
              </div>
              {createOrgMut.isError && (
                <p className="text-sm text-red-500">
                  {(createOrgMut.error as any)?.response?.data?.message || "Failed to create org"}
                </p>
              )}
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCreatingOrg(true)}>
              + New Organization
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Org List */}
      {orgsLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : orgs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No organizations yet</p>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} users={users} />
          ))}
        </div>
      )}

      {/* Users list */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>All users who have logged in</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet</p>
          ) : (
            <div className="space-y-1">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{u.email}</span>
                    {u.name && <span className="text-xs text-muted-foreground">({u.name})</span>}
                  </div>
                  {u.isSuperadmin && (
                    <Badge variant="secondary" className="text-xs">superadmin</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
