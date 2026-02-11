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
  // Cognito
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoRegion: string;
  /** Comma-separated emails auto-promoted to superadmin on login */
  superadminEmails: string[];
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
  // Cognito
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID || "",
  cognitoRegion: process.env.COGNITO_REGION || "us-east-1",
  superadminEmails: (process.env.SUPERADMIN_EMAILS || "ben@sparrow.dev")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};

export default config;
