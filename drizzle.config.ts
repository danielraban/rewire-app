import { defineConfig } from "drizzle-kit";

// Migrations run as the owner role (DATABASE_URL); the app uses the narrower roles in db/roles.sql.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
