import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { NETLIFY_BUILD_HOOK } from "astro:env/server";
import { z } from "astro/zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, type Tx } from "../lib/db";
import { doorwayState, isDoorbellOpen, isFull, lockEvent, rsvpTo, type RsvpResult } from "../lib/events";
import { slugTaken, uniqueSlug } from "../lib/members";
import { event, guest, rsvp, user } from "../lib/schema";
import { fromMelbourne } from "../lib/time";

function requireUser(context: ActionAPIContext) {
    const { user } = context.locals;
    if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "log in first" });
    return user;
}

function requireAdmin(context: ActionAPIContext) {
    const user = requireUser(context);
    if (user.role !== "admin") throw new ActionError({ code: "FORBIDDEN", message: "admins only" });
    return user;
}

const imageField = z
    .string()
    .trim()
    .regex(/^(\/|https:\/\/)\S+$/, { error: "the image needs to be a path like /events/poster.png, or a url" })
    .max(500)
    .nullable();

const eventFields = z.object({
    kind: z.enum(["meetup", "gig"]),
    title: z.string().trim().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    location: z.string().trim().max(200).nullable(),
    privateLocation: z.string().trim().max(300).nullable(),
    capacity: z.number().int().min(1).nullable(),
    description: z.string().trim().max(5000).nullable(),
    url: z.url({ protocol: /^https?$/, error: "the link needs to be a full url, like https://…" }).max(500).nullable(),
    image: imageField,
});

const MAX_LINKS = 10;
const linkUrl = z.url({ protocol: /^https?$/ }).max(500);

const profileFields = z.object({
    name: z.string().trim().min(1, "names are 1–64 characters").max(64, "names are 1–64 characters"),
    alias: z.string().trim().max(64).nullable(),
    bio: z.string().trim().max(2000).nullable(),
    image: imageField,
    links: z
        .string()
        .max(MAX_LINKS * 500)
        .nullable()
        .transform((text, ctx) => {
            const links = (text ?? "").split(/\s+/).filter(Boolean);
            if (links.length > MAX_LINKS) {
                ctx.addIssue({ code: "custom", message: `you can add up to ${MAX_LINKS} links` });
                return z.NEVER;
            }
            const bad = links.find((link) => !linkUrl.safeParse(link).success);
            if (bad) {
                ctx.addIssue({ code: "custom", message: `"${bad}" needs to be a full url, like https://…` });
                return z.NEVER;
            }
            return links;
        }),
});

function toProfileRow(input: z.infer<typeof profileFields>) {
    return {
        name: input.name,
        alias: input.alias || null,
        bio: input.bio || null,
        image: input.image || null,
        links: input.links,
    };
}

const userId = z.object({ userId: z.string().min(1) });

const slugField = z
    .string()
    .trim()
    .toLowerCase()
    .max(48)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "the url name can only use letters, numbers and dashes" });

async function setStatus(id: string, status: "approved" | "declined") {
    const [target] = await db.select({ name: user.name, slug: user.slug }).from(user).where(eq(user.id, id));
    if (!target) throw new ActionError({ code: "NOT_FOUND", message: "account not found" });
    const slug = target.slug ?? (status === "approved" ? await uniqueSlug(target.name, id) : null);
    await db.update(user).set({ status, slug }).where(eq(user.id, id));
    return { slug };
}

function toEventRow(input: z.infer<typeof eventFields>) {
    const gig = input.kind === "gig";
    if (gig && !input.url) {
        throw new ActionError({ code: "BAD_REQUEST", message: "gigs need a ticket link" });
    }
    const startsAt = fromMelbourne(input.date, input.startTime);
    let endsAt = fromMelbourne(input.date, input.endTime);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
    return {
        kind: input.kind,
        title: input.title,
        startsAt,
        endsAt,
        location: input.location || null,
        privateLocation: gig ? null : input.privateLocation || null,
        capacity: gig ? null : input.capacity,
        description: input.description || null,
        url: gig ? input.url : null,
        image: input.image || null,
    };
}

const id = z.coerce.number().int().positive();

const eventId = z.object({ eventId: id });

const rsvpErrors: Record<Exclude<RsvpResult, "ok">, ConstructorParameters<typeof ActionError>[0]> = {
    not_found: { code: "NOT_FOUND", message: "event not found" },
    gig: { code: "BAD_REQUEST", message: "this is a gig. use its link to get tickets" },
    finished: { code: "BAD_REQUEST", message: "that event has finished" },
    full: { code: "CONFLICT", message: "sorry, that event is full" },
};

const isRsvp = (eventId: number, userId: string) => and(eq(rsvp.eventId, eventId), eq(rsvp.userId, userId));

async function lockedEvent(tx: Tx, id: number) {
    const target = await lockEvent(tx, id);
    if (!target) throw new ActionError({ code: "NOT_FOUND", message: "event not found" });
    return target;
}

async function findRsvp(tx: Tx, eventId: number, userId: string) {
    const [found] = await tx
        .select({ arrivedAt: rsvp.arrivedAt, welcomedAt: rsvp.welcomedAt })
        .from(rsvp)
        .where(isRsvp(eventId, userId));
    return found ?? null;
}

async function rebuildHomePage() {
    if (!NETLIFY_BUILD_HOOK) return;
    await fetch(NETLIFY_BUILD_HOOK, { method: "POST" }).catch((error) => console.error("build hook failed", error));
}

