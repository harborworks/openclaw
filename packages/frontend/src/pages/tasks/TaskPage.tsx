import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Task, completeTask, getTask } from "../../api/jobs";
import { getUserById } from "../../api/users";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import VideoPlayer from "../../components/video/VideoPlayer";

export default function TaskPage() {
  const { jobId, taskId } = useParams<{ jobId: string; taskId: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [assignedUserEmail, setAssignedUserEmail] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      if (!auth.user?.access_token || !jobId || !taskId) return;

      try {
        setIsLoading(true);
        setError(null);

        const jobIdNum = parseInt(jobId, 10);
        const taskIdNum = parseInt(taskId, 10);

        if (isNaN(jobIdNum) || isNaN(taskIdNum)) {
          setError("Invalid job ID or task ID");
          return;
        }

        // Fetch the task
        const taskData = await getTask(
          auth.user.access_token,
          jobIdNum,
          taskIdNum
        );
        setTask(taskData);

        // If task is assigned, fetch user information
        if (taskData.assignedToId) {
          await fetchUserEmail(taskData.assignedToId);
        }
      } catch (err) {
        console.error("Error fetching task:", err);
        setError("Failed to fetch task");
        toast.error("Failed to fetch task");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [auth.user?.access_token, jobId, taskId]);

  // Fetch the user's email by ID
  const fetchUserEmail = async (userId: number) => {
    if (!auth.user?.access_token) return;

    setIsLoadingUser(true);
    try {
      const user = await getUserById(auth.user.access_token, userId);
      setAssignedUserEmail(user.email);
    } catch (err) {
      console.error(`Error fetching user ${userId}:`, err);
      setAssignedUserEmail(`Unknown User (${userId})`);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Get task status for display
  const getTaskStatus = () => {
    if (!task) return null;

    if (task.completedAt) {
      return <Badge className="bg-green-500">Completed</Badge>;
    } else if (task.assignedToId) {
      return <Badge className="bg-amber-500">In Progress</Badge>;
    } else {
      return <Badge variant="outline">Available</Badge>;
    }
  };

  // Check if the task URL is a video (HLS/m3u8)
  const isVideoUrl = (url: string) => {
    return url.includes(".m3u8");
  };

  const handleCompleteTask = async () => {
    if (!auth.user?.access_token || !jobId || !taskId || !task) return;

    try {
      setIsCompletingTask(true);

      const jobIdNum = parseInt(jobId, 10);
      const taskIdNum = parseInt(taskId, 10);

      if (isNaN(jobIdNum) || isNaN(taskIdNum)) {
        toast.error("Invalid job ID or task ID");
        return;
      }

      // Complete the task
      await completeTask(auth.user.access_token, jobIdNum, taskIdNum);

      toast.success("Task completed successfully");
      navigate(`/jobs/${jobId}`);
    } catch (err) {
      console.error("Error completing task:", err);
      toast.error("Failed to complete task");
    } finally {
      setIsCompletingTask(false);
    }
  };

  return (
    <div className="container mx-auto py-4">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-red-500">{error}</div>
      ) : task ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Video player container with aspect ratio */}
            <div className="w-full bg-gray-50 rounded-lg overflow-hidden min-h-[70vh] flex items-center justify-center">
              {isVideoUrl(task.url) ? (
                <div className="relative w-full aspect-video max-h-[70vh]">
                  <VideoPlayer
                    src={`https://cors-anywhere-zq.herokuapp.com/${task.url}`}
                    controls={true}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              ) : (
                <img
                  src={task.url}
                  alt="Task content"
                  className="max-h-[70vh] object-contain"
                />
              )}
            </div>

            <Separator />

            {/* Navigation buttons in a single row */}
            <div className="flex justify-between items-center px-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/jobs/${jobId}`)}
              >
                Back to Job
              </Button>

              <div className="space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/jobs/${jobId}`)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteTask}
                  disabled={isCompletingTask}
                >
                  {isCompletingTask ? "Completing..." : "Complete Task"}
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar with task metadata */}
          <div className="lg:col-span-3">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Task ID</div>
                  <div className="font-medium">#{task.id}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Job ID</div>
                  <div className="font-medium">#{task.jobId}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getTaskStatus()}</div>
                </div>

                {task.assignedToId && (
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Assigned to
                    </div>
                    <div>
                      {isLoadingUser ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        assignedUserEmail
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          Task not found
        </div>
      )}
    </div>
  );
}
