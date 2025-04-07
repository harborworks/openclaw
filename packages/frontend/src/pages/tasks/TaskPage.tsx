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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate(`/jobs/${jobId}`)}>
          Back to Job
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-red-500">{error}</div>
      ) : task ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Task #{task.id}</CardTitle>
              <CardDescription>
                Job ID: {task.jobId}
                <div className="mt-2 flex items-center gap-2">
                  <span>Status: {getTaskStatus()}</span>
                  {task.assignedToId && (
                    <span className="ml-4">
                      Assigned to:{" "}
                      {isLoadingUser ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : (
                        assignedUserEmail
                      )}
                    </span>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Task content goes here - will depend on task type */}
              <div className="flex justify-center">
                <img
                  src={task.url}
                  alt="Task content"
                  className="max-h-[600px] object-contain rounded-md border border-gray-200 shadow-sm"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                onClick={() => navigate(`/jobs/${jobId}`)}
              >
                Cancel
              </Button>
              <Button onClick={handleCompleteTask} disabled={isCompletingTask}>
                {isCompletingTask ? "Completing..." : "Complete Task"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          Task not found
        </div>
      )}
    </div>
  );
}
