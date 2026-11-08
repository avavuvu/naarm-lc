import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
    ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
    return auth.handler(ctx.request);
};
