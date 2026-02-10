interface Config {
  /** Health check port */
  port: number;
  nodeEnv: string;
  /** Harbor API base URL (e.g. https://harbor.example.com/api) */
  harborApiUrl: string;
  /** API key for authenticating with the harbor backend */
  harborApiKey: string;
  /** OpenClaw gateway URL (local) */
  gatewayUrl: string;
  /** OpenClaw gateway token */
  gatewayToken: string;
  /** How often the daemon tick runs (ms) */
  tickIntervalMs: number;
}

const config: Config = {
  port: Number(process.env.DAEMON_PORT) || 4747,
  nodeEnv: process.env.NODE_ENV || "development",
  harborApiUrl: process.env.HARBOR_API_URL || "http://localhost:3001/api",
  harborApiKey: process.env.HARBOR_API_KEY || "dev-api-key",
  gatewayUrl: process.env.GATEWAY_URL || "http://localhost:4740",
  gatewayToken: process.env.GATEWAY_TOKEN || "",
  tickIntervalMs: Number(process.env.TICK_INTERVAL_MS) || 10_000,
};

export default config;
