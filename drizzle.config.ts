import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: ["./packages/schema/src/index.ts"],
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT!),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    ssl: false,
  },
});
