import { useState } from "react";
import { useAuth } from "react-oidc-context";

import { toast } from "sonner";
import * as api from "../../api";
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
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
  {
    id: 1,
    email: "admin@example.com",
    superadmin: true,
    createdAt: "2023-01-01",
  },
  {
    id: 2,
    email: "user1@example.com",
    superadmin: false,
    createdAt: "2023-01-02",
  },
  {
    id: 3,
    email: "user2@example.com",
    superadmin: false,
    createdAt: "2023-01-03",
  },
];

export default function UsersAdmin() {
  const auth = useAuth();
  const [users, setUsers] = useState(mockUsers);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [newUser, setNewUser] = useState({ email: "", superadmin: false });
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle selection of users
  const toggleUserSelection = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Toggle all selections
  const toggleAllSelection = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
  };

  // Add new user
  const handleAddUser = async () => {
    if (!auth.user?.access_token) {
      toast.error("You must be authenticated to perform this action");
      return;
    }

    try {
      setIsLoading(true);

      // Call the API to invite the user
      await api.inviteUser(auth.user.access_token, newUser.email);

      // Add user to local state for immediate UI update
      const newId = Math.max(...users.map((u) => u.id), 0) + 1;
      const user = {
        id: newId,
        email: newUser.email,
        superadmin: newUser.superadmin,
        createdAt: new Date().toISOString().split("T")[0],
      };

      setUsers([...users, user]);
      setNewUser({ email: "", superadmin: false });
      setIsAddUserDialogOpen(false);

      toast.success(
        `User invitation sent to ${newUser.email} with temporary password`
      );
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.response?.data?.message || "Failed to invite user");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected users
  const handleDeleteSelected = () => {
    setUsers(users.filter((user) => !selectedUsers.includes(user.id)));
    setSelectedUsers([]);
  };

  // Toggle superadmin status
  const toggleSuperadmin = (userId: number) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, superadmin: !user.superadmin } : user
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Users</h2>
        <div className="space-x-2">
          {selectedUsers.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </Button>
          )}
          <Dialog
            open={isAddUserDialogOpen}
            onOpenChange={setIsAddUserDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. An invitation email with a
                  temporary password will be sent.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    className="col-span-3"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="superadmin" className="text-right">
                    Superadmin
                  </Label>
                  <Switch
                    id="superadmin"
                    checked={newUser.superadmin}
                    onCheckedChange={(checked) =>
                      setNewUser({ ...newUser, superadmin: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddUser}
                  disabled={isLoading || !newUser.email}
                >
                  {isLoading ? "Sending Invitation..." : "Add User"}
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
                    selectedUsers.length === users.length && users.length > 0
                  }
                  onCheckedChange={toggleAllSelection}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Superadmin</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                    aria-label={`Select user ${user.email}`}
                  />
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.createdAt}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.superadmin}
                    onCheckedChange={() => toggleSuperadmin(user.id)}
                    aria-label="Toggle superadmin"
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
