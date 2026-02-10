import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import * as api from "../api";
import type { Task } from "../api/tasks";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { TaskDetailSheet } from "../components/TaskDetailSheet";
import { CreateTaskDialog } from "../components/CreateTaskDialog";

const COLUMNS = [
  { key: "inbox", label: "Inbox" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "ready_to_deploy", label: "Ready to Deploy" },
  { key: "done", label: "Done" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function BoardPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.getTasks(),
    refetchInterval: 3000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.getAgents(),
    refetchInterval: 3000,
  });

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const getAssigneeNames = (task: Task) => {
    return (task.assigneeIds || [])
      .map((id) => agentMap.get(id)?.name || `#${id}`)
      .join(", ");
  };

  const tasksByStatus = (status: string) =>
    tasks.filter((t) => t.status === status);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Board</h1>
          <Badge variant="secondary" className="text-xs">
            {tasks.length} tasks
          </Badge>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New Task
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto bg-muted/30">
        <div className="flex gap-4 p-5 h-full min-w-max">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.key);
            return (
              <div
                key={col.key}
                className="flex flex-col w-80 bg-background rounded-xl border shadow-sm"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge
                    variant="secondary"
                    className="text-xs tabular-nums h-5 min-w-5 flex items-center justify-center"
                  >
                    {colTasks.length}
                  </Badge>
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-2.5 p-3">
                    {colTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-l-2 border-l-transparent hover:border-l-primary"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <CardHeader className="px-4 pt-3 pb-1.5">
                          <CardTitle className="text-sm font-medium leading-snug">
                            {task.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0">
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-[11px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority] || ""}`}
                            >
                              {task.priority}
                            </Badge>
                            {(task.tags || []).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[11px] px-1.5 py-0"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {task.assigneeIds?.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {getAssigneeNames(task)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No tasks
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDetailSheet
        taskId={selectedTaskId}
        agents={agents}
        open={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />

      <CreateTaskDialog
        agents={agents}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
