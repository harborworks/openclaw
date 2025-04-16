import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import config from "../config";
import { cert } from "./cert";

// Connect to the database
export const db = drizzle(
  new Pool({
    host: config.databaseHost,
    port: config.databasePort,
    user: config.databaseUser,
    password: config.databasePassword,
    database: config.databaseName,
    ssl: config.databaseHost.includes("localhost")
      ? false
      : {
          ca: cert,
        },
  }),
  { casing: "snake_case" }
);

// Re-export all functions from the database modules
export * from "./jobs";
export * from "./memberships";
export * from "./orgs";
export * from "./tags";
export * from "./tasks";
export * from "./users";
