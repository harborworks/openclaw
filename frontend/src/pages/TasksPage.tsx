import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import ReactMarkdown from "react-markdown";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { useHarborContext } from "../contexts/HarborContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tasksApi = (api as any).tasks;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentsApi = (api as any).agents;

interface TaskDoc {
  _id: Id<"tasks">;
  _creationTime: number;
  title: string;
  description: string;
  status: "to_do" | "in_progress" | "review" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: Id<"agents">;
  reviewerIds?: Id<"agents">[];
  reviewStatuses?: Record<string, string>;
  updatedAt?: number;
  harborId: Id<"harbors">;
}

interface AgentDoc {
  _id: Id<"agents">;
  name: string;
  sessionKey: string;
}

interface MessageDoc {
  _id: Id<"messages">;
  _creationTime: number;
  taskId: Id<"tasks">;
  fromAgentId: Id<"agents">;
  fromLabel?: string;
  content: string;
}

const COLUMNS = [
  { key: "to_do" as const, label: "To Do" },
  { key: "in_progress" as const, label: "In Progress" },
  { key: "review" as const, label: "Review" },
  { key: "done" as const, label: "Done" },
  { key: "blocked" as const, label: "Waiting" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
};

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className="kanban-priority-badge"
      style={{ background: PRIORITY_COLORS[priority] ?? "#6b7280" }}
    >
      {priority}
    </span>
  );
}

