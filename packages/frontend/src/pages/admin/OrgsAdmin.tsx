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

// Mock data
const mockOrgs = [
  { id: 1, slug: "acme-corp", createdAt: "2023-01-01" },
  { id: 2, slug: "example-inc", createdAt: "2023-01-02" },
  { id: 3, slug: "test-org", createdAt: "2023-01-03" },
];

export default function OrgsAdmin() {
  const [orgs, setOrgs] = useState(mockOrgs);
  const [selectedOrgs, setSelectedOrgs] = useState<number[]>([]);
  const [newOrg, setNewOrg] = useState({ slug: "" });
  const [isAddOrgDialogOpen, setIsAddOrgDialogOpen] = useState(false);

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

  // Add new org
  const handleAddOrg = () => {
    const newId = Math.max(...orgs.map((o) => o.id)) + 1;
    const org = {
      id: newId,
      slug: newOrg.slug,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setOrgs([...orgs, org]);
    setNewOrg({ slug: "" });
    setIsAddOrgDialogOpen(false);
  };

  // Delete selected orgs
  const handleDeleteSelected = () => {
    setOrgs(orgs.filter((org) => !selectedOrgs.includes(org.id)));
    setSelectedOrgs([]);
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
                  <Input
                    id="slug"
                    className="col-span-3"
                    value={newOrg.slug}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, slug: e.target.value })
                    }
                    placeholder="my-organization"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddOrg}>Add Organization</Button>
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
            {orgs.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrgs.includes(org.id)}
                    onCheckedChange={() => toggleOrgSelection(org.id)}
                    aria-label={`Select organization ${org.slug}`}
                  />
                </TableCell>
                <TableCell>{org.slug}</TableCell>
                <TableCell>{org.createdAt}</TableCell>
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
