import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const isLocalhost = process.env.DATABASE_HOST === "localhost";

// Try to import cert from either dist (Docker/production) or src (local dev)
let cert: string | undefined;
try {
  const distCertPath = path.join(__dirname, "packages/backend/dist/db/cert.js");
  const srcCertPath = path.join(__dirname, "packages/backend/src/db/cert.ts");

  if (fs.existsSync(distCertPath)) {
    cert = require(distCertPath).cert;
  } else if (fs.existsSync(srcCertPath)) {
    cert = require(srcCertPath).cert;
  }
} catch (error) {
  // If we can't load cert, we'll just use basic SSL
  console.warn("Could not load RDS certificate, using basic SSL");
}

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
    ssl: isLocalhost ? false : cert ? { ca: cert } : true,
  },
});
