import type { APIRoute } from "astro";
import { profileBySlug } from "../../../lib/members";
import { mosaic } from "../../../lib/mosaic";

export const prerender = false;

const MAX_BYTES = 10 * 1024 * 1024;

async function download(source: URL) {
    const response = await fetch(source, { signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) return null;
    if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length > MAX_BYTES ? null : bytes;
}

// The member's picture redrawn as the site's blue text mosaic. Pages link here with ?v=<last update>,
// so a changed picture gets a new url and the old one can be cached for a long time.
// Only approved members' pictures are downloaded and redrawn; anyone else gets their original picture.
export const GET: APIRoute = async ({ params, locals, url }) => {
    const member = await profileBySlug(params.member ?? "");
    const viewer = locals.user;
    const visible = member && (member.status === "approved" || viewer?.role === "admin" || viewer?.id === member.id);
    if (!visible || !member.image) return new Response("not found", { status: 404 });

    const source = new URL(member.image, url);
    if (source.protocol !== "https:" && source.origin !== url.origin) {
        return new Response("not found", { status: 404 });
    }

    if (member.status !== "approved") return Response.redirect(source, 302);

    const version = String(member.updatedAt.getTime());
    if (url.searchParams.get("v") !== version) {
        return Response.redirect(new URL(`${url.pathname}?v=${version}`, url), 302);
    }

    try {
        const original = await download(source);
        if (!original) throw new Error(`couldn't download ${source}`);
        const image = await mosaic(original);
        return new Response(new Uint8Array(image), {
            headers: {
                "Content-Type": "image/webp",
                "Cache-Control": "public, max-age=86400",
                "Netlify-CDN-Cache-Control": "public, max-age=31536000, durable",
            },
        });
    } catch (error) {
        console.error("portrait failed", error);
        return Response.redirect(source, 302);
    }
};
