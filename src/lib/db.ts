import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { DATABASE_URL } from "astro:env/server";
import * as schema from "./schema";

// HTTP: fast one-shot queries, but no interactive transactions
export const db = drizzle(neon(DATABASE_URL), { schema });

const poolDb = (pool: Pool) => drizzleWs(pool, { schema });
export type Tx = Parameters<Parameters<ReturnType<typeof poolDb>["transaction"]>[0]>[0];

// WebSocket pool, opened per call and closed after, as Neon recommends for serverless
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const pool = new Pool({ connectionString: DATABASE_URL });
    try {
        return await poolDb(pool).transaction(fn);
    } finally {
        await pool.end();
    }
}
