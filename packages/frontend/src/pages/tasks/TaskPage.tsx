import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as z from "zod";
import { Task, completeTask, getJobLabels, getTask } from "../../api/jobs";
import { getUserById } from "../../api/users";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { Slider } from "../../components/ui/slider";
import VideoPlayer from "../../components/video/VideoPlayer";

// Schema for time segment tag
const timeSegmentTagSchema = z.object({
  label: z.string().min(1, "Label is required"),
  timeRange: z.array(z.number()).length(2),
});

type TimeSegmentTagFormValues = z.infer<typeof timeSegmentTagSchema>;

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
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [open, setOpen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [tags, setTags] = useState<
    Array<{ label: string; start: number; end: number }>
  >([]);
  const [jobLabels, setJobLabels] = useState<string[]>([]);

  // Form for creating time segment tags
  const form = useForm<TimeSegmentTagFormValues>({
    resolver: zodResolver(timeSegmentTagSchema),
    defaultValues: {
      label: "",
      timeRange: [0, 100],
    },
  });

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

        // Fetch job labels
        await fetchJobLabels(jobIdNum);

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

  // Fetch job labels
  const fetchJobLabels = async (jobId: number) => {
    if (!auth.user?.access_token) return;

    setIsLoadingLabels(true);
    try {
      const response = await getJobLabels(auth.user.access_token, jobId);
      setJobLabels(response.labels);
    } catch (err) {
      console.error("Error fetching job labels:", err);
    } finally {
      setIsLoadingLabels(false);
    }
  };

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

  // Convert slider percentage to actual video time in seconds
  const percentToSeconds = (percent: number) => {
    return (percent / 100) * videoDuration;
  };

  // Convert actual video time to slider percentage
  const secondsToPercent = (seconds: number) => {
    if (!videoDuration) return 0;
    return (seconds / videoDuration) * 100;
  };

  // Format seconds as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle form submission
  const onSubmit = (values: TimeSegmentTagFormValues) => {
    const [startPercent, endPercent] = values.timeRange;
    const startTime = percentToSeconds(startPercent);
    const endTime = percentToSeconds(endPercent);

    // Add the new tag
    setTags([
      ...tags,
      {
        label: values.label,
        start: startTime,
        end: endTime,
      },
    ]);

    // Reset form and close dialog
    form.reset();
    setOpen(false);

    toast.success(`Tag "${values.label}" created successfully`);
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
                    onLoadedMetadata={(
                      e: React.SyntheticEvent<HTMLVideoElement>
                    ) => {
                      const video = e.currentTarget;
                      setVideoDuration(video.duration);
                    }}
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

            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tags</CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <PlusIcon className="h-4 w-4" />
                      <span className="sr-only">Add tag</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create Time Segment Tag</DialogTitle>
                      <DialogDescription>
                        Set the start and end times for this tag.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit as any)}
                        className="space-y-4"
                      >
                        <FormField
                          control={form.control}
                          name="timeRange"
                          render={({ field }) => (
                            <FormItem className="space-y-4">
                              <FormLabel>Time Range</FormLabel>
                              <div className="pt-4">
                                <Slider
                                  defaultValue={field.value}
                                  max={100}
                                  step={0.1}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className="mb-2"
                                />
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <div>
                                  Start:{" "}
                                  {formatTime(percentToSeconds(field.value[0]))}
                                </div>
                                <div>
                                  End:{" "}
                                  {formatTime(percentToSeconds(field.value[1]))}
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="label"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label</FormLabel>
                              {jobLabels.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {jobLabels.map((label) => (
                                    <Button
                                      key={label}
                                      type="button"
                                      variant={
                                        field.value === label
                                          ? "default"
                                          : "outline"
                                      }
                                      onClick={() => field.onChange(label)}
                                      className="justify-start"
                                    >
                                      {label}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <FormControl>
                                  <Input
                                    placeholder="Enter tag label"
                                    {...field}
                                  />
                                </FormControl>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit">Create Tag</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {tags.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No tags created yet
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {tags.map((tag, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="font-medium">{tag.label}</span>
                        <span className="text-muted-foreground">
                          {formatTime(tag.start)} - {formatTime(tag.end)}
                        </span>
                      </li>
                    ))}
                  </ul>
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
