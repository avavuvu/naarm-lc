import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import { db } from "../../lib/db";

export const prerender = false;

export const GET: APIRoute = async () => {
    const result = await db.execute(sql`select now() as time`);
    return Response.json({ ok: true, db: result.rows[0] });
};
