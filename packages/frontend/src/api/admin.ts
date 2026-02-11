import { api } from "./client";

// ── Types ──────────────────────────────────────────────────────

export interface Org {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Harbor {
  id: number;
  orgId: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: number;
  orgId: number;
  userId: number;
  role: "owner" | "admin" | "member";
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  isSuperadmin: boolean;
  createdAt: string;
}

// ── Orgs ───────────────────────────────────────────────────────

export async function getOrgs(): Promise<Org[]> {
  const { data } = await api.get<Org[]>("/admin/orgs");
  return data;
}

export async function createOrg(params: { name: string; slug: string }): Promise<Org> {
  const { data } = await api.post<Org>("/admin/orgs", params);
  return data;
}

export async function deleteOrg(orgId: number): Promise<void> {
  await api.delete(`/admin/orgs/${orgId}`);
}

// ── Harbors ────────────────────────────────────────────────────

export async function getHarbors(orgId: number): Promise<Harbor[]> {
  const { data } = await api.get<Harbor[]>(`/admin/orgs/${orgId}/harbors`);
  return data;
}

export async function createHarbor(
  orgId: number,
  params: { name: string; slug: string }
): Promise<Harbor> {
  const { data } = await api.post<Harbor>(`/admin/orgs/${orgId}/harbors`, params);
  return data;
}

export async function deleteHarbor(harborId: number): Promise<void> {
  await api.delete(`/admin/harbors/${harborId}`);
}

// ── Members ────────────────────────────────────────────────────

export async function getOrgMembers(orgId: number): Promise<OrgMember[]> {
  const { data } = await api.get<OrgMember[]>(`/admin/orgs/${orgId}/members`);
  return data;
}

export async function addOrgMember(
  orgId: number,
  params: { userId?: number; email?: string; role: string }
): Promise<OrgMember> {
  const { data } = await api.post<OrgMember>(`/admin/orgs/${orgId}/members`, params);
  return data;
}

export async function updateMemberRole(
  orgId: number,
  userId: number,
  role: string
): Promise<void> {
  await api.patch(`/admin/orgs/${orgId}/members/${userId}`, { role });
}

export async function removeMember(orgId: number, userId: number): Promise<void> {
  await api.delete(`/admin/orgs/${orgId}/members/${userId}`);
}

// ── Users ──────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/admin/users");
  return data;
}

// ── Navigation helpers ─────────────────────────────────────────

export async function getDefaultRedirect(): Promise<{ orgSlug: string; harborSlug: string }> {
  const { data } = await api.get("/auth/default");
  return data;
}
