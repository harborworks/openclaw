/**
 * HTTP API for the Harbor daemon.
 *
 * All endpoints require an `Authorization: Bearer <apiKey>` header.
 * The API key is validated against the SHA-256 hash stored on the harbor doc.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// ── Helpers ──────────────────────────────────────────────────────────

async function hashApiKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type AuthResult =
  | { ok: true; harborId: string }
  | { ok: false; response: Response };

async function authenticate(
  ctx: any,
  request: Request,
): Promise<AuthResult> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const apiKey = auth.slice(7);
  const harborId = request.headers.get("X-Harbor-ID");
  if (!harborId) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Missing X-Harbor-ID header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const harbor = await ctx.runQuery(internal.harbors.getById, { id: harborId });
  if (!harbor) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Harbor not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  if (!harbor.apiKeyHash) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Harbor has no API key configured" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const hash = await hashApiKey(apiKey);
  if (hash !== harbor.apiKeyHash) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, harborId };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Endpoints ────────────────────────────────────────────────────────

// GET /api/daemon/harbor — get harbor config
http.route({
  path: "/api/daemon/harbor",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const harbor = await ctx.runQuery(internal.harbors.getById, {
      id: auth.harborId as any,
    });

    if (!harbor) return json({ error: "Harbor not found" }, 404);
    return json({
      heartbeatIntervalMs: harbor.heartbeatIntervalMs,
      browserEnabled: harbor.browserEnabled,
    });
  }),
});

// POST /api/daemon/register — publish public key
http.route({
  path: "/api/daemon/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { publicKey?: string };
    if (!body.publicKey) {
      return json({ error: "Missing publicKey" }, 400);
    }

    await ctx.runMutation(internal.harbors.setPublicKeyInternal, {
      id: auth.harborId as any,
      publicKey: body.publicKey,
    });

    return json({ ok: true });
  }),
});

// GET /api/daemon/secrets — list pending secrets
http.route({
  path: "/api/daemon/secrets",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const secrets = await ctx.runQuery(internal.secrets.listPendingInternal, {
      harborId: auth.harborId as any,
    });

    return json(secrets);
  }),
});

// POST /api/daemon/secrets/consumed — mark a secret as consumed
http.route({
  path: "/api/daemon/secrets/consumed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return json({ error: "Missing id" }, 400);
    }

    await ctx.runMutation(internal.secrets.markConsumedInternal, {
      id: body.id as any,
    });

    return json({ ok: true });
  }),
});

// GET /api/daemon/secrets/deletes — list pending deletions
http.route({
  path: "/api/daemon/secrets/deletes",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const deletes = await ctx.runQuery(internal.secrets.listPendingDeletesInternal, {
      harborId: auth.harborId as any,
    });

    return json(deletes);
  }),
});

// POST /api/daemon/secrets/deleted — confirm deletion (removes doc)
http.route({
  path: "/api/daemon/secrets/deleted",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return json({ error: "Missing id" }, 400);
    }

    await ctx.runMutation(internal.secrets.deleteInternal, {
      id: body.id as any,
    });

    return json({ ok: true });
  }),
});

// GET /api/daemon/agents — list all agents for the harbor
http.route({
  path: "/api/daemon/agents",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const agents = await ctx.runQuery(internal.agents.listInternal, {
      harborId: auth.harborId as any,
    });

    return json(agents);
  }),
});

// GET /api/daemon/prompts — get templates + harbor sections for rendering
http.route({
  path: "/api/daemon/prompts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const [templates, harborPrompts, harbor] = await Promise.all([
      ctx.runQuery(internal.promptTemplates.listInternal, {}),
      ctx.runQuery(internal.harborPrompts.getInternal, {
        harborId: auth.harborId as any,
      }),
      ctx.runQuery(internal.harbors.getById, {
        id: auth.harborId as any,
      }),
    ]);

    return json({
      templates,
      harborPrompts,
      harbor: harbor ? { name: harbor.name, slug: harbor.slug } : null,
    });
  }),
});

// GET /api/daemon/pairing/pending — get codes submitted by admins for daemon to resolve
http.route({
  path: "/api/daemon/pairing/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const channel = url.searchParams.get("channel");
    if (!channel) {
      return json({ error: "Missing channel param" }, 400);
    }

    const pending = await ctx.runQuery(internal.pairing.listPendingInternal, {
      harborId: auth.harborId as any,
      channel,
    });

    return json(pending);
  }),
});

// GET /api/daemon/pairing/senders — get all approved sender IDs for allowFrom sync
http.route({
  path: "/api/daemon/pairing/senders",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const channel = url.searchParams.get("channel");
    if (!channel) {
      return json({ error: "Missing channel param" }, 400);
    }

    const senders = await ctx.runQuery(internal.pairing.listApprovedSendersInternal, {
      harborId: auth.harborId as any,
      channel,
    });

    return json(senders);
  }),
});

// POST /api/daemon/pairing/approved — daemon reports a code was approved
http.route({
  path: "/api/daemon/pairing/approved",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as {
      id?: string;
      senderId?: string;
      senderMeta?: unknown;
    };
    if (!body.id || !body.senderId) {
      return json({ error: "Missing id or senderId" }, 400);
    }

    await ctx.runMutation(internal.pairing.markApprovedInternal, {
      id: body.id as any,
      senderId: body.senderId,
      senderMeta: body.senderMeta,
    });

    return json({ ok: true });
  }),
});

// POST /api/daemon/pairing/failed — daemon reports a code was not found
http.route({
  path: "/api/daemon/pairing/failed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return json({ error: "Missing id" }, 400);
    }

    await ctx.runMutation(internal.pairing.markFailedInternal, {
      id: body.id as any,
    });

    return json({ ok: true });
  }),
});

// ── Template endpoints ───────────────────────────────────────────────

// POST /api/daemon/templates/update — update a prompt template
http.route({
  path: "/api/daemon/templates/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { fileKey?: string; content?: string };
    if (!body.fileKey || !body.content) {
      return json({ error: "Missing fileKey or content" }, 400);
    }

    const result = await ctx.runMutation(internal.promptTemplates.updateInternal, {
      fileKey: body.fileKey,
      content: body.content,
    });

    return json({ ok: true, id: result });
  }),
});

// ── Task endpoints ───────────────────────────────────────────────────

// GET /api/daemon/tasks?sessionKey=xxx&status=yyy — list tasks for an agent
http.route({
  path: "/api/daemon/tasks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const sessionKey = url.searchParams.get("sessionKey");
    if (!sessionKey) {
      return json({ error: "Missing sessionKey param" }, 400);
    }

    const status = url.searchParams.get("status") || undefined;

    const tasks = await ctx.runQuery(internal.tasks.listByAgent, {
      harborId: auth.harborId as any,
      sessionKey,
      status,
    });

    return json(tasks);
  }),
});

// GET /api/daemon/tasks/:id — get task with messages
http.route({
  path: "/api/daemon/tasks/get",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const taskId = url.searchParams.get("id");
    if (!taskId) {
      return json({ error: "Missing id param" }, 400);
    }

    const task = await ctx.runQuery(internal.tasks.getWithMessages, {
      taskId: taskId as any,
    });

    if (!task) return json({ error: "Task not found" }, 404);
    return json(task);
  }),
});

// POST /api/daemon/tasks/create — create a task (leader roles)
http.route({
  path: "/api/daemon/tasks/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      priority?: string;
      assigneeSessionKey?: string;
      reviewerSessionKeys?: string[];
    };
    if (!body.title || !body.description || !body.assigneeSessionKey) {
      return json({ error: "Missing title, description, or assigneeSessionKey" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.tasks.internalCreateTask, {
        harborId: auth.harborId as any,
        title: body.title,
        description: body.description,
        priority: (body.priority as any) ?? "medium",
        assigneeSessionKey: body.assigneeSessionKey,
        reviewerSessionKeys: body.reviewerSessionKeys,
      });
      return json(result);
    } catch (err: any) {
      return json({ error: err.message }, 400);
    }
  }),
});

// POST /api/daemon/tasks/pickup — move task to in_progress
http.route({
  path: "/api/daemon/tasks/pickup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { taskId?: string; sessionKey?: string };
    if (!body.taskId || !body.sessionKey) {
      return json({ error: "Missing taskId or sessionKey" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.tasks.pickup, {
        taskId: body.taskId as any,
        sessionKey: body.sessionKey,
        harborId: auth.harborId as any,
      });
      return json(result);
    } catch (err: any) {
      return json({ error: err.message }, 400);
    }
  }),
});

// POST /api/daemon/tasks/message — add a comment to a task
http.route({
  path: "/api/daemon/tasks/message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as {
      taskId?: string;
      sessionKey?: string;
      content?: string;
    };
    if (!body.taskId || !body.sessionKey || !body.content) {
      return json({ error: "Missing taskId, sessionKey, or content" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.tasks.addMessage, {
        taskId: body.taskId as any,
        sessionKey: body.sessionKey,
        harborId: auth.harborId as any,
        content: body.content,
      });
      return json(result);
    } catch (err: any) {
      return json({ error: err.message }, 400);
    }
  }),
});

// POST /api/daemon/tasks/block — block a task
http.route({
  path: "/api/daemon/tasks/block",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { taskId?: string; sessionKey?: string; reason?: string };
    if (!body.taskId || !body.sessionKey || !body.reason) {
      return json({ error: "Missing taskId, sessionKey, or reason" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.tasks.block, {
        taskId: body.taskId as any,
        sessionKey: body.sessionKey,
        harborId: auth.harborId as any,
        reason: body.reason,
      });
      return json(result);
    } catch (err: any) {
      return json({ error: err.message }, 400);
    }
  }),
});

// POST /api/daemon/tasks/submit — submit task for review
http.route({
  path: "/api/daemon/tasks/submit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { taskId?: string; sessionKey?: string };
    if (!body.taskId || !body.sessionKey) {
      return json({ error: "Missing taskId or sessionKey" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.tasks.submit, {
        taskId: body.taskId as any,
        sessionKey: body.sessionKey,
        harborId: auth.harborId as any,
      });
      return json(result);
    } catch (err: any) {
      return json({ error: err.message }, 400);
    }
  }),
});

// POST /api/daemon/tasks/review — approve or request changes
http.route({
  path: "/api/daemon/tasks/review",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as {
      taskId?: string;
      sessionKey?: string;
      verdict?: string;
      comment?: string;
    };
    if (!body.taskId || !body.sessionKey || !body.verdict) {
      return json({ error: "Missing taskId, sessionKey, or verdict" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.tasks.review, {
        taskId: body.taskId as any,
        sessionKey: body.sessionKey,
        harborId: auth.harborId as any,
        verdict: body.verdict as any,
        comment: body.comment,
      });
      return json(result);
    } catch (err: any) {
      return json({ error: err.message }, 400);
    }
  }),
});

export default http;
