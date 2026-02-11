interface Config {
  port: number;
  nodeEnv: string;
  databaseHost: string;
  databaseName: string;
  databasePort: number;
  databaseUser: string;
  databasePassword: string;
  /** Global API key for daemon auth */
  apiKey: string;
  encryptionKey: string;
  // Auth0
  auth0Domain: string;
  auth0Audience: string;
  auth0ClientId: string;
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
  encryptionKey: process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "dev-encryption-key",
  // Auth0
  auth0Domain: process.env.AUTH0_DOMAIN || "",
  auth0Audience: process.env.AUTH0_AUDIENCE || "",
  auth0ClientId: process.env.AUTH0_CLIENT_ID || "",
};

export default config;
