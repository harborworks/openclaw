import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import config from "../config";

// Connect to the database
export const db = drizzle(
  new Pool({
    host: config.databaseHost,
    port: config.databasePort,
    user: config.databaseUser,
    password: config.databasePassword,
    database: config.databaseName,
    ssl: false,
  }),
  { casing: "snake_case" }
);

export * from "./agents";
export * from "./notifications";
export * from "./secrets";
