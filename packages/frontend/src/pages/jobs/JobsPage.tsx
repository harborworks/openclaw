import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

// Mock data for jobs
const mockJobs = [
  {
    id: 1,
    name: "Car Detection",
    dataType: "image",
    tagType: "bounding_box",
    labels: ["car", "truck", "bus", "motorcycle"],
    createdAt: "2023-04-01T12:00:00Z",
  },
  {
    id: 2,
    name: "Animal Classification",
    dataType: "image",
    tagType: "category",
    labels: ["dog", "cat", "bird", "horse"],
    createdAt: "2023-04-02T15:30:00Z",
  },
  {
    id: 3,
    name: "Video Segments",
    dataType: "video",
    tagType: "time_segments",
    labels: ["action", "dialogue", "scene change"],
    createdAt: "2023-04-03T09:15:00Z",
  },
];

export default function JobsPage() {
  const [jobs] = useState(mockJobs);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Management</h1>
        <Button asChild>
          <Link to="/jobs/create">Create New Job</Link>
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Data Type</TableHead>
              <TableHead>Tag Type</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.id}</TableCell>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        job.dataType === "image" ? "default" : "secondary"
                      }
                    >
                      {job.dataType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.tagType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {job.labels.slice(0, 3).map((label, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                      {job.labels.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{job.labels.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-6 text-muted-foreground"
                >
                  No jobs found. Create your first job to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
