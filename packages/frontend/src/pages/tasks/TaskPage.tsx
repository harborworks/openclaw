import { zodResolver } from "@hookform/resolvers/zod";
import { Keyboard, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useHotkeys } from "react-hotkeys-hook";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as z from "zod";
import {
  BoundingBoxTag,
  completeTask,
  createBoundingBoxTag,
  createTag,
  deleteTag,
  getJobLabels,
  getTask,
  getTaskTags,
  Tag,
  Task,
  TimeSegmentTag,
  updateTag
} from "../../api/jobs";
import { getUserById } from "../../api/users";
import { BoundingBox, BoundingBoxAnnotator } from "../../components/BoundingBoxAnnotator";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../../components/ui/table";

// Lazy load the VideoPlayer component
const VideoPlayer = lazy(() => import("../../components/video/VideoPlayer"));

// Lazy load the TagEditor component
const TagEditor = lazy(() => import("./components/TagEditor"));

// Schema for time segment tag
const timeSegmentTagSchema = z.object({
  label: z.string().min(1, "Label is required"),
  timeRange: z.array(z.number()).length(2),
});

type TimeSegmentTagFormValues = z.infer<typeof timeSegmentTagSchema>;

// Type guard for time segment tag
function isTimeSegmentTag(tag: Tag): tag is TimeSegmentTag {
  return tag.tagType === "time-segments";
}

