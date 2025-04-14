import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Job, deleteJob, getJobs } from "../../api/jobs";
import { getSelf } from "../../api/self";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
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
  const [isAdmin, setIsAdmin] = useState(false);

  const handleDeleteJob = async (jobId: number) => {
    if (!auth.user?.access_token) return;

    try {
      const result = await deleteJob(auth.user.access_token, jobId);
      // Update the local state to reflect the job as archived
      setJobs(
        jobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                deletedById: result.data.deletedById,
                deletedAt: result.data.deletedAt,
              }
            : job
        )
      );
      toast.success("Job archived successfully");
    } catch (err: any) {
      console.error("Error archiving job:", err);
      // Check if this is a "Job already deleted" error
      if (err.response?.data?.message === "Job already deleted") {
        toast.error("This job has already been archived");

        // Refresh jobs list to ensure UI is in sync with server state
        if (auth.user?.access_token) {
          try {
            const fetchedJobs = await getJobs(auth.user.access_token);
            setJobs(fetchedJobs);
          } catch (refreshErr) {
            console.error("Error refreshing jobs:", refreshErr);
          }
        }
      } else {
        toast.error("Failed to archive job");
      }
    }
  };

  // Calculate completion percentage for a job
  const getCompletionPercentage = (job: Job) => {
    if (!job.totalTasks || job.totalTasks === 0) return 0;
    return Math.round(((job.completedTasks || 0) / job.totalTasks) * 100);
  };

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

  // Check if user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!auth.user?.access_token) return;

      try {
        const selfData = await getSelf(auth.user.access_token);
        // User is admin if they are a superadmin or have admin role in any organization
        const isSuperAdmin = Boolean(selfData.user.superadmin);
        const isOrgAdmin = selfData.memberships.some(
          (membership) => membership.isAdmin
        );
        setIsAdmin(isSuperAdmin || isOrgAdmin);
      } catch (err) {
        console.error("Error checking admin status:", err);
      }
    };

    checkAdminStatus();
  }, [auth.user?.access_token]);

  // Filter out soft-deleted jobs in the UI
  // We need to verify the job doesn't have a deletedAt timestamp
  const activeJobs = jobs.filter(
    (job) => !job.deletedAt && job.deletedById === null
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Jobs</h1>
        {isAdmin && (
          <Button asChild>
            <Link to="/jobs/create">Create New Job</Link>
          </Button>
        )}
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
                <TableHead>Organization</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Tag Type</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead>% Complete</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeJobs.length > 0 ? (
                activeJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.id}</TableCell>
                    <TableCell className="font-medium">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {job.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.orgSlug}</Badge>
                    </TableCell>
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
                        {job.labels && Array.isArray(job.labels) ? (
                          <>
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
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            No labels
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 w-[100px]">
                        <div className="text-xs text-right">
                          {getCompletionPercentage(job)}%
                        </div>
                        <Progress
                          value={getCompletionPercentage(job)}
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {job.completedTasks || 0} / {job.totalTasks || 0}{" "}
                          tasks
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/jobs/${job.id}`}>View Details</Link>
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                Archive
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure you want to archive this job?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This job will be archived and will no longer
                                  appear in the jobs list. All associated tasks
                                  will remain in the database but will not be
                                  accessible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteJob(job.id)}
                                >
                                  Archive Job
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
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
