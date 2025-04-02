import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

// Mock data
const mockUsers = [
  { id: 1, email: "admin@example.com" },
  { id: 2, email: "user1@example.com" },
  { id: 3, email: "user2@example.com" },
];

const mockOrgs = [
  { id: 1, slug: "acme-corp" },
  { id: 2, slug: "example-inc" },
  { id: 3, slug: "test-org" },
];

const mockMemberships = [
  { id: 1, userId: 1, orgId: 1, admin: true, createdAt: "2023-01-01" },
  { id: 2, userId: 2, orgId: 1, admin: false, createdAt: "2023-01-02" },
  { id: 3, userId: 3, orgId: 2, admin: true, createdAt: "2023-01-03" },
];

export default function MembershipsAdmin() {
  const [memberships, setMemberships] = useState(mockMemberships);
  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([]);
  const [newMembership, setNewMembership] = useState({
    userId: "",
    orgId: "",
    admin: false,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Handle selection of memberships
  const toggleMembershipSelection = (membershipId: number) => {
    if (selectedMemberships.includes(membershipId)) {
      setSelectedMemberships(
        selectedMemberships.filter((id) => id !== membershipId)
      );
    } else {
      setSelectedMemberships([...selectedMemberships, membershipId]);
    }
  };

  // Toggle all selections
  const toggleAllSelection = () => {
    if (selectedMemberships.length === memberships.length) {
      setSelectedMemberships([]);
    } else {
      setSelectedMemberships(memberships.map((membership) => membership.id));
    }
  };

  // Add new membership
  const handleAddMembership = () => {
    const newId = Math.max(...memberships.map((m) => m.id)) + 1;
    const membership = {
      id: newId,
      userId: parseInt(newMembership.userId),
      orgId: parseInt(newMembership.orgId),
      admin: newMembership.admin,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setMemberships([...memberships, membership]);
    setNewMembership({
      userId: "",
      orgId: "",
      admin: false,
    });
    setIsAddDialogOpen(false);
  };

  // Delete selected memberships
  const handleDeleteSelected = () => {
    setMemberships(
      memberships.filter(
        (membership) => !selectedMemberships.includes(membership.id)
      )
    );
    setSelectedMemberships([]);
  };

  // Toggle admin status
  const toggleAdmin = (membershipId: number) => {
    setMemberships(
      memberships.map((membership) =>
        membership.id === membershipId
          ? { ...membership, admin: !membership.admin }
          : membership
      )
    );
  };

  // Helper function to get user email by ID
  const getUserEmail = (userId: number) => {
    const user = mockUsers.find((u) => u.id === userId);
    return user ? user.email : "Unknown";
  };

  // Helper function to get org slug by ID
  const getOrgSlug = (orgId: number) => {
    const org = mockOrgs.find((o) => o.id === orgId);
    return org ? org.slug : "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Memberships</h2>
        <div className="space-x-2">
          {selectedMemberships.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add Membership</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Membership</DialogTitle>
                <DialogDescription>
                  Add a new user to an organization.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="user" className="text-right">
                    User
                  </Label>
                  <Select
                    value={newMembership.userId}
                    onValueChange={(value) =>
                      setNewMembership({ ...newMembership, userId: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="org" className="text-right">
                    Organization
                  </Label>
                  <Select
                    value={newMembership.orgId}
                    onValueChange={(value) =>
                      setNewMembership({ ...newMembership, orgId: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select an organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockOrgs.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin" className="text-right">
                    Admin
                  </Label>
                  <Switch
                    id="admin"
                    checked={newMembership.admin}
                    onCheckedChange={(checked) =>
                      setNewMembership({ ...newMembership, admin: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddMembership}
                  disabled={!newMembership.userId || !newMembership.orgId}
                >
                  Add Membership
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedMemberships.length === memberships.length &&
                    memberships.length > 0
                  }
                  onCheckedChange={toggleAllSelection}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((membership) => (
              <TableRow key={membership.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedMemberships.includes(membership.id)}
                    onCheckedChange={() =>
                      toggleMembershipSelection(membership.id)
                    }
                    aria-label={`Select membership ${membership.id}`}
                  />
                </TableCell>
                <TableCell>{getUserEmail(membership.userId)}</TableCell>
                <TableCell>{getOrgSlug(membership.orgId)}</TableCell>
                <TableCell>{membership.createdAt}</TableCell>
                <TableCell>
                  <Switch
                    checked={membership.admin}
                    onCheckedChange={() => toggleAdmin(membership.id)}
                    aria-label="Toggle admin"
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
