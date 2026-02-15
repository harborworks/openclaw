/**
 * Task API — HTTP endpoints for agents to interact with tasks.
 *
 * Agents call these endpoints during heartbeat to check for work,
 * pick up tasks, and post updates. The daemon proxies to Convex.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { ConvexApiConfig } from "./secrets.js";
import type { ConvexAgent } from "./agents.js";
import { convexGet, convexPost } from "./utils.js";

function log(msg: string) {
  console.log(`[tasks] ${new Date().toISOString()} ${msg}`);
}

function jsonResponse(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const LEADER_ROLES = new Set(["project-manager", "executive-assistant"]);

/**
 * Handle task-related HTTP requests.
 * Returns true if the request was handled, false otherwise.
 */
export async function handleTaskRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  api: ConvexApiConfig,
  agents?: ConvexAgent[],
): Promise<boolean> {
  const path = url.pathname;

  // GET /tasks — list tasks for an agent
  if (path === "/tasks" && req.method === "GET") {
    const sessionKey = req.headers["x-agent-id"] as string | undefined;
    if (!sessionKey) {
      jsonResponse(res, { error: "Missing X-Agent-ID header" }, 400);
      return true;
    }

    const status = url.searchParams.get("status") || undefined;
    const query = new URLSearchParams({ sessionKey });
    if (status) query.set("status", status);

    try {
      const tasks = await convexGet(api, `/api/daemon/tasks?${query}`);
      log(`Listed tasks for ${sessionKey}`);
      jsonResponse(res, tasks);
    } catch (err) {
      log(`Error listing tasks: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to list tasks" }, 500);
    }
    return true;
  }

  // POST /tasks/create — create a task (leader roles only)
  if (path === "/tasks/create" && req.method === "POST") {
    const sessionKey = req.headers["x-agent-id"] as string | undefined;
    if (!sessionKey) {
      jsonResponse(res, { error: "Missing X-Agent-ID header" }, 400);
      return true;
    }

    // Validate the calling agent is a leader role
    const callingAgent = agents?.find((a) => a.sessionKey === sessionKey);
    if (!callingAgent || !LEADER_ROLES.has(callingAgent.role)) {
      jsonResponse(res, { error: "Only leader roles (project-manager, executive-assistant) can create tasks" }, 403);
      return true;
    }

    const body = JSON.parse(await readBody(req));
    if (!body.title || !body.description || !body.assigneeSessionKey) {
      jsonResponse(res, { error: "Missing title, description, or assigneeSessionKey" }, 400);
      return true;
    }

    try {
      const result = await convexPost(api, "/api/daemon/tasks/create", {
        title: body.title,
        description: body.description,
        priority: body.priority ?? "medium",
        assigneeSessionKey: body.assigneeSessionKey,
        reviewerSessionKeys: body.reviewerSessionKeys,
      });
      log(`Task created by ${sessionKey}: ${body.title}`);
      jsonResponse(res, result);
    } catch (err) {
      log(`Error creating task: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to create task" }, 500);
    }
    return true;
  }

  // GET /tasks/:id — get task detail
  if (path.match(/^\/tasks\/[a-z0-9]+$/) && req.method === "GET") {
    const taskId = path.split("/")[2];
    try {
      const task = await convexGet(api, `/api/daemon/tasks/get?id=${taskId}`);
      jsonResponse(res, task);
    } catch (err) {
      log(`Error getting task: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to get task" }, 500);
    }
    return true;
  }

  // POST /tasks/:id/pickup — pick up a task
  if (path.match(/^\/tasks\/[a-z0-9]+\/pickup$/) && req.method === "POST") {
    const taskId = path.split("/")[2];
    const sessionKey = req.headers["x-agent-id"] as string | undefined;
    if (!sessionKey) {
      jsonResponse(res, { error: "Missing X-Agent-ID header" }, 400);
      return true;
    }

    try {
      const result = await convexPost(api, "/api/daemon/tasks/pickup", {
        taskId,
        sessionKey,
      });
      log(`Task ${taskId} picked up by ${sessionKey}`);
      jsonResponse(res, result);
    } catch (err) {
      log(`Error picking up task: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to pick up task" }, 500);
    }
    return true;
  }

  // POST /tasks/:id/message — post a comment
  if (path.match(/^\/tasks\/[a-z0-9]+\/message$/) && req.method === "POST") {
    const taskId = path.split("/")[2];
    const sessionKey = req.headers["x-agent-id"] as string | undefined;
    if (!sessionKey) {
      jsonResponse(res, { error: "Missing X-Agent-ID header" }, 400);
      return true;
    }

    const body = JSON.parse(await readBody(req));
    if (!body.content) {
      jsonResponse(res, { error: "Missing content" }, 400);
      return true;
    }

    try {
      const result = await convexPost(api, "/api/daemon/tasks/message", {
        taskId,
        sessionKey,
        content: body.content,
      });
      log(`Message posted on task ${taskId} by ${sessionKey}`);
      jsonResponse(res, result);
    } catch (err) {
      log(`Error posting message: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to post message" }, 500);
    }
    return true;
  }

  // POST /tasks/:id/block — block a task
  if (path.match(/^\/tasks\/[a-z0-9]+\/block$/) && req.method === "POST") {
    const taskId = path.split("/")[2];
    const sessionKey = req.headers["x-agent-id"] as string | undefined;
    if (!sessionKey) {
      jsonResponse(res, { error: "Missing X-Agent-ID header" }, 400);
      return true;
    }

    const body = JSON.parse(await readBody(req));
    if (!body.reason) {
      jsonResponse(res, { error: "Missing reason" }, 400);
      return true;
    }

    try {
      const result = await convexPost(api, "/api/daemon/tasks/block", {
        taskId,
        sessionKey,
        reason: body.reason,
      });
      log(`Task ${taskId} blocked by ${sessionKey}: ${body.reason}`);
      jsonResponse(res, result);
    } catch (err) {
      log(`Error blocking task: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to block task" }, 500);
    }
    return true;
  }

  // POST /tasks/:id/submit — submit for review
  if (path.match(/^\/tasks\/[a-z0-9]+\/submit$/) && req.method === "POST") {
    const taskId = path.split("/")[2];
    const sessionKey = req.headers["x-agent-id"] as string | undefined;
    if (!sessionKey) {
      jsonResponse(res, { error: "Missing X-Agent-ID header" }, 400);
      return true;
    }

    try {
      const result = await convexPost(api, "/api/daemon/tasks/submit", {
        taskId,
        sessionKey,
      });
      log(`Task ${taskId} submitted for review by ${sessionKey}`);
      jsonResponse(res, result);
    } catch (err) {
      log(`Error submitting task: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to submit task" }, 500);
    }
    return true;
  }

  // POST /tasks/:id/review — approve or request changes
  if (path.match(/^\/tasks\/[a-z0-9]+\/review$/) && req.method === "POST") {
    const taskId = path.split("/")[2];
    const sessionKey = req.headers["x-agent-id"] as string | undefined;
    if (!sessionKey) {
      jsonResponse(res, { error: "Missing X-Agent-ID header" }, 400);
      return true;
    }

    const body = JSON.parse(await readBody(req));
    if (!body.verdict) {
      jsonResponse(res, { error: "Missing verdict (approved or changes_requested)" }, 400);
      return true;
    }

    try {
      const result = await convexPost(api, "/api/daemon/tasks/review", {
        taskId,
        sessionKey,
        verdict: body.verdict,
        comment: body.comment,
      });
      log(`Task ${taskId} reviewed by ${sessionKey}: ${body.verdict}`);
      jsonResponse(res, result);
    } catch (err) {
      log(`Error reviewing task: ${err instanceof Error ? err.message : err}`);
      jsonResponse(res, { error: "Failed to review task" }, 500);
    }
    return true;
  }

  return false;
}
