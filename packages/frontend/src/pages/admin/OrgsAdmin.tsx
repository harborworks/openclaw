import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { toast } from "sonner";
import * as api from "../../api";
import { Org } from "../../api/orgs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

export default function OrgsAdmin() {
  const auth = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<number[]>([]);
  const [newOrg, setNewOrg] = useState({ slug: "" });
  const [isAddOrgDialogOpen, setIsAddOrgDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch all organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      if (!auth.user?.access_token) return;

      try {
        setIsFetching(true);
        setFetchError(null);

        const fetchedOrgs = await api.getOrgs(auth.user.access_token);
        setOrgs(fetchedOrgs);
      } catch (error: any) {
        console.error("Error fetching organizations:", error);
        setFetchError(
          error.response?.data?.message || "Failed to fetch organizations"
        );
        toast.error("Failed to fetch organizations");
      } finally {
        setIsFetching(false);
      }
    };

    fetchOrgs();
  }, [auth.user?.access_token]);

  // Handle selection of orgs
  const toggleOrgSelection = (orgId: number) => {
    if (selectedOrgs.includes(orgId)) {
      setSelectedOrgs(selectedOrgs.filter((id) => id !== orgId));
    } else {
      setSelectedOrgs([...selectedOrgs, orgId]);
    }
  };

  // Toggle all selections
  const toggleAllSelection = () => {
    if (selectedOrgs.length === orgs.length) {
      setSelectedOrgs([]);
    } else {
      setSelectedOrgs(orgs.map((org) => org.id));
    }
  };

  // Add new organization
  const handleAddOrg = async () => {
    if (!auth.user?.access_token) {
      toast.error("You must be authenticated to perform this action");
      return;
    }

    try {
      setIsLoading(true);

      // Call the API to create the organization
      await api.createOrg(auth.user.access_token, newOrg.slug);

      // Refresh the organization list
      const updatedOrgs = await api.getOrgs(auth.user.access_token);
      setOrgs(updatedOrgs);

      setNewOrg({ slug: "" });
      setIsAddOrgDialogOpen(false);

      toast.success(`Organization ${newOrg.slug} created successfully`);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(
        error.response?.data?.message || "Failed to create organization"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected organizations
  const handleDeleteSelected = async () => {
    if (!auth.user?.access_token) {
      toast.error("You must be authenticated to perform this action");
      return;
    }

    try {
      // Delete organizations one by one
      for (const orgId of selectedOrgs) {
        await api.deleteOrg(auth.user.access_token, orgId);
      }

      // Update local state
      setOrgs(orgs.filter((org) => !selectedOrgs.includes(org.id)));
      setSelectedOrgs([]);

      toast.success(
        `${selectedOrgs.length} organization(s) deleted successfully`
      );
    } catch (error: any) {
      console.error("Error deleting organizations:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete organizations"
      );
    }
  };

  // Delete a single organization
  const handleDeleteOrg = async (orgId: number) => {
    if (!auth.user?.access_token) {
      toast.error("You must be authenticated to perform this action");
      return;
    }

    try {
      await api.deleteOrg(auth.user.access_token, orgId);
      setOrgs(orgs.filter((org) => org.id !== orgId));
      setSelectedOrgs(selectedOrgs.filter((id) => id !== orgId));
      toast.success("Organization deleted successfully");
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete organization"
      );
    }
  };

  // Validate slug format for the form
  const isValidSlug = (slug: string) => {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Organizations</h2>
        <div className="space-x-2">
          {selectedOrgs.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </Button>
          )}
          <Dialog
            open={isAddOrgDialogOpen}
            onOpenChange={setIsAddOrgDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">Add Organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Organization</DialogTitle>
                <DialogDescription>
                  Add a new organization to the system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="slug" className="text-right">
                    Slug
                  </Label>
                  <div className="col-span-3 space-y-1">
                    <Input
                      id="slug"
                      value={newOrg.slug}
                      onChange={(e) =>
                        setNewOrg({
                          ...newOrg,
                          slug: e.target.value.toLowerCase(),
                        })
                      }
                      placeholder="my-organization"
                    />
                    {newOrg.slug && !isValidSlug(newOrg.slug) && (
                      <p className="text-xs text-destructive">
                        Slug can only contain lowercase letters, numbers, and
                        hyphens
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddOrg}
                  disabled={
                    isLoading || !newOrg.slug || !isValidSlug(newOrg.slug)
                  }
                >
                  {isLoading ? "Creating..." : "Add Organization"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isFetching ? (
        <div className="flex justify-center py-8">
          <p>Loading organizations...</p>
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedOrgs.length === orgs.length && orgs.length > 0
                    }
                    onCheckedChange={toggleAllSelection}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No organizations found
                  </TableCell>
                </TableRow>
              ) : (
                orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrgs.includes(org.id)}
                        onCheckedChange={() => toggleOrgSelection(org.id)}
                        aria-label={`Select organization ${org.slug}`}
                      />
                    </TableCell>
                    <TableCell>{org.slug}</TableCell>
                    <TableCell>
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteOrg(org.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
