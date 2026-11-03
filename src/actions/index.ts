import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { and, count, eq } from "drizzle-orm";
import { doorwayState, isDoorbellOpen } from "../lib/events";
import { db, transaction, type Tx } from "../lib/db";
import { event, guest, rsvp } from "../lib/schema";
import { fromMelbourne } from "../lib/time";

function requireUser(context: ActionAPIContext) {
    const { user } = context.locals;
    if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Log in first" });
    return user;
}

function requireAdmin(context: ActionAPIContext) {
    const user = requireUser(context);
    if (user.role !== "admin") throw new ActionError({ code: "FORBIDDEN", message: "Admins only" });
    return user;
}

// Empty form fields arrive as null
const eventFields = z.object({
    title: z.string().trim().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    location: z.string().trim().max(200).nullable(),
    capacity: z.number().int().min(1).nullable(),
    description: z.string().trim().max(5000).nullable(),
});

function toEventRow(input: z.infer<typeof eventFields>) {
    const startsAt = fromMelbourne(input.date, input.startTime);
    let endsAt = fromMelbourne(input.date, input.endTime);
    // An end time before the start means it finishes after midnight
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
    return {
        title: input.title,
        startsAt,
        endsAt,
        location: input.location || null,
        capacity: input.capacity,
        description: input.description || null,
    };
}

const eventId = z.object({ eventId: z.string().min(1) });

/**
 * Locks the event row for the rest of the transaction, so concurrent requests
 * wait their turn and two people can't both take the last spot.
 */
async function lockEvent(tx: Tx, id: string) {
    const [target] = await tx
        .select({ capacity: event.capacity, startsAt: event.startsAt, endsAt: event.endsAt })
        .from(event)
        .where(eq(event.id, id))
        .for("update");
    if (!target) throw new ActionError({ code: "NOT_FOUND", message: "Event not found" });
    return target;
}

async function hasSpace(tx: Tx, id: string, capacity: number | null) {
    if (capacity === null) return true;
    const [[members], [guests]] = await Promise.all([
        tx.select({ n: count() }).from(rsvp).where(eq(rsvp.eventId, id)),
        tx.select({ n: count() }).from(guest).where(eq(guest.eventId, id)),
    ]);
    return members.n + guests.n < capacity;
}

async function findRsvp(tx: Tx, eventId: string, userId: string) {
    const [found] = await tx
        .select({ status: rsvp.status })
        .from(rsvp)
        .where(and(eq(rsvp.eventId, eventId), eq(rsvp.userId, userId)));
    return found ?? null;
}

const memberAtEvent = z.object({ eventId: z.string().min(1), userId: z.string().min(1) });

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
                    .returning({ id: event.id });
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
                    .returning({ id: event.id });
                if (!updated) throw new ActionError({ code: "NOT_FOUND", message: "Event not found" });
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
                await transaction(async (tx) => {
                    const target = await lockEvent(tx, input.eventId);
                    if (target.endsAt < new Date()) {
                        throw new ActionError({ code: "BAD_REQUEST", message: "That event has finished" });
                    }
                    if (await findRsvp(tx, input.eventId, user.id)) return;
                    if (!(await hasSpace(tx, input.eventId, target.capacity))) {
                        throw new ActionError({ code: "CONFLICT", message: "Sorry, that event is full" });
                    }
                    await tx.insert(rsvp).values({ eventId: input.eventId, userId: user.id });
                });
            },
        }),

        cancelRsvp: defineAction({
            accept: "form",
            input: eventId,
            handler: async (input, context) => {
                const user = requireUser(context);
                await db
                    .delete(rsvp)
                    .where(
                        and(
                            eq(rsvp.eventId, input.eventId),
                            eq(rsvp.userId, user.id),
                            eq(rsvp.status, "going"),
                        ),
                    );
            },
        }),

        ringDoorbell: defineAction({
            accept: "form",
            input: eventId,
            handler: async (input, context) => {
                const user = requireUser(context);
                await transaction(async (tx) => {
                    const target = await lockEvent(tx, input.eventId);
                    if (!isDoorbellOpen(target)) {
                        throw new ActionError({
                            code: "BAD_REQUEST",
                            message: "The doorbell opens 30 minutes before the event starts",
                        });
                    }

                    const existing = await findRsvp(tx, input.eventId, user.id);
                    if (existing?.status === "at_door" || existing?.status === "present") return;

                    if (existing) {
                        await tx
                            .update(rsvp)
                            .set({ status: "at_door", arrivedAt: new Date() })
                            .where(and(eq(rsvp.eventId, input.eventId), eq(rsvp.userId, user.id)));
                        return;
                    }

                    // Walk-ins without an RSVP get a spot if there's one left
                    if (!(await hasSpace(tx, input.eventId, target.capacity))) {
                        throw new ActionError({
                            code: "CONFLICT",
                            message: "Sorry, the event is full. Have a word with whoever's at the door.",
                        });
                    }
                    await tx.insert(rsvp).values({
                        eventId: input.eventId,
                        userId: user.id,
                        status: "at_door",
                        arrivedAt: new Date(),
                    });
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
                if (!state) throw new ActionError({ code: "NOT_FOUND", message: "Event not found" });
                return state;
            },
        }),

        welcome: defineAction({
            input: memberAtEvent,
            handler: async (input, context) => {
                requireAdmin(context);
                await db
                    .update(rsvp)
                    .set({ status: "present", welcomedAt: new Date() })
                    .where(and(eq(rsvp.eventId, input.eventId), eq(rsvp.userId, input.userId)));
            },
        }),

        addGuest: defineAction({
            input: z.object({ eventId: z.string().min(1), name: z.string().trim().min(1).max(64) }),
            handler: async (input, context) => {
                const admin = requireAdmin(context);
                // Guests take up a spot, but the admin at the door can go over capacity
                await db.insert(guest).values({ eventId: input.eventId, name: input.name, addedBy: admin.id });
            },
        }),

        removeGuest: defineAction({
            input: z.object({ guestId: z.string().min(1) }),
            handler: async (input, context) => {
                requireAdmin(context);
                await db.delete(guest).where(eq(guest.id, input.guestId));
            },
        }),
    },
};
