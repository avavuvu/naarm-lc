import { and, asc, desc, eq, like, ne, or } from "drizzle-orm";
import slugify from "slugify";
import { db } from "./db";
import { user } from "./schema";

export type MemberStatus = "pending" | "approved" | "declined";

const LINK_LABELS: [RegExp, string][] = [
    [/(^|\.)instagram\.com$/, "instagram"],
    [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
    [/(^|\.)soundcloud\.com$/, "soundcloud"],
    [/(^|\.)bandcamp\.com$/, "bandcamp"],
    [/(^|\.)(twitter\.com|x\.com)$/, "twitter"],
    [/(^|\.)github\.com$/, "github"],
];

export function linkLabel(link: string) {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return LINK_LABELS.find(([pattern]) => pattern.test(host))?.[1] ?? host;
}

export function memberPath(member: { slug: string }) {
    return `/members/${member.slug}`;
}

const profileColumns = {
    id: user.id,
    name: user.name,
    alias: user.alias,
    bio: user.bio,
    image: user.image,
    links: user.links,
    slug: user.slug,
    status: user.status,
    updatedAt: user.updatedAt,
};

export type Profile = NonNullable<Awaited<ReturnType<typeof profileById>>>;

export async function profileById(id: string) {
    const [found] = await db.select(profileColumns).from(user).where(eq(user.id, id));
    return found ?? null;
}

export async function profileBySlug(slug: string) {
    const [found] = await db.select(profileColumns).from(user).where(eq(user.slug, slug));
    return found ? { ...found, slug } : null;
}

export async function approvedMembers() {
    const rows = await db
        .select(profileColumns)
        .from(user)
        .where(eq(user.status, "approved"))
        .orderBy(asc(user.name));
    return rows.map((row) => ({ ...row, slug: row.slug! }));
}

// Discord accounts without an email get a placeholder address ending in .invalid
const realEmail = (address: string) => (address.endsWith(".invalid") ? null : address);

export async function accountEmail(id: string) {
    const [found] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
    return found ? realEmail(found.email) : null;
}

export async function accountsForAdmin() {
    const rows = await db
        .select({ ...profileColumns, email: user.email, role: user.role, createdAt: user.createdAt })
        .from(user)
        .orderBy(desc(user.createdAt));
    const accounts = rows.map((row) => ({ ...row, email: realEmail(row.email) }));
    return {
        pending: accounts.filter((account) => account.status === "pending"),
        approved: accounts
            .filter((account) => account.status === "approved")
            .sort((a, b) => a.name.localeCompare(b.name)),
        declined: accounts.filter((account) => account.status === "declined"),
    };
}

export type AdminAccount = Awaited<ReturnType<typeof accountsForAdmin>>["pending"][number];

export async function pendingCount() {
    return db.$count(user, eq(user.status, "pending"));
}

export function toSlug(text: string) {
    return slugify(text, { lower: true, strict: true }).slice(0, 48).replace(/-+$/, "");
}

// Picks `base`, or `base-2`, `base-3`… if another account already has it.
export async function uniqueSlug(text: string, forUserId: string) {
    const base = toSlug(text) || "member";
    const taken = await db
        .select({ slug: user.slug })
        .from(user)
        .where(and(ne(user.id, forUserId), or(eq(user.slug, base), like(user.slug, `${base}-%`))));
    const used = new Set(taken.map((row) => row.slug));
    if (!used.has(base)) return base;
    for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

export async function slugTaken(slug: string, forUserId: string) {
    const [found] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.slug, slug), ne(user.id, forUserId)));
    return Boolean(found);
}
