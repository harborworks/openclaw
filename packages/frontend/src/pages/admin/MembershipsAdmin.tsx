import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { toast } from "sonner";

import {
  createMembership,
  deleteMembership,
  getMemberships,
  updateMembershipAdmin,
  type Membership,
} from "../../api/memberships";
import { getOrgs, type Org } from "../../api/orgs";
import { getUsers, type User } from "../../api/users";
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

export default function MembershipsAdmin() {
  const auth = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([]);
  const [newMembership, setNewMembership] = useState({
    userId: "",
    orgId: "",
    admin: false,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchData();
    }
  }, [auth.isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = auth.user?.access_token || "";
      const [membershipsData, usersData, orgsData] = await Promise.all([
        getMemberships(token),
        getUsers(token),
        getOrgs(token),
      ]);

      setMemberships(membershipsData);
      setUsers(usersData);
      setOrgs(orgsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

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
  const handleAddMembership = async () => {
    if (!newMembership.userId || !newMembership.orgId) {
      toast.error("Please select both user and organization");
      return;
    }

    setLoading(true);
    try {
      const token = auth.user?.access_token || "";
      const created = await createMembership(
        token,
        parseInt(newMembership.userId),
        parseInt(newMembership.orgId),
        newMembership.admin
      );

      setMemberships([...memberships, created]);
      setNewMembership({
        userId: "",
        orgId: "",
        admin: false,
      });
      setIsAddDialogOpen(false);
      toast.success("Membership created successfully");
    } catch (error: any) {
      console.error("Error creating membership:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create membership");
      }
    } finally {
      setLoading(false);
    }
  };

  // Archive selected memberships
  const handleDeleteSelected = async () => {
    if (selectedMemberships.length === 0) return;

    setDeleteLoading(true);
    try {
      const token = auth.user?.access_token || "";

      // Archive memberships sequentially to avoid race conditions
      for (const id of selectedMemberships) {
        await deleteMembership(token, id);
      }

      setMemberships(
        memberships.filter(
          (membership) => !selectedMemberships.includes(membership.id)
        )
      );
      setSelectedMemberships([]);
      toast.success("Selected memberships archived successfully");
    } catch (error) {
      console.error("Error archiving memberships:", error);
      toast.error("Failed to archive one or more memberships");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle admin status
  const toggleAdmin = async (membership: Membership) => {
    try {
      const token = auth.user?.access_token || "";
      const updated = await updateMembershipAdmin(
        token,
        membership.id,
        !membership.admin
      );

      setMemberships(
        memberships.map((m) => (m.id === membership.id ? updated : m))
      );
      toast.success("Admin status updated successfully");
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error("Failed to update admin status");
    }
  };

  if (loading && memberships.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

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
              disabled={deleteLoading}
            >
              {deleteLoading ? "Archiving..." : "Archive Selected"}
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
                      {users.map((user) => (
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
                      {orgs.map((org) => (
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
                  disabled={
                    !newMembership.userId || !newMembership.orgId || loading
                  }
                >
                  {loading ? "Adding..." : "Add Membership"}
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
              <TableHead className="w-[5%]">
                <Checkbox
                  checked={
                    selectedMemberships.length === memberships.length &&
                    memberships.length > 0
                  }
                  onCheckedChange={toggleAllSelection}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[23%]">User</TableHead>
              <TableHead className="w-[22%]">Organization</TableHead>
              <TableHead className="w-[15%]">Admin</TableHead>
              <TableHead className="w-[15%]">Created</TableHead>
              <TableHead className="w-[20%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-6 text-muted-foreground"
                >
                  No memberships found
                </TableCell>
              </TableRow>
            ) : (
              memberships.map((membership) => (
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
                  <TableCell>{membership.userEmail}</TableCell>
                  <TableCell>{membership.orgSlug}</TableCell>
                  <TableCell>
                    <Switch
                      checked={membership.admin}
                      onCheckedChange={() => toggleAdmin(membership)}
                      aria-label="Toggle admin"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(membership.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          const token = auth.user?.access_token || "";
                          await deleteMembership(token, membership.id);
                          setMemberships(
                            memberships.filter((m) => m.id !== membership.id)
                          );
                          toast.success("Membership archived successfully");
                        } catch (error) {
                          console.error("Error archiving membership:", error);
                          toast.error("Failed to archive membership");
                        }
                      }}
                    >
                      Archive
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