function TaskCard({
  task,
  agents,
  messageCount,
  onClick,
}: {
  task: TaskDoc;
  agents: AgentDoc[];
  messageCount: number;
  onClick: () => void;
}) {
  const assignee = agents.find((a) => a._id === task.assigneeId);
  return (
    <div className="kanban-card" onClick={onClick}>
      <div className="kanban-card-title">{task.title}</div>
      <div className="kanban-card-meta">
        <PriorityBadge priority={task.priority} />
        {assignee && <span className="kanban-card-assignee">{assignee.name}</span>}
        {messageCount > 0 && (
          <span className="kanban-card-messages">💬 {messageCount}</span>
        )}
      </div>
      <div className="kanban-card-time">
        <span title={new Date(task._creationTime).toLocaleString()}>
          {"Created " + relativeTime(task._creationTime)}
        </span>
        {task.updatedAt && (
          <span title={new Date(task.updatedAt).toLocaleString()}>
            {" · Updated " + relativeTime(task.updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function CreateTaskModal({
  open,
  onClose,
  agents,
  harborId,
}: {
  open: boolean;
  onClose: () => void;
  agents: AgentDoc[];
  harborId: Id<"harbors">;
}) {
  const createTask = useMutation(tasksApi.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !assigneeId) return;
    setSaving(true);
    try {
      await createTask({
        harborId,
        title: title.trim(),
        description: description.trim(),
        priority,
        assigneeId: assigneeId as Id<"agents">,
        reviewerIds: reviewerIds.length > 0 ? reviewerIds as Id<"agents">[] : undefined,
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAssigneeId("");
      setReviewerIds([]);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleReviewer = (id: string) => {
    setReviewerIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Task">
      <form className="agent-form" onSubmit={handleSubmit}>
        <div className="agent-form-fields">
          <label className="agent-field">
            <span className="agent-field-label">Title</span>
            <input
              className="agent-input"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="agent-field">
            <span className="agent-field-label">Description</span>
            <textarea
              className="agent-input kanban-textarea"
              placeholder="Describe the task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
            />
          </label>
          <label className="agent-field">
            <span className="agent-field-label">Priority</span>
            <select
              className="agent-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </label>
          <label className="agent-field">
            <span className="agent-field-label">Assignee</span>
            <select
              className="agent-input"
              value={assigneeId}
              onChange={(e) => {
                setAssigneeId(e.target.value);
                setReviewerIds((prev) => prev.filter((id) => id !== e.target.value));
              }}
              required
            >
              <option value="">Select assignee</option>
              {agents.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </label>
          <div className="agent-field">
            <span className="agent-field-label">Reviewers (optional)</span>
            <div className="kanban-reviewer-list">
              {agents.filter((a) => a._id !== assigneeId).map((a) => (
                <label key={a._id} className="kanban-reviewer-option">
                  <input
                    type="checkbox"
                    checked={reviewerIds.includes(a._id)}
                    onChange={() => toggleReviewer(a._id)}
                  />
                  <span>{a.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="agent-form-actions">
          <button type="submit" className="admin-btn admin-btn-accent" disabled={saving}>
            Create
          </button>
          <button type="button" className="admin-btn admin-btn-accent-muted" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UnblockForm({ taskId, onDone }: { taskId: Id<"tasks">; onDone: () => void }) {
  const unblockTask = useMutation(tasksApi.unblock);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    try {
      await unblockTask({ taskId, message: message.trim() });
      setMessage("");
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="kanban-unblock-form" onSubmit={handleSubmit}>
      <textarea
        className="agent-input kanban-textarea"
        placeholder="Tell the agent what changed or what to do next (required)..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        rows={2}
      />
      <button type="submit" className="admin-btn admin-btn-accent" disabled={saving || !message.trim()}>
        {saving ? "Unblocking…" : "Unblock"}
      </button>
    </form>
  );
}

function TaskDetailModal({
  taskId,
  tasks,
  agents,
  onClose,
}: {
  taskId: Id<"tasks"> | null;
  tasks: TaskDoc[];
  agents: AgentDoc[];
  onClose: () => void;
}) {
  const messages = useQuery(
    tasksApi.getMessages,
    taskId ? { taskId } : "skip"
  ) as MessageDoc[] | undefined;
  const deleteTask = useMutation(tasksApi.remove);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Look up live task data from the reactive query
  const task = taskId ? tasks.find((t) => t._id === taskId) ?? null : null;
  if (!task) return null;

  const assignee = agents.find((a) => a._id === task.assigneeId);
  const reviewers = (task.reviewerIds ?? [])
    .map((id) => agents.find((a) => a._id === id))
    .filter(Boolean) as AgentDoc[];

  const agentName = (id: Id<"agents">) =>
    agents.find((a) => a._id === id)?.name ?? "Unknown";

  return (
    <Modal open={!!task} onClose={onClose} title={task.title}>
      <div className="kanban-detail">
        <div className="kanban-detail-row">
          <span className="kanban-detail-label">Status</span>
          <span className="kanban-detail-value kanban-detail-capitalize">{task.status === "blocked" ? "Waiting" : task.status.replace(/_/g, " ")}</span>
        </div>
        <div className="kanban-detail-row">
          <span className="kanban-detail-label">Priority</span>
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="kanban-detail-row">
          <span className="kanban-detail-label">Created</span>
          <span className="kanban-detail-value" title={new Date(task._creationTime).toLocaleString()}>
            {relativeTime(task._creationTime)}
          </span>
        </div>
        {task.updatedAt && (
          <div className="kanban-detail-row">
            <span className="kanban-detail-label">Updated</span>
            <span className="kanban-detail-value" title={new Date(task.updatedAt).toLocaleString()}>
              {relativeTime(task.updatedAt)}
            </span>
          </div>
        )}
        <div className="kanban-detail-row">
          <span className="kanban-detail-label">Assignee</span>
          <span className="kanban-detail-value">{assignee?.name ?? "—"}</span>
        </div>
        {reviewers.length > 0 && (
          <div className="kanban-detail-row">
            <span className="kanban-detail-label">Reviewers</span>
            <div className="kanban-detail-value">
              {reviewers.map((r) => {
                const status = task.reviewStatuses?.[r._id];
                return (
                  <span key={r._id} className="kanban-reviewer-status">
                    {r.name}
                    {status && (
                      <span className={`kanban-review-badge kanban-review-${status}`}>
                        {status.replace(/_/g, " ")}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div className="kanban-detail-desc">
          <span className="kanban-detail-label">Description</span>
          <div className="kanban-detail-desc-text kanban-markdown"><ReactMarkdown>{task.description}</ReactMarkdown></div>
        </div>

        {(messages && messages.length > 0) && (
          <div className="kanban-messages">
            <span className="kanban-detail-label">Messages</span>
            <div className="kanban-messages-list">
              {messages.map((msg) => (
                <div key={msg._id} className="kanban-message">
                  <div className="kanban-message-header">
                    <span className="kanban-message-author">{msg.fromLabel ?? agentName(msg.fromAgentId)}</span>
                    <span className="kanban-message-time" title={new Date(msg._creationTime).toLocaleString()}>
                      {relativeTime(msg._creationTime)}
                    </span>
                  </div>
                  <div className="kanban-message-content kanban-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {task.status === "blocked" && (
          <div className="kanban-unblock-section">
            <span className="kanban-detail-label">Unblock this task</span>
            <UnblockForm taskId={task._id} onDone={onClose} />
          </div>
        )}

        <div className="kanban-delete-section">
          {!confirmingDelete ? (
            <button
              className="admin-btn admin-btn-sm admin-btn-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete Task
            </button>
          ) : (
            <div className="agent-delete-confirm">
              <p className="agent-delete-warning">
                ⚠️ This will permanently delete <strong>{task.title}</strong> and all its messages. This cannot be undone.
              </p>
              <div className="agent-form-actions">
                <button
                  className="admin-btn admin-btn-danger"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await deleteTask({ taskId: task._id });
                      onClose();
                    } finally {
                      setDeleting(false);
                      setConfirmingDelete(false);
                    }
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
                <button
                  className="admin-btn"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function TasksPage() {
  const { harborId } = useHarborContext();
  const tasks = useQuery(tasksApi.list, harborId ? { harborId } : "skip") as TaskDoc[] | undefined;
  const agents = useQuery(agentsApi.list, harborId ? { harborId } : "skip") as AgentDoc[] | undefined;

  const [creating, setCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);

  // Message counts — we'll count from task-level later; for now show 0
  const messageCounts: Record<string, number> = {};

  const tasksByStatus = (status: string) => {
    const filtered = (tasks ?? []).filter((t) => t.status === status);
    if (status === "done") {
      filtered.sort((a, b) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime));
    }
    return filtered;
  };

  return (
    <div className="tasks-page">
      <PageHeader title="Tasks">
        <button className="admin-btn admin-btn-accent" onClick={() => setCreating(true)}>
          + New Task
        </button>
      </PageHeader>

      <div className="kanban-headers">
        {COLUMNS.map((col) => (
          <div key={col.key} className="kanban-column-header">
            <span className="kanban-column-title">{col.label}</span>
            <span className="kanban-column-count">{tasksByStatus(col.key).length}</span>
          </div>
        ))}
      </div>
      <div className="kanban-board">
        {COLUMNS.map((col) => (
          <div key={col.key} className="kanban-column">
            <div className="kanban-column-body">
              {tasksByStatus(col.key).map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  agents={agents ?? []}
                  messageCount={messageCounts[task._id] ?? 0}
                  onClick={() => setSelectedTaskId(task._id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <CreateTaskModal
        open={creating}
        onClose={() => setCreating(false)}
        agents={agents ?? []}
        harborId={harborId as Id<"harbors">}
      />

      <TaskDetailModal
        taskId={selectedTaskId}
        tasks={tasks ?? []}
        agents={agents ?? []}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
