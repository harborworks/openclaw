import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Job,
  JobTaskStats,
  getJob,
  getJobTaskStats,
  getNextAvailableTask,
} from "../../api/jobs";
import { getSelf } from "../../api/self";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Skeleton } from "../../components/ui/skeleton";

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [taskStats, setTaskStats] = useState<JobTaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingNextTask, setIsLoadingNextTask] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const fetchJobAndStats = async () => {
      if (!auth.user?.access_token || !jobId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Parse jobId to number
        const jobIdNum = parseInt(jobId, 10);
        if (isNaN(jobIdNum)) {
          setError("Invalid job ID");
          return;
        }

        // Fetch job details
        const jobData = await getJob(auth.user.access_token, jobIdNum);
        setJob(jobData);

        // Fetch task statistics
        const stats = await getJobTaskStats(auth.user.access_token, jobIdNum);
        setTaskStats(stats);

        // Check if user has admin rights
        const selfData = await getSelf(auth.user.access_token);
        const isSuperAdmin = Boolean(selfData.user.superadmin);
        setIsSuperAdmin(isSuperAdmin);

        // Check if user is an admin of this job's organization
        // UserMembership extends Org, so id is the organization id
        const isOrgAdmin = selfData.memberships.some(
          (membership) => membership.id === jobData.orgId && membership.isAdmin
        );
        setIsAdmin(isOrgAdmin || isSuperAdmin);
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("Failed to fetch job details");
        toast.error("Failed to fetch job details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobAndStats();
  }, [auth.user?.access_token, jobId]);

  // Function to get the next available task
  const handleNextTask = async () => {
    if (!auth.user?.access_token || !jobId) return;

    try {
      setIsLoadingNextTask(true);

      // Parse jobId to number
      const jobIdNum = parseInt(jobId, 10);
      if (isNaN(jobIdNum)) {
        toast.error("Invalid job ID");
        return;
      }

      // Get the next available task
      const nextTask = await getNextAvailableTask(
        auth.user.access_token,
        jobIdNum
      );

      // Navigate to the task page
      navigate(`/jobs/${jobId}/tasks/${nextTask.id}`);
    } catch (err: any) {
      console.error("Error getting next task:", err);

      // Show appropriate error message
      if (err.response?.status === 404) {
        toast.error("No available tasks found");
      } else {
        toast.error("Failed to get next task");
      }
    } finally {
      setIsLoadingNextTask(false);
    }
  };

  // Handle viewing all tasks
  const handleViewAllTasks = () => {
    if (!jobId) return;
    navigate(`/jobs/${jobId}/all-tasks`);
  };

  // Calculate completion percentage
  const completionPercentage =
    taskStats && taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/jobs")}>
            Back to Jobs
          </Button>
          <div className="space-x-2 flex">
            {isAdmin && (
              <Button variant="outline" onClick={handleViewAllTasks}>
                View All Tasks
              </Button>
            )}
            {job && taskStats && taskStats.total > taskStats.completed && (
              <Button onClick={handleNextTask} disabled={isLoadingNextTask}>
                {isLoadingNextTask ? "Loading..." : "Next Available Task"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-red-500">{error}</div>
      ) : job ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{job.name}</CardTitle>
              <CardDescription>
                Job ID: {job.id}
                <span className="ml-4">
                  Organization: <Badge variant="outline">{job.orgSlug}</Badge>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Data Type
                  </h3>
                  <Badge
                    className="mt-1"
                    variant={job.dataType === "image" ? "default" : "secondary"}
                  >
                    {job.dataType}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Tag Type
                  </h3>
                  <Badge className="mt-1" variant="outline">
                    {job.tagType}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p className="mt-1">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Last Updated
                  </h3>
                  <p className="mt-1">
                    {new Date(job.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Labels</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.labels.map((label, i) => (
                    <Badge key={i} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task Statistics</CardTitle>
              <CardDescription>
                Overview of task completion progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {taskStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Tasks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{taskStats.total}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Completed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-600">
                          {taskStats.completed}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">In Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-amber-600">
                          {taskStats.in_progress}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        Completion Progress
                      </span>
                      <span className="text-sm font-medium">
                        {completionPercentage}%
                      </span>
                    </div>
                    <Progress value={completionPercentage} className="h-2" />
                  </div>
                </>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No task statistics available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          Job not found
        </div>
      )}
    </div>
  );
}
