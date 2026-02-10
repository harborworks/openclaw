interface Config {
  port: number;
  nodeEnv: string;
  databaseHost: string;
  databaseName: string;
  databasePort: number;
  databaseUser: string;
  databasePassword: string;
  /** How often the daemon tick runs (ms) */
  tickIntervalMs: number;
  /** OpenClaw gateway URL for agent wake/cron sync */
  gatewayUrl: string;
  /** OpenClaw gateway token */
  gatewayToken: string;
}

const config: Config = {
  port: Number(process.env.DAEMON_PORT) || 4747,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseHost: process.env.DATABASE_HOST!,
  databaseName: process.env.DATABASE_NAME!,
  databasePort: Number(process.env.DATABASE_PORT!),
  databaseUser: process.env.DATABASE_USER!,
  databasePassword: process.env.DATABASE_PASSWORD!,
  tickIntervalMs: Number(process.env.TICK_INTERVAL_MS) || 10_000,
  gatewayUrl: process.env.GATEWAY_URL || "http://localhost:4740",
  gatewayToken: process.env.GATEWAY_TOKEN || "",
};

export default config;
