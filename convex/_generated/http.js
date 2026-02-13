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
async function hashApiKey(key) {
    const encoded = new TextEncoder().encode(key);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
async function authenticate(ctx, request) {
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
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
// ── Endpoints ────────────────────────────────────────────────────────
// POST /api/daemon/register — publish public key
http.route({
    path: "/api/daemon/register",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const auth = await authenticate(ctx, request);
        if (!auth.ok)
            return auth.response;
        const body = (await request.json());
        if (!body.publicKey) {
            return json({ error: "Missing publicKey" }, 400);
        }
        await ctx.runMutation(internal.harbors.setPublicKeyInternal, {
            id: auth.harborId,
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
        if (!auth.ok)
            return auth.response;
        const secrets = await ctx.runQuery(internal.secrets.listPendingInternal, {
            harborId: auth.harborId,
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
        if (!auth.ok)
            return auth.response;
        const body = (await request.json());
        if (!body.id) {
            return json({ error: "Missing id" }, 400);
        }
        await ctx.runMutation(internal.secrets.markConsumedInternal, {
            id: body.id,
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
        if (!auth.ok)
            return auth.response;
        const deletes = await ctx.runQuery(internal.secrets.listPendingDeletesInternal, {
            harborId: auth.harborId,
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
        if (!auth.ok)
            return auth.response;
        const body = (await request.json());
        if (!body.id) {
            return json({ error: "Missing id" }, 400);
        }
        await ctx.runMutation(internal.secrets.deleteInternal, {
            id: body.id,
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
        if (!auth.ok)
            return auth.response;
        const agents = await ctx.runQuery(internal.agents.listInternal, {
            harborId: auth.harborId,
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
        if (!auth.ok)
            return auth.response;
        const [templates, harborPrompts, harbor] = await Promise.all([
            ctx.runQuery(internal.promptTemplates.listInternal, {}),
            ctx.runQuery(internal.harborPrompts.getInternal, {
                harborId: auth.harborId,
            }),
            ctx.runQuery(internal.harbors.getById, {
                id: auth.harborId,
            }),
        ]);
        return json({
            templates,
            harborPrompts,
            harbor: harbor ? { name: harbor.name, slug: harbor.slug } : null,
        });
    }),
});
// POST /api/daemon/pairing/sync — push pending pairing requests from gateway files
http.route({
    path: "/api/daemon/pairing/sync",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const auth = await authenticate(ctx, request);
        if (!auth.ok)
            return auth.response;
        const body = (await request.json());
        if (!body.channel || !body.requests) {
            return json({ error: "Missing channel or requests" }, 400);
        }
        await ctx.runMutation(internal.pairing.syncFromDaemon, {
            harborId: auth.harborId,
            channel: body.channel,
            requests: body.requests,
        });
        return json({ ok: true });
    }),
});
// GET /api/daemon/pairing/approved — get approved requests for daemon to write to allowFrom
http.route({
    path: "/api/daemon/pairing/approved",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const auth = await authenticate(ctx, request);
        if (!auth.ok)
            return auth.response;
        const url = new URL(request.url);
        const channel = url.searchParams.get("channel");
        if (!channel) {
            return json({ error: "Missing channel param" }, 400);
        }
        const approved = await ctx.runQuery(internal.pairing.listApprovedInternal, {
            harborId: auth.harborId,
            channel,
        });
        return json(approved);
    }),
});
export default http;
