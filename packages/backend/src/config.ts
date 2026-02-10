interface Config {
  port: number;
  nodeEnv: string;
  databaseHost: string;
  databaseName: string;
  databasePort: number;
  databaseUser: string;
  databasePassword: string;
  apiKey: string;
  sessionSecret: string;
  adminPassword: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseHost: process.env.DATABASE_HOST!,
  databaseName: process.env.DATABASE_NAME!,
  databasePort: Number(process.env.DATABASE_PORT!),
  databaseUser: process.env.DATABASE_USER!,
  databasePassword: process.env.DATABASE_PASSWORD!,
  apiKey: process.env.API_KEY || "dev-api-key",
  sessionSecret: process.env.SESSION_SECRET || "dev-session-secret",
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
};

export default config;
