import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import * as api from "../api";
import type { Agent } from "../api/agents";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

interface Props {
  agents: Agent[];
  open: boolean;
  onClose: () => void;
}

export function CreateTaskDialog({ agents, open, onClose }: Props) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [tags, setTags] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.createTask({
        title,
        description: description || undefined,
        priority,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
        tags: tags
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
      resetAndClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create task");
    },
  });

  const resetAndClose = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssigneeIds([]);
    setTags("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Assignees</Label>
            <Select
              onValueChange={(v) => {
                const id = parseInt(v);
                if (!assigneeIds.includes(id)) {
                  setAssigneeIds([...assigneeIds, id]);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Add assignee" />
              </SelectTrigger>
              <SelectContent>
                {agents
                  .filter((a) => !assigneeIds.includes(a.id))
                  .map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {assigneeIds.map((id) => {
                  const agent = agents.find((a) => a.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center text-xs bg-secondary px-2 py-0.5 rounded"
                    >
                      {agent?.name || `#${id}`}
                      <button
                        className="ml-1"
                        onClick={() =>
                          setAssigneeIds(assigneeIds.filter((a) => a !== id))
                        }
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. frontend, bug"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
