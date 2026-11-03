import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { avatar } from "../../lib/schema";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    const [found] = await db
        .select({ data: avatar.data })
        .from(avatar)
        .where(eq(avatar.userId, params.id!));
    if (!found) return new Response("Not found", { status: 404 });

    return new Response(Buffer.from(found.data, "base64"), {
        headers: {
            "Content-Type": "image/jpeg",
            // URLs carry a ?v= version that changes with each upload
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'",
        },
    });
};
