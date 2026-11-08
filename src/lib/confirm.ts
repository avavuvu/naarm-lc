import { createHmac, timingSafeEqual } from "node:crypto";
import { BETTER_AUTH_SECRET } from "astro:env/server";

export const CONFIRM_PATH = "/confirm";

const sign = (email: string, name: string, eventId: string) =>
    createHmac("sha256", BETTER_AUTH_SECRET)
        .update(JSON.stringify([email.toLowerCase(), name, eventId]))
        .digest("base64url");

export function signConfirmLink(magicLink: string, email: string, name: string) {
    const url = new URL(magicLink);
    const callback = new URL(url.searchParams.get("callbackURL") ?? "/", url);
    if (callback.pathname !== CONFIRM_PATH) return { url: magicLink, eventId: null };

    const eventId = callback.searchParams.get("event") ?? "";
    callback.searchParams.set("name", name);
    callback.searchParams.set("sig", sign(email, name, eventId));
    url.searchParams.set("callbackURL", callback.pathname + callback.search);
    return { url: url.toString(), eventId: eventId || null };
}

export function verifyConfirm(email: string, params: URLSearchParams) {
    const name = params.get("name") ?? "";
    const eventId = params.get("event") ?? "";
    const expected = Buffer.from(sign(email, name, eventId));
    const given = Buffer.from(params.get("sig") ?? "");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    return { name, eventId: eventId || null };
}
