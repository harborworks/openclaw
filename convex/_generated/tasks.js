/**
 * Task queries and mutations for the daemon HTTP API.
 */
import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
// ── Frontend Queries & Mutations ─────────────────────────────────────
/** List all tasks for a harbor (frontend). */
export const list = query({
    args: { harborId: v.id("harbors") },
    handler: async (ctx, args) => {
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .collect();
        // Only show "done" tasks completed in the last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return tasks.filter((t) => t.status !== "done" || (t.updatedAt ?? t._creationTime) >= oneDayAgo);
    },
});
/** Create a new task (frontend). */
export const create = mutation({
    args: {
        harborId: v.id("harbors"),
        title: v.string(),
        description: v.string(),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
        assigneeId: v.id("agents"),
        reviewerIds: v.optional(v.array(v.id("agents"))),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tasks", {
            title: args.title,
            description: args.description,
            status: "to_do",
            priority: args.priority,
            assigneeId: args.assigneeId,
            reviewerIds: (args.reviewerIds ?? []).filter((id) => id !== args.assigneeId),
            harborId: args.harborId,
        });
    },
});
/** Get messages for a task (frontend). */
export const getMessages = query({
    args: { taskId: v.id("tasks") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("messages")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
    },
});
/** Delete a task and all its messages (frontend). */
export const remove = mutation({
    args: { taskId: v.id("tasks") },
    handler: async (ctx, args) => {
        // Delete all messages for this task
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
        for (const msg of messages) {
            await ctx.db.delete(msg._id);
        }
        // Delete the task
        await ctx.db.delete(args.taskId);
        return { ok: true };
    },
});
// ── Internal Queries & Mutations ─────────────────────────────────────
/** List tasks assigned to an agent (by sessionKey), optionally filtered by status. */
export const listByAgent = internalQuery({
    args: {
        harborId: v.id("harbors"),
        sessionKey: v.string(),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Resolve agent by sessionKey
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .filter((q) => q.eq(q.field("sessionKey"), args.sessionKey))
            .first();
        if (!agent)
            return [];
        // Get tasks where this agent is assignee
        const assignedTasks = await ctx.db
            .query("tasks")
            .withIndex("by_assignee", (q) => q.eq("assigneeId", agent._id))
            .collect();
        // Also get tasks where this agent is a reviewer and status is "review"
        const reviewTasks = await ctx.db
            .query("tasks")
            .withIndex("by_harbor_status", (q) => q.eq("harborId", args.harborId).eq("status", "review"))
            .collect();
        const reviewerTasks = reviewTasks.filter((t) => t.reviewerIds?.includes(agent._id) &&
            !assignedTasks.some((at) => at._id === t._id));
        let tasks = [...assignedTasks, ...reviewerTasks];
        if (args.status) {
            tasks = tasks.filter((t) => t.status === args.status);
        }
        // Sort by priority (urgent > high > medium > low) then oldest first
        const priorityRank = {
            urgent: 0,
            high: 1,
            medium: 2,
            low: 3,
        };
        tasks.sort((a, b) => {
            const pa = priorityRank[a.priority] ?? 9;
            const pb = priorityRank[b.priority] ?? 9;
            if (pa !== pb)
                return pa - pb;
            return a._creationTime - b._creationTime;
        });
        // Attach agent sessionKey info for the daemon response
        return tasks.map((t) => ({
            ...t,
            _agentRole: t.assigneeId === agent._id ? "assignee" : "reviewer",
        }));
    },
});
/** Get a single task with its recent messages. */
export const getWithMessages = internalQuery({
    args: {
        taskId: v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task)
            return null;
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .take(20);
        return { ...task, messages: messages.reverse() };
    },
});
/** Create a task via daemon (leader roles only). Resolves sessionKeys to agent IDs. */
export const internalCreateTask = internalMutation({
    args: {
        harborId: v.id("harbors"),
        title: v.string(),
        description: v.string(),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
        assigneeSessionKey: v.string(),
        reviewerSessionKeys: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Resolve assignee
        const assignee = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .filter((q) => q.eq(q.field("sessionKey"), args.assigneeSessionKey))
            .first();
        if (!assignee)
            throw new Error(`Assignee not found: ${args.assigneeSessionKey}`);
        // Resolve reviewers
        const reviewerIds = [];
        for (const sk of args.reviewerSessionKeys ?? []) {
            const reviewer = await ctx.db
                .query("agents")
                .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
                .filter((q) => q.eq(q.field("sessionKey"), sk))
                .first();
            if (reviewer && reviewer._id !== assignee._id) {
                reviewerIds.push(reviewer._id);
            }
        }
        const taskId = await ctx.db.insert("tasks", {
            title: args.title,
            description: args.description,
            status: "to_do",
            priority: args.priority,
            assigneeId: assignee._id,
            reviewerIds,
            harborId: args.harborId,
        });
        return { ok: true, taskId };
    },
});
// ── Mutations ────────────────────────────────────────────────────────
/** Move a task from to_do to in_progress. */
export const pickup = internalMutation({
    args: {
        taskId: v.id("tasks"),
        sessionKey: v.string(),
        harborId: v.id("harbors"),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task)
            throw new Error("Task not found");
        if (task.status !== "to_do") {
            throw new Error(`Cannot pick up task in status "${task.status}"`);
        }
        // Verify the agent is the assignee
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .filter((q) => q.eq(q.field("sessionKey"), args.sessionKey))
            .first();
        if (!agent)
            throw new Error("Agent not found");
        if (task.assigneeId !== agent._id) {
            throw new Error("Only the assignee can pick up a task");
        }
        await ctx.db.patch(args.taskId, { status: "in_progress", updatedAt: Date.now() });
        return { ok: true, taskId: args.taskId, status: "in_progress" };
    },
});
/** Add a message/comment to a task. */
export const addMessage = internalMutation({
    args: {
        taskId: v.id("tasks"),
        sessionKey: v.string(),
        harborId: v.id("harbors"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task)
            throw new Error("Task not found");
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .filter((q) => q.eq(q.field("sessionKey"), args.sessionKey))
            .first();
        if (!agent)
            throw new Error("Agent not found");
        const messageId = await ctx.db.insert("messages", {
            taskId: args.taskId,
            fromAgentId: agent._id,
            content: args.content,
            harborId: args.harborId,
        });
        return { ok: true, messageId };
    },
});
/** Block a task (any status → blocked). */
export const block = internalMutation({
    args: {
        taskId: v.id("tasks"),
        sessionKey: v.string(),
        harborId: v.id("harbors"),
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task)
            throw new Error("Task not found");
        if (task.status === "blocked") {
            throw new Error("Task is already blocked");
        }
        if (task.status === "done") {
            throw new Error("Cannot block a completed task");
        }
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .filter((q) => q.eq(q.field("sessionKey"), args.sessionKey))
            .first();
        if (!agent)
            throw new Error("Agent not found");
        // Post the reason as a message
        await ctx.db.insert("messages", {
            taskId: args.taskId,
            fromAgentId: agent._id,
            content: `⚠️ **Blocked:** ${args.reason}`,
            harborId: args.harborId,
        });
        await ctx.db.patch(args.taskId, {
            status: "blocked",
            previousStatus: task.status,
            updatedAt: Date.now(),
        });
        return { ok: true, taskId: args.taskId, status: "blocked" };
    },
});
/** Unblock a task (human-only, frontend mutation). */
export const unblock = mutation({
    args: {
        taskId: v.id("tasks"),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task)
            throw new Error("Task not found");
        if (task.status !== "blocked") {
            throw new Error("Task is not blocked");
        }
        if (!args.message.trim()) {
            throw new Error("A message is required when unblocking");
        }
        // Post the unblock message — attribute to "Admin User" via fromLabel
        await ctx.db.insert("messages", {
            taskId: args.taskId,
            fromAgentId: task.assigneeId,
            fromLabel: "Admin User",
            content: `✅ **Unblocked:** ${args.message}`,
            harborId: task.harborId,
        });
        const returnTo = task.previousStatus ?? "in_progress";
        await ctx.db.patch(args.taskId, {
            status: returnTo,
            previousStatus: undefined,
            updatedAt: Date.now(),
        });
        return { ok: true, taskId: args.taskId, status: returnTo };
    },
});
/** Submit a task for review (in_progress → review). */
export const submit = internalMutation({
    args: {
        taskId: v.id("tasks"),
        sessionKey: v.string(),
        harborId: v.id("harbors"),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task)
            throw new Error("Task not found");
        if (task.status !== "in_progress") {
            throw new Error(`Cannot submit task in status "${task.status}"`);
        }
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .filter((q) => q.eq(q.field("sessionKey"), args.sessionKey))
            .first();
        if (!agent)
            throw new Error("Agent not found");
        if (task.assigneeId !== agent._id) {
            throw new Error("Only the assignee can submit a task for review");
        }
        const reviewers = task.reviewerIds ?? [];
        // No reviewers → skip review, go straight to done
        if (reviewers.length === 0) {
            await ctx.db.insert("messages", {
                taskId: args.taskId,
                fromAgentId: agent._id,
                content: "📋 No reviewers assigned — marking as done.",
                harborId: args.harborId,
            });
            await ctx.db.patch(args.taskId, {
                status: "done",
                updatedAt: Date.now(),
            });
            return { ok: true, taskId: args.taskId, status: "done" };
        }
        // Build initial review statuses (all pending)
        const reviewStatuses = {};
        for (const reviewerId of reviewers) {
            reviewStatuses[reviewerId] = "pending";
        }
        await ctx.db.patch(args.taskId, {
            status: "review",
            reviewStatuses,
            updatedAt: Date.now(),
        });
        return { ok: true, taskId: args.taskId, status: "review" };
    },
});
/** Review a task (approve or request changes). */
export const review = internalMutation({
    args: {
        taskId: v.id("tasks"),
        sessionKey: v.string(),
        harborId: v.id("harbors"),
        verdict: v.union(v.literal("approved"), v.literal("changes_requested")),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task)
            throw new Error("Task not found");
        if (task.status !== "review") {
            throw new Error(`Cannot review task in status "${task.status}"`);
        }
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .filter((q) => q.eq(q.field("sessionKey"), args.sessionKey))
            .first();
        if (!agent)
            throw new Error("Agent not found");
        // Verify this agent is a reviewer
        if (!task.reviewerIds?.includes(agent._id)) {
            throw new Error("Only reviewers can review a task");
        }
        // Post the review comment if provided
        if (args.comment) {
            await ctx.db.insert("messages", {
                taskId: args.taskId,
                fromAgentId: agent._id,
                content: args.comment,
                harborId: args.harborId,
            });
        }
        // Update this reviewer's status
        const reviewStatuses = { ...(task.reviewStatuses ?? {}) };
        reviewStatuses[agent._id] = args.verdict;
        // Check if all reviewers have responded
        const allReviewerIds = task.reviewerIds ?? [];
        const hasChangesRequested = allReviewerIds.some((id) => reviewStatuses[id] === "changes_requested");
        const allApproved = allReviewerIds.every((id) => reviewStatuses[id] === "approved");
        if (hasChangesRequested) {
            // Back to in_progress, reset all review statuses
            const resetStatuses = {};
            for (const id of allReviewerIds) {
                resetStatuses[id] = "pending";
            }
            await ctx.db.patch(args.taskId, {
                status: "in_progress",
                reviewStatuses: resetStatuses,
                updatedAt: Date.now(),
            });
            return { ok: true, taskId: args.taskId, status: "in_progress", verdict: args.verdict };
        }
        else if (allApproved && allReviewerIds.length > 0) {
            // All approved → done
            await ctx.db.patch(args.taskId, {
                status: "done",
                reviewStatuses,
                updatedAt: Date.now(),
            });
            return { ok: true, taskId: args.taskId, status: "done", verdict: args.verdict };
        }
        else {
            // Still waiting on other reviewers
            await ctx.db.patch(args.taskId, { reviewStatuses, updatedAt: Date.now() });
            return { ok: true, taskId: args.taskId, status: "review", verdict: args.verdict };
        }
    },
});
