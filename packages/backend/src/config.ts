import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  userPoolId: string;
  clientId: string;
  databaseHost: string;
  databaseName: string;
  databasePort: number;
  databaseUser: string;
  databasePassword: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  databaseHost: process.env.DATABASE_HOST!,
  databaseName: process.env.DATABASE_NAME!,
  databasePort: Number(process.env.DATABASE_PORT!),
  databaseUser: process.env.DATABASE_USER!,
  databasePassword: process.env.DATABASE_PASSWORD!,
};

export default config;