// Type guard for bounding box tag
function isBoundingBoxTag(tag: Tag): tag is BoundingBoxTag {
  return tag.tagType === "bounding-boxes";
}

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
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editingTag, setEditingTag] = useState<TimeSegmentTag | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [tags, setTags] = useState<Tag[]>([]);
  const [jobLabels, setJobLabels] = useState<string[]>([]);
  const [jobTagType, setJobTagType] = useState<string>("");
  const [isDeletingTag, setIsDeletingTag] = useState<number | null>(null);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Add keyboard shortcuts for video navigation
  useHotkeys(
    "left",
    () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(
          0,
          videoRef.current.currentTime - 1
        );
      }
    },
    { enableOnFormTags: true },
    [videoRef]
  );

  useHotkeys(
    "right",
    () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(
          videoDuration,
          videoRef.current.currentTime + 1
        );
      }
    },
    { enableOnFormTags: true },
    [videoRef, videoDuration]
  );

  useHotkeys(
    "shift+left",
    () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(
          0,
          videoRef.current.currentTime - 5
        );
      }
    },
    { enableOnFormTags: true },
    [videoRef]
  );

  useHotkeys(
    "shift+right",
    () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(
          videoDuration,
          videoRef.current.currentTime + 5
        );
      }
    },
    { enableOnFormTags: true },
    [videoRef, videoDuration]
  );

  // Form for creating time segment tags
  const form = useForm<TimeSegmentTagFormValues>({
    resolver: zodResolver(timeSegmentTagSchema),
    defaultValues: {
      label: "",
      timeRange: [0, 100],
    },
  });

  // Load task data
  useEffect(() => {
    const loadTaskData = async () => {
      if (!auth.user?.access_token || !jobId || !taskId) return;

      const jobIdNum = parseInt(jobId, 10);
      const taskIdNum = parseInt(taskId, 10);

      if (isNaN(jobIdNum) || isNaN(taskIdNum)) {
        setError("Invalid job ID or task ID");
        setIsLoading(false);
        return;
      }

      try {
        // Load job data first to get tag type
        const jobData = await getJobLabels(auth.user.access_token, jobIdNum);
        setJobLabels(jobData.labels);
        setJobTagType(jobData.tagType);

        // Then load task data
        const taskData = await getTask(auth.user.access_token, jobIdNum, taskIdNum);
        setTask(taskData);

        // Load task tags
        const tagsData = await getTaskTags(auth.user.access_token, jobIdNum, taskIdNum);
        setTags(tagsData);

        // If task is assigned, load assigned user's email
        if (taskData.assignedToId) {
          fetchUserEmail(taskData.assignedToId);
        }
      } catch (err) {
        console.error("Error loading task data:", err);
        setError("Failed to load task data");
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskData();
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

  // Seek video to a specific time
  const seekVideoToTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  };

  // Handle slider change
  const handleTimeRangeChange = (values: number[]) => {
    // Update the form value
    form.setValue("timeRange", values);

    // Seek video to the start time
    const startTimeSeconds = percentToSeconds(values[0]);
    seekVideoToTime(startTimeSeconds);
  };

  // Get current video time and convert to percentage for slider
  const getCurrentVideoTime = () => {
    if (!videoRef.current) return 0;
    return secondsToPercent(videoRef.current.currentTime);
  };

  // Set start time to current video position
  const setStartFromVideo = () => {
    if (!videoRef.current) return;

    const currentPercent = getCurrentVideoTime();
    const [, endPercent] = form.getValues("timeRange");

    // Make sure start is not after end
    if (currentPercent < endPercent) {
      form.setValue("timeRange", [currentPercent, endPercent]);
    } else {
      toast.error("Start time must be before end time");
    }
  };

  // Set end time to current video position
  const setEndFromVideo = () => {
    if (!videoRef.current) return;

    const currentPercent = getCurrentVideoTime();
    const [startPercent] = form.getValues("timeRange");

    // Make sure end is not before start
    if (currentPercent > startPercent) {
      form.setValue("timeRange", [startPercent, currentPercent]);
    } else {
      toast.error("End time must be after start time");
    }
  };

  // Handle form submission
  const onSubmit = async (values: TimeSegmentTagFormValues) => {
    if (!auth.user?.access_token || !jobId || !taskId || !task) return;

    const jobIdNum = parseInt(jobId, 10);
    const taskIdNum = parseInt(taskId, 10);

    if (isNaN(jobIdNum) || isNaN(taskIdNum)) {
      toast.error("Invalid job ID or task ID");
      return;
    }

    setIsSavingTag(true);

    try {
      const [startPercent, endPercent] = values.timeRange;
      const startTime = percentToSeconds(startPercent);
      const endTime = percentToSeconds(endPercent);

      // Create the tag data
      const tagData = {
        tagType: "time-segments" as const,
        values: {
          label: values.label,
          start: startTime,
          end: endTime,
        },
      };

      if (editingTag) {
        // Edit existing tag
        const updatedTag = await updateTag(
          auth.user.access_token,
          editingTag.id as number,
          tagData
        );

        // Update the tags list
        const updatedTags = tags.map((tag) =>
          tag.id === editingTag.id ? updatedTag : tag
        );
        setTags(updatedTags);
      } else {
        // Create new tag
        const createdTag = await createTag(
          auth.user.access_token,
          jobIdNum,
          taskIdNum,
          tagData
        );

        // Add the new tag to the list
        setTags([...tags, createdTag]);
      }

      // Reset form and close dialog
      form.reset();
      setShowTagEditor(false);
      setEditingTag(null);
    } catch (err) {
      console.error(`Error ${editingTag ? "updating" : "creating"} tag:`, err);
      toast.error(`Failed to ${editingTag ? "update" : "create"} tag`);
    } finally {
      setIsSavingTag(false);
    }
  };

  // Handle editing a tag
  const handleEditTag = (tag: Tag) => {
    if (!isTimeSegmentTag(tag)) return;
    
    // Convert start/end times back to slider percentages
    const startPercent = secondsToPercent(tag.values.start);
    const endPercent = secondsToPercent(tag.values.end);

    // Set form values
    form.setValue("label", tag.values.label);
    form.setValue("timeRange", [startPercent, endPercent]);

    // Set editing state
    setEditingTag(tag);
    setShowTagEditor(true);

    // Seek video to the start of the tag
    seekVideoToTime(tag.values.start);
  };

  // Handle tag deletion
  const handleDeleteTag = async (tagId: number) => {
    if (!auth.user?.access_token) return;

    setIsDeletingTag(tagId);

    try {
      await deleteTag(auth.user.access_token, tagId);

      // Update the tags list by removing the deleted tag
      setTags(tags.filter((tag) => tag.id !== tagId));

      // Remove the success toast
      toast.success("Tag deleted successfully");
    } catch (err) {
      console.error("Error deleting tag:", err);
      // Keep error toast as it's important for user feedback on failures
      toast.error("Failed to delete tag");
    } finally {
      setIsDeletingTag(null);
    }
  };

  // Floating Tag Editor UI
  const renderTagEditor = () => {
    return (
      <Suspense
        fallback={
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 w-[400px] z-10">
            Loading tag editor...
          </div>
        }
      >
        <TagEditor
          form={form}
          onSubmit={onSubmit}
          editingTag={editingTag}
          setShowTagEditor={setShowTagEditor}
          setEditingTag={setEditingTag}
          isSavingTag={isSavingTag}
          percentToSeconds={percentToSeconds}
          setStartFromVideo={setStartFromVideo}
          setEndFromVideo={setEndFromVideo}
          handleTimeRangeChange={handleTimeRangeChange}
          formatTime={formatTime}
          seekVideoToTime={seekVideoToTime}
          jobLabels={jobLabels}
        />
      </Suspense>
    );
  };

  // Add a function to handle saving bounding box tags
  const handleSaveBoundingBoxes = async () => {
    if (!auth.user?.access_token || !jobId || !taskId) return;
    const jobIdNum = parseInt(jobId, 10);
    const taskIdNum = parseInt(taskId, 10);

    try {
      setIsSavingTag(true);
      // Get existing box IDs to avoid duplicates
      const existingBoxIds = new Set(
        tags
          .filter((tag): tag is BoundingBoxTag => tag.tagType === "bounding-boxes")
          .map(tag => tag.values.id)
      );

      // Only create tags for new boxes that don't exist yet
      for (const box of boundingBoxes) {
        if (!existingBoxIds.has(box.id)) {
          await createBoundingBoxTag(
            auth.user.access_token,
            jobIdNum,
            taskIdNum,
            {
              tagType: "bounding-boxes",
              values: box
            }
          );
        }
      }
      // Refresh tags after saving
      const tagsData = await getTaskTags(auth.user.access_token, jobIdNum, taskIdNum);
      setTags(tagsData);
      toast.success("Bounding boxes saved");
      setBoundingBoxes([]);
    } catch (error) {
      console.error("Error saving bounding boxes:", error);
      toast.error("Failed to save bounding boxes");
    } finally {
      setIsSavingTag(false);
    }
  };

  // Compute all existing bounding boxes from tags
  const existingBoxes: BoundingBox[] = tags
    .filter((tag): tag is BoundingBoxTag => tag.tagType === "bounding-boxes")
    .map(tag => tag.values);

  // Merge with local (unsaved) boundingBoxes, avoiding duplicate IDs
  const allBoxes: BoundingBox[] = [
    ...existingBoxes,
    ...boundingBoxes.filter(
      (box) => !existingBoxes.some((b) => b.id === box.id)
    ),
  ];

  // Handle bounding box deletion
  const handleDeleteBoundingBox = async (boxId: string) => {
    if (!auth.user?.access_token || !jobId || !taskId) return;
    const jobIdNum = parseInt(jobId, 10);
    const taskIdNum = parseInt(taskId, 10);
    
    try {
      // Find the tag containing this box
      const tag = tags.find(t => 
        isBoundingBoxTag(t) && 
        t.values.id === boxId
      );

      if (tag) {
        await deleteTag(auth.user.access_token, tag.id as number);
        // Refresh tags after deletion
        const tagsData = await getTaskTags(auth.user.access_token, jobIdNum, taskIdNum);
        setTags(tagsData);
        // Also remove from local state if it exists there
        setBoundingBoxes(boxes => boxes.filter(box => box.id !== boxId));
      }
    } catch (error) {
      console.error("Error deleting bounding box:", error);
      toast.error("Failed to delete bounding box");
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
            {/* Image or video display */}
            <div className="w-full bg-gray-50 rounded-lg overflow-hidden min-h-[70vh] flex items-center justify-center">
              {isVideoUrl(task.url) ? (
                <div className="relative w-full aspect-video max-h-[70vh]">
                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading video player...</div>}>
                    <VideoPlayer
                      ref={videoRef}
                      src={`https://cors-anywhere-zq.herokuapp.com/${task.url}`}
                      controls={true}
                      className="absolute inset-0 w-full h-full"
                      onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                        const video = e.currentTarget;
                        setVideoDuration(video.duration);
                      }}
                    />
                  </Suspense>
                </div>
              ) : jobTagType === "bounding-boxes" ? (
                <div className="relative w-full h-[70vh]">
                  <BoundingBoxAnnotator
                    imageUrl={task.url}
                    boxes={allBoxes}
                    onChange={setBoundingBoxes}
                    labels={jobLabels}
                    localBoxIds={boundingBoxes.map((b) => b.id)}
                    onDeleteBox={handleDeleteBoundingBox}
                  />
                  <Button
                    className="absolute top-2 right-2 z-10"
                    onClick={handleSaveBoundingBoxes}
                    disabled={isSavingTag || boundingBoxes.length === 0}
                  >
                    {isSavingTag ? "Saving..." : "Save Bounding Boxes"}
                  </Button>
                </div>
              ) : (
                <img
                  src={task.url}
                  alt="Task content"
                  className="max-h-[70vh] object-contain"
                />
              )}
            </div>
            {/* Floating Tag Editor */}
            {showTagEditor && renderTagEditor()}
            <Separator />
            {/* Show bounding box tags if any */}
            {jobTagType === "bounding-boxes" && tags.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Saved Bounding Boxes</h3>
                <ul className="space-y-2">
                  {tags.map((tag) => (
                    isBoundingBoxTag(tag) ? (
                      <li key={tag.id} className="border rounded p-2">
                        <div className="flex flex-col text-xs">
                          <span><b>Label:</b> {tag.values.label}</span>
                          <span><b>x1:</b> {tag.values.x1}, <b>y1:</b> {tag.values.y1}</span>
                          <span><b>x2:</b> {tag.values.x2}, <b>y2:</b> {tag.values.y2}</span>
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(tag.id as number)}
                            disabled={isDeletingTag === tag.id}
                            className="h-8 w-8 p-0"
                          >
                            {isDeletingTag === tag.id ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            )}
                            <span className="sr-only">Delete tag</span>
                          </Button>
                        </div>
                      </li>
                    ) : null
                  ))}
                </ul>
              </div>
            )}
            {/* Show time segment tags if any */}
            {jobTagType === "time-segments" && tags.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Saved Time Segments</h3>
                <ul className="space-y-2">
                  {tags.map((tag) => (
                    isTimeSegmentTag(tag) ? (
                      <li key={tag.id} className="border rounded p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{tag.values.label}</span>
                          <span className="text-muted-foreground">
                            {`${formatTime(tag.values.start)} - ${formatTime(tag.values.end)}`}
                          </span>
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTag(tag)}
                            className="h-8 w-8 p-0"
                          >
                            <PencilIcon className="h-4 w-4 text-blue-500" />
                            <span className="sr-only">Edit tag</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(tag.id as number)}
                            disabled={isDeletingTag === tag.id}
                            className="h-8 w-8 p-0"
                          >
                            {isDeletingTag === tag.id ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            )}
                            <span className="sr-only">Delete tag</span>
                          </Button>
                        </div>
                      </li>
                    ) : null
                  ))}
                </ul>
              </div>
            )}
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
            <Card className="sticky top-4 bg-white z-10">
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {jobTagType !== "bounding-boxes" && (
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Keyboard Shortcuts
                    </div>
                    <div className="mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            <Keyboard className="h-4 w-4 mr-2" />
                            View Shortcuts
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[600px]">
                          <div className="space-y-2">
                            <h4 className="font-medium">Keyboard Shortcuts</h4>
                            <Separator />
                            <Table>
                              <TableBody>
                                <TableRow className="border-b-0">
                                  <TableCell className="py-1.5">
                                    <div className="bg-muted p-1 rounded text-xs min-w-8 text-center inline-block">
                                      ←
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1.5 pr-4">
                                    <span className="text-sm whitespace-nowrap">
                                      Rewind 1 second
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1.5">
                                    <div className="bg-muted p-1 rounded text-xs min-w-8 text-center inline-block">
                                      →
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1.5">
                                    <span className="text-sm whitespace-nowrap">
                                      Forward 1 second
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="border-b-0">
                                  <TableCell className="py-1.5">
                                    <div className="bg-muted p-1 px-2 rounded text-xs min-w-20 text-center inline-block">
                                      Shift + ←
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1.5 pr-4">
                                    <span className="text-sm whitespace-nowrap">
                                      Rewind 5 seconds
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1.5">
                                    <div className="bg-muted p-1 px-2 rounded text-xs min-w-20 text-center inline-block">
                                      Shift + →
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1.5">
                                    <span className="text-sm whitespace-nowrap">
                                      Forward 5 seconds
                                    </span>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tags</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTag(null);
                    form.reset();
                    setShowTagEditor(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="sr-only">Add tag</span>
                </Button>
              </CardHeader>
              <CardContent>
                {tags.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No tags created yet
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <ul className="space-y-2 pr-4">
                      {tags.map((tag) => (
                        isBoundingBoxTag(tag) ? (
                          <li key={tag.id} className="flex flex-col text-xs border-b pb-2">
                            <span><b>Label:</b> {tag.values.label}</span>
                            <span><b>x1:</b> {tag.values.x1}, <b>y1:</b> {tag.values.y1}</span>
                            <span><b>x2:</b> {tag.values.x2}, <b>y2:</b> {tag.values.y2}</span>
                          </li>
                        ) : isTimeSegmentTag(tag) ? (
                          <li
                            key={tag.id}
                            className="flex justify-between items-center text-sm border-b pb-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {tag.values.label}
                              </span>
                              <span className="text-muted-foreground">
                                {`${formatTime(tag.values.start)} - ${formatTime(tag.values.end)}`}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTag(tag)}
                                className="h-8 w-8 p-0"
                              >
                                <PencilIcon className="h-4 w-4 text-blue-500" />
                                <span className="sr-only">Edit tag</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTag(tag.id as number)}
                                disabled={isDeletingTag === tag.id}
                                className="h-8 w-8 p-0"
                              >
                                {isDeletingTag === tag.id ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <TrashIcon className="h-4 w-4 text-red-500" />
                                )}
                                <span className="sr-only">Delete tag</span>
                              </Button>
                            </div>
                          </li>
                        ) : null
                      ))}
                    </ul>
                  </ScrollArea>
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
