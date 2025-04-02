import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { toast } from "sonner";
import * as api from "../../api";
import { User } from "../../api/users";
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

export default function UsersAdmin() {
  const auth = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [newUser, setNewUser] = useState({ email: "", superadmin: false });
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!auth.user?.access_token) return;

      try {
        setIsFetching(true);
        setFetchError(null);

        const fetchedUsers = await api.getUsers(auth.user.access_token);
        setUsers(fetchedUsers);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        setFetchError(error.response?.data?.message || "Failed to fetch users");
        toast.error("Failed to fetch users");
      } finally {
        setIsFetching(false);
      }
    };

    fetchUsers();
  }, [auth.user?.access_token]);

  // Handle selection of users
  const toggleUserSelection = (userId: number) => {
    const userToToggle = users.find((user) => user.id === userId);

    // Don't allow selecting protected users
    if (userToToggle) {
      const currentUserEmail = auth.user?.profile.email;
      const isBen = userToToggle.email === "ben@sparrow.dev";
      const isCurrentUser = userToToggle.email === currentUserEmail;

      if (isBen || isCurrentUser) {
        toast.error("Cannot select protected users");
        return;
      }
    }

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
      // Only select non-protected users
      const currentUserEmail = auth.user?.profile.email;
      const selectableUsers = users.filter(
        (user) =>
          user.email !== "ben@sparrow.dev" && user.email !== currentUserEmail
      );
      setSelectedUsers(selectableUsers.map((user) => user.id));
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

      // Refresh the user list
      const updatedUsers = await api.getUsers(auth.user.access_token);
      setUsers(updatedUsers);

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
  const handleDeleteSelected = async () => {
    if (!auth.user?.access_token) {
      toast.error("You must be authenticated to perform this action");
      return;
    }

    // Get the current user and Ben's email for protection checks
    const currentUserEmail = auth.user?.profile.email;
    const protectedEmails = ["ben@sparrow.dev"];
    if (currentUserEmail) protectedEmails.push(currentUserEmail);

    // Filter out protected users from the selection
    const usersToDelete = users.filter(
      (user) =>
        selectedUsers.includes(user.id) && !protectedEmails.includes(user.email)
    );

    if (usersToDelete.length === 0) {
      toast.error("No users to delete. Protected users cannot be deleted.");
      return;
    }

    try {
      // Delete users one by one
      for (const user of usersToDelete) {
        await api.deleteUser(auth.user.access_token, user.id);
      }

      // Update local state
      setUsers(
        users.filter(
          (user) =>
            !selectedUsers.includes(user.id) ||
            protectedEmails.includes(user.email)
        )
      );
      setSelectedUsers([]);

      toast.success(`${usersToDelete.length} user(s) deleted successfully`);
    } catch (error: any) {
      console.error("Error deleting users:", error);
      toast.error(error.response?.data?.message || "Failed to delete users");
    }
  };

  // Toggle superadmin status
  const toggleSuperadmin = async (userId: number) => {
    if (!auth.user?.access_token) {
      toast.error("You must be authenticated to perform this action");
      return;
    }

    // Find the user being modified
    const userToToggle = users.find((user) => user.id === userId);
    if (!userToToggle) return;

    // Get the current user's email for comparison
    const currentUserEmail = auth.user?.profile.email;

    // Check if the user is trying to revoke their own superadmin status
    if (
      userToToggle.email === currentUserEmail &&
      userToToggle.superadmin === true
    ) {
      toast.error("You cannot revoke your own superadmin status");
      return;
    }

    // Also prevent revoking superadmin status for ben@sparrow.dev
    if (
      userToToggle.email === "ben@sparrow.dev" &&
      userToToggle.superadmin === true
    ) {
      toast.error("Cannot revoke superadmin status for this user");
      return;
    }

    // The new superadmin status will be the opposite of the current status
    const newSuperadminStatus = !userToToggle.superadmin;

    try {
      // Update the user in the backend
      await api.updateUserSuperadmin(
        auth.user.access_token,
        userId,
        newSuperadminStatus
      );

      // Update local state on success
      setUsers(
        users.map((user) =>
          user.id === userId
            ? { ...user, superadmin: newSuperadminStatus }
            : user
        )
      );

      toast.success(
        `Superadmin status ${newSuperadminStatus ? "granted to" : "revoked from"} ${userToToggle.email}`
      );
    } catch (error: any) {
      console.error("Error updating superadmin status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update superadmin status"
      );
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    if (!auth.user?.access_token) {
      toast.error("You must be authenticated to perform this action");
      return;
    }

    try {
      await api.deleteUser(auth.user.access_token, userId);
      setUsers(users.filter((user) => user.id !== userId));
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
      toast.success("User deleted successfully");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
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

      {isFetching ? (
        <div className="flex justify-center py-8">
          <p>Loading users...</p>
        </div>
      ) : fetchError ? (
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {fetchError}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%]">
                  <Checkbox
                    checked={
                      selectedUsers.length === users.length && users.length > 0
                    }
                    onCheckedChange={toggleAllSelection}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-[45%]">Email</TableHead>
                <TableHead className="w-[15%]">Super Admin</TableHead>
                <TableHead className="w-[15%]">Created</TableHead>
                <TableHead className="w-[20%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isCurrentUser = user.email === auth.user?.profile.email;
                  const isBen = user.email === "ben@sparrow.dev";
                  const isProtected =
                    (isCurrentUser || isBen) && user.superadmin;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          aria-label={`Select user ${user.email}`}
                          disabled={isProtected}
                        />
                      </TableCell>
                      <TableCell>
                        {user.email}
                        {isCurrentUser && " (you)"}
                        {isBen && !isCurrentUser && " (protected)"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.superadmin}
                          onCheckedChange={() => toggleSuperadmin(user.id)}
                          aria-label="Toggle superadmin"
                          disabled={isProtected}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isProtected || isCurrentUser}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
