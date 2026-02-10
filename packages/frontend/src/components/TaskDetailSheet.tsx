import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import * as api from "../api";
import { Agent } from "../api/agents";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Textarea } from "./ui/textarea";

const STATUSES = [
  "inbox",
  "assigned",
  "in_progress",
  "review",
  "ready_to_deploy",
  "done",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

interface Props {
  taskId: number | null;
  agents: Agent[];
  open: boolean;
  onClose: () => void;
}

export function TaskDetailSheet({ taskId, agents, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: task } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api.getTask(taskId!),
    enabled: !!taskId,
    refetchInterval: 3000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => api.getTaskComments(taskId!),
    enabled: !!taskId,
    refetchInterval: 3000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.updateTask>[1]) =>
      api.updateTask(taskId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.createTaskComment(taskId!, {
        fromAgentId: "system",
        content,
      }),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] flex flex-col p-0">
        <div className="px-6 pt-6 pb-4 border-b">
          <SheetHeader>
            <SheetTitle className="text-left text-lg">{task.title}</SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </Label>
                <Select
                  value={task.status}
                  onValueChange={(v) => updateMutation.mutate({ status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Priority
                </Label>
                <Select
                  value={task.priority}
                  onValueChange={(v) => updateMutation.mutate({ priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Assignees
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {(task.assigneeIds || []).map((id) => {
                  const agent = agentMap.get(id);
                  return (
                    <Badge key={id} variant="secondary">
                      {agent?.name || `#${id}`}
                      <button
                        className="ml-1.5 hover:text-destructive"
                        onClick={() =>
                          updateMutation.mutate({
                            assigneeIds: task.assigneeIds.filter(
                              (a) => a !== id
                            ),
                          })
                        }
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
                <Select
                  onValueChange={(v) => {
                    const agentId = parseInt(v);
                    if (!task.assigneeIds.includes(agentId)) {
                      updateMutation.mutate({
                        assigneeIds: [...task.assigneeIds, agentId],
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Add assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents
                      .filter((a) => !task.assigneeIds.includes(a.id))
                      .map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            {(task.tags || []).length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                      <button
                        className="ml-1.5 hover:text-destructive"
                        onClick={() =>
                          updateMutation.mutate({
                            tags: task.tags.filter((t) => t !== tag),
                          })
                        }
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Description
                </Label>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Comments ({comments.length})
              </Label>
              {comments.length > 0 && (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.agentName ||
                            `Agent #${comment.fromAgentId}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comment input — pinned to bottom */}
        <div className="border-t px-6 py-4">
          <div className="flex gap-3">
            <Textarea
              placeholder="Add a comment... (use @AgentName to mention)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[72px] text-sm resize-none"
            />
            <Button
              size="sm"
              className="self-end"
              disabled={!newComment.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate(newComment.trim())}
            >
              Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
