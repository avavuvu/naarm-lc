import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, type Tx } from "../lib/db";
import { doorwayState, isDoorbellOpen, isFull, lockEvent, rsvpTo, type RsvpResult } from "../lib/events";
import { event, guest, rsvp } from "../lib/schema";
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
    image: z
        .string()
        .trim()
        .regex(/^(\/|https:\/\/)\S+$/, { error: "the image needs to be a path like /events/poster.png, or a url" })
        .max(500)
        .nullable(),
});

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
                return updated;
            },
        }),

        delete: defineAction({
            accept: "form",
            input: eventId,
            handler: async (input, context) => {
                requireAdmin(context);
                await db.delete(event).where(eq(event.id, input.eventId));
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
