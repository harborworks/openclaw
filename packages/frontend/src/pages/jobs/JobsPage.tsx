import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Job, getJobs } from "../../api/jobs";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

export default function JobsPage() {
  const auth = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!auth.user?.access_token) return;

      try {
        setIsLoading(true);
        setError(null);
        const fetchedJobs = await getJobs(auth.user.access_token);
        setJobs(fetchedJobs);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to fetch jobs");
        toast.error("Failed to fetch jobs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [auth.user?.access_token]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Management</h1>
        <Button asChild>
          <Link to="/jobs/create">Create New Job</Link>
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">{error}</div>
        ) : (
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
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Navigate to job details/edit page
                        }}
                      >
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
        )}
      </div>
    </div>
  );
}
