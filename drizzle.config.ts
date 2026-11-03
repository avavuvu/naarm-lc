import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations use the direct (unpooled) connection, as Neon recommends
export default defineConfig({
    schema: ["./src/lib/schema/auth.ts", "./src/lib/schema/events.ts"],
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
