import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import config from "../config";
import { cert } from "./cert";
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

export * from "./users";
