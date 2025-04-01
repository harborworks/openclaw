import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import config from "../config";

export const db = drizzle(
  new Pool({
    host: config.databaseHost,
    port: config.databasePort,
    user: config.databaseUser,
    password: config.databasePassword,
    database: config.databaseName,
    ssl: !config.databaseHost.includes("localhost"),
  }),
  { casing: "snake_case" }
);

export * from "./users";
