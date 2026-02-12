/**
 * OpenClaw Gateway WebSocket RPC Client (Node.js version)
 * Same protocol as the browser client, using `ws` package.
 */

import WebSocket from "ws";
import * as crypto from "crypto";

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type DeviceIdentity = {
  id: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  password?: string;
  device?: DeviceIdentity;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
};

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private options: GatewayClientOptions;
  private _connected = false;
  private idCounter = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private destroyed = false;
  private connectPromise: Promise<void> | null = null;

  constructor(options: GatewayClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this._connected) return;
    if (this.connectPromise) return this.connectPromise;
    this.destroyed = false;
    this.connectPromise = this.doConnect();
    return this.connectPromise;
  }

  private doConnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.options.url);
      this.ws = ws;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Gateway connection timeout"));
      }, 10_000);

      let challengeNonce: string | null = null;
      let connectSent = false;

      const sendConnect = () => {
        if (connectSent) return;
        connectSent = true;

        const auth: Record<string, string> = {};
        if (this.options.token) auth.token = this.options.token;
        if (this.options.password) auth.password = this.options.password;

        const params: Record<string, unknown> = {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "gateway-client",
            version: "0.2.0",
            platform: "node",
            mode: "backend",
          },
          role: "operator",
          scopes: ["operator.read", "operator.write", "operator.admin"],
          auth: Object.keys(auth).length > 0 ? auth : undefined,
        };

        // Sign device auth payload (Ed25519)
        if (this.options.device) {
          const dev = this.options.device;
          const signedAt = Date.now();
          const role = (params.role as string) || "operator";
          const scopes = ((params.scopes as string[]) || []).join(",");
          const token = this.options.token ?? "";
          const clientId = "gateway-client";
          const clientMode = "backend";
          const nonce = challengeNonce ?? "";

          // Build payload: v2 if nonce present, v1 otherwise
          const version = nonce ? "v2" : "v1";
          const parts = [version, dev.id, clientId, clientMode, role, scopes, String(signedAt), token];
          if (version === "v2") parts.push(nonce);
          const payload = parts.join("|");

          const key = crypto.createPrivateKey(dev.privateKeyPem);
          const sig = crypto.sign(null, Buffer.from(payload, "utf8"), key);
          const signature = sig.toString("base64")
            .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");

          params.device = {
            id: dev.id,
            publicKey: dev.publicKeyPem,
            signature,
            signedAt,
            nonce: nonce || undefined,
          };
        }

        ws.send(JSON.stringify({
          type: "req",
          id: this.nextId(),
          method: "connect",
          params,
        }));
      };

      ws.on("open", () => {
        // Wait briefly for challenge event, then send connect
        // Gateway may or may not send a challenge
        setTimeout(() => sendConnect(), 500);
      });

      ws.on("message", (raw) => {
        const data = JSON.parse(String(raw));

        // Handle challenge nonce before connect
        if (!this._connected && data.type === "event" && data.event === "connect.challenge") {
          challengeNonce = data.payload?.nonce ?? null;
          sendConnect(); // Send connect immediately with nonce
          return;
        }

        if (!this._connected && data.type === "event") return;

        if (!this._connected && data.type === "res") {
          clearTimeout(timeout);
          if (data.ok) {
            this._connected = true;
            this.connectPromise = null;
            this.reconnectAttempt = 0;
            this.options.onConnect?.();
            resolve();
          } else {
            const err = data.payload ?? data.error;
            ws.close();
            this.connectPromise = null;
            reject(new Error(err?.message ?? "Connection rejected"));
          }
          return;
        }

        if (data.type === "res" && data.id) {
          const pending = this.pending.get(data.id);
          if (pending) {
            this.pending.delete(data.id);
            clearTimeout(pending.timer);
            if (data.ok) {
              pending.resolve(data.payload ?? data.result);
            } else {
              const err = data.payload ?? data.error;
              pending.reject(new Error(err?.message ?? "RPC error"));
            }
          }
        }
      });

      ws.on("close", () => {
        const wasConnected = this._connected;
        this._connected = false;
        this.connectPromise = null;

        for (const [id, pending] of this.pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error("Connection closed"));
          this.pending.delete(id);
        }

        if (wasConnected) this.options.onDisconnect?.();

        if (!this.destroyed) this.scheduleReconnect();
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        this.connectPromise = null;
        this.options.onError?.(err);
        if (!this._connected) {
          reject(new Error("WebSocket error"));
          if (!this.destroyed) this.scheduleReconnect();
        }
      });
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 15000);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.destroyed) return;
      try {
        this.connectPromise = this.doConnect();
        await this.connectPromise;
      } catch {
        // onclose will trigger another reconnect
      }
    }, delay);
  }

  async request<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this._connected || !this.ws) {
      throw new Error("Not connected to gateway");
    }
    const id = this.nextId();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, 30_000);
      this.pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
      });
      this.ws!.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  waitForConnection(timeoutMs = 20_000): Promise<void> {
    if (this._connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        clearInterval(poll);
        reject(new Error("Timed out waiting for gateway reconnect"));
      }, timeoutMs);
      const poll = setInterval(() => {
        if (this._connected) {
          clearInterval(poll);
          clearTimeout(deadline);
          resolve();
        }
      }, 500);
    });
  }

  disconnect() {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }

  get isConnected() {
    return this._connected;
  }

  private nextId(): string {
    return `daemon-${++this.idCounter}`;
  }
}

// --- Typed API helpers ---

export type ConfigGetResult = {
  path: string;
  exists: boolean;
  raw: string;
  config: Record<string, unknown>;
  hash?: string;
};

export type ConfigPatchResult = {
  ok: boolean;
  path: string;
  config: Record<string, unknown>;
  restart?: unknown;
};

export type AgentFilesSetResult = {
  ok: boolean;
  agentId: string;
  workspace: string;
};

export function configApi(client: GatewayClient) {
  return {
    get: () => client.request<ConfigGetResult>("config.get", {}),
    patch: (raw: string, baseHash: string) =>
      client.request<ConfigPatchResult>("config.patch", { raw, baseHash }),
  };
}

export function agentsApi(client: GatewayClient) {
  return {
    filesSet: (agentId: string, name: string, content: string) =>
      client.request<AgentFilesSetResult>("agents.files.set", { agentId, name, content }),
  };
}

// --- Cron API ---

export type CronJob = {
  id: string;
  agentId?: string;
  name: string;
  enabled: boolean;
  schedule: Record<string, unknown>;
  sessionTarget: string;
  wakeMode: string;
  payload: Record<string, unknown>;
  state: Record<string, unknown>;
};

export type CronListResult = { jobs: CronJob[] };

export function cronApi(client: GatewayClient) {
  return {
    list: (opts?: { includeDisabled?: boolean }) =>
      client.request<CronListResult>("cron.list", opts ?? {}),
    add: (job: Record<string, unknown>) =>
      client.request<CronJob>("cron.add", job),
    update: (jobId: string, patch: Record<string, unknown>) =>
      client.request<CronJob>("cron.update", { jobId, patch }),
    remove: (jobId: string) =>
      client.request<{ ok: boolean }>("cron.remove", { jobId }),
  };
}
