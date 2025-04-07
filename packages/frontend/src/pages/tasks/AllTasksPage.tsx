import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Job, Pagination, Task, getAllJobTasks, getJob } from "../../api/jobs";
import { getUserById } from "../../api/users";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Pagination as PaginationComponent,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

// Map to store user emails by user ID
interface UserMap {
  [userId: number]: string;
}

export default function AllTasksPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<UserMap>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchData = async (page: number = 1) => {
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

      // Fetch job details if we don't have them yet
      if (!job) {
        const jobData = await getJob(auth.user.access_token, jobIdNum);
        setJob(jobData);
      }

      // Fetch tasks with pagination
      const { tasks: taskData, pagination: paginationData } =
        await getAllJobTasks(
          auth.user.access_token,
          jobIdNum,
          page,
          10 // Page size
        );

      setTasks(taskData);
      setPagination(paginationData);
      setCurrentPage(page);

      // Fetch user information for assigned users
      await fetchUserEmails(taskData);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);

      // Show appropriate error message for permission issues
      if (err.response?.status === 403) {
        setError(
          "You don't have permission to view all tasks for this job. Only organization admins or superadmins can access this page."
        );
        toast.error("Permission denied");
      } else {
        setError("Failed to fetch tasks");
        toast.error("Failed to fetch tasks");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch user emails for assigned tasks
  const fetchUserEmails = async (tasks: Task[]) => {
    if (!auth.user?.access_token) return;

    // Get unique user IDs from tasks
    const userIds: number[] = [];
    tasks.forEach((task) => {
      if (task.assignedToId && !userMap[task.assignedToId]) {
        userIds.push(task.assignedToId);
      }
    });

    // If there are no new user IDs to fetch, return early
    if (userIds.length === 0) return;

    setLoadingUsers(true);

    try {
      // Fetch each user's information and build the map
      const newUserMap = { ...userMap };

      for (const userId of userIds) {
        try {
          const user = await getUserById(auth.user.access_token, userId);
          newUserMap[userId] = user.email;
        } catch (err) {
          console.error(`Error fetching user ${userId}:`, err);
          newUserMap[userId] = `Unknown User (${userId})`;
        }
      }

      setUserMap(newUserMap);
    } catch (err) {
      console.error("Error fetching user information:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [auth.user?.access_token, jobId]);

  const handlePageChange = (page: number) => {
    fetchData(page);
  };

  const getTaskStatusBadge = (task: Task) => {
    if (task.completedAt) {
      return <Badge className="bg-green-500">Completed</Badge>;
    } else if (task.assignedToId) {
      return <Badge className="bg-amber-500">In Progress</Badge>;
    } else {
      return <Badge variant="outline">Available</Badge>;
    }
  };

  // Get user email or placeholder from the userMap
  const getUserEmail = (userId: number | null) => {
    if (!userId) return "—";

    if (userMap[userId]) {
      return userMap[userId];
    }

    return loadingUsers ? <Skeleton className="h-4 w-24" /> : `User #${userId}`;
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { page, totalPages } = pagination;
    const maxPagesToShow = 5;

    // Calculate the range of page numbers to display
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <PaginationComponent>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(page - 1)}
              className={
                page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
              }
            />
          </PaginationItem>

          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)}>
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {pageNumbers.map((num) => (
            <PaginationItem key={num}>
              <PaginationLink
                onClick={() => handlePageChange(num)}
                isActive={num === page}
              >
                {num}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(page + 1)}
              className={
                page >= totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </PaginationComponent>
    );
  };

  const viewTask = (taskId: number) => {
    navigate(`/jobs/${jobId}/tasks/${taskId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate(`/jobs/${jobId}`)}>
          Back to Job
        </Button>
      </div>

      {isLoading && !tasks.length ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-red-500">{error}</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">All Tasks</CardTitle>
              <CardDescription>
                {job?.name} - Viewing all tasks including completed and
                in-progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          No tasks found
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.id}</TableCell>
                          <TableCell>{getTaskStatusBadge(task)}</TableCell>
                          <TableCell>
                            {getUserEmail(task.assignedToId)}
                          </TableCell>
                          <TableCell>
                            {new Date(task.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewTask(task.id)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  {renderPagination()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