export const server = {
    events: {
        create: defineAction({
            accept: "form",
            input: eventFields,
            handler: async (input, context) => {
                const admin = requireAdmin(context);
                const [created] = await db
                    .insert(event)
                    .values({ ...toEventRow(input), createdBy: admin.id })
                    .returning({ id: event.id, title: event.title });
                await rebuildHomePage();
                return created;
            },
        }),

        update: defineAction({
            accept: "form",
            input: eventFields.extend(eventId.shape),
            handler: async (input, context) => {
                requireAdmin(context);
                const [updated] = await db
                    .update(event)
                    .set(toEventRow(input))
                    .where(eq(event.id, input.eventId))
                    .returning({ id: event.id, title: event.title });
                if (!updated) throw new ActionError({ code: "NOT_FOUND", message: "event not found" });
                await rebuildHomePage();
                return updated;
            },
        }),

        delete: defineAction({
            accept: "form",
            input: eventId,
            handler: async (input, context) => {
                requireAdmin(context);
                await db.delete(event).where(eq(event.id, input.eventId));
                await rebuildHomePage();
            },
        }),

        rsvp: defineAction({
            accept: "form",
            input: eventId,
            handler: async (input, context) => {
                const user = requireUser(context);
                const result = await rsvpTo(input.eventId, user.id);
                if (result !== "ok") throw new ActionError(rsvpErrors[result]);
            },
        }),

        cancelRsvp: defineAction({
            accept: "form",
            input: eventId,
            handler: async (input, context) => {
                const user = requireUser(context);
                await db
                    .delete(rsvp)
                    .where(and(isRsvp(input.eventId, user.id), isNull(rsvp.arrivedAt), isNull(rsvp.welcomedAt)));
            },
        }),

        ringDoorbell: defineAction({
            accept: "form",
            input: eventId,
            handler: async (input, context) => {
                const user = requireUser(context);
                await db.transaction(async (tx) => {
                    const target = await lockedEvent(tx, input.eventId);
                    if (target.kind !== "meetup") throw new ActionError(rsvpErrors.gig);
                    if (!isDoorbellOpen(target)) {
                        throw new ActionError({
                            code: "BAD_REQUEST",
                            message: "the doorbell opens 30 minutes before the event starts",
                        });
                    }

                    const existing = await findRsvp(tx, input.eventId, user.id);
                    if (existing?.arrivedAt || existing?.welcomedAt) return;

                    if (existing) {
                        await tx
                            .update(rsvp)
                            .set({ arrivedAt: new Date() })
                            .where(isRsvp(input.eventId, user.id));
                        return;
                    }

                    if (isFull(target)) {
                        throw new ActionError({
                            code: "CONFLICT",
                            message: "sorry, the event is full. have a word with whoever's at the door.",
                        });
                    }
                    await tx.insert(rsvp).values({ eventId: input.eventId, userId: user.id, arrivedAt: new Date() });
                });
            },
        }),
    },

    profile: {
        update: defineAction({
            accept: "form",
            input: profileFields,
            handler: async (input, context) => {
                const me = requireUser(context);
                await db.update(user).set(toProfileRow(input)).where(eq(user.id, me.id));
            },
        }),
    },

    members: {
        approve: defineAction({
            accept: "form",
            input: userId,
            handler: async (input, context) => {
                requireAdmin(context);
                return setStatus(input.userId, "approved");
            },
        }),

        decline: defineAction({
            accept: "form",
            input: userId,
            handler: async (input, context) => {
                requireAdmin(context);
                return setStatus(input.userId, "declined");
            },
        }),

        update: defineAction({
            accept: "form",
            input: profileFields.extend(userId.shape).extend({ slug: slugField }),
            handler: async (input, context) => {
                requireAdmin(context);
                if (await slugTaken(input.slug, input.userId)) {
                    throw new ActionError({ code: "CONFLICT", message: `another member already uses /members/${input.slug}` });
                }
                const [updated] = await db
                    .update(user)
                    .set({ ...toProfileRow(input), slug: input.slug })
                    .where(eq(user.id, input.userId))
                    .returning({ slug: user.slug });
                if (!updated) throw new ActionError({ code: "NOT_FOUND", message: "account not found" });
                return { slug: input.slug };
            },
        }),

        delete: defineAction({
            accept: "form",
            input: userId,
            handler: async (input, context) => {
                const admin = requireAdmin(context);
                if (input.userId === admin.id) {
                    throw new ActionError({ code: "BAD_REQUEST", message: "you can't delete your own account here" });
                }
                await db.delete(user).where(eq(user.id, input.userId));
            },
        }),
    },

    doorway: {
        state: defineAction({
            input: eventId,
            handler: async (input, context) => {
                requireAdmin(context);
                const state = await doorwayState(input.eventId);
                if (!state) throw new ActionError({ code: "NOT_FOUND", message: "event not found" });
                return state;
            },
        }),

        welcome: defineAction({
            input: z.object({ eventId: id, userId: z.string().min(1) }),
            handler: async (input, context) => {
                requireAdmin(context);
                const [welcomed] = await db
                    .update(rsvp)
                    .set({ welcomedAt: new Date() })
                    .where(isRsvp(input.eventId, input.userId))
                    .returning({ userId: rsvp.userId });
                if (!welcomed) throw new ActionError({ code: "NOT_FOUND", message: "they haven't rsvp'd" });
            },
        }),

        addGuest: defineAction({
            input: z.object({ eventId: id, name: z.string().trim().min(1).max(64) }),
            handler: async (input, context) => {
                const admin = requireAdmin(context);
                await db.insert(guest).values({ eventId: input.eventId, name: input.name, addedBy: admin.id });
            },
        }),

        removeGuest: defineAction({
            input: z.object({ guestId: id }),
            handler: async (input, context) => {
                requireAdmin(context);
                await db.delete(guest).where(eq(guest.id, input.guestId));
            },
        }),
    },
};
