import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { DATABASE_URL } from "astro:env/server";
import * as schema from "./schema";

export const db = drizzle(new pg.Pool({ connectionString: DATABASE_URL, max: 3 }), { schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
