import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { and, count, eq } from "drizzle-orm";
import { db, transaction } from "../lib/db";
import { event, rsvp } from "../lib/schema";
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
                    // Locking the event makes concurrent RSVPs wait their turn,
                    // so two people can't both take the last spot
                    const [target] = await tx
                        .select({ capacity: event.capacity, endsAt: event.endsAt })
                        .from(event)
                        .where(eq(event.id, input.eventId))
                        .for("update");
                    if (!target) throw new ActionError({ code: "NOT_FOUND", message: "Event not found" });
                    if (target.endsAt < new Date()) {
                        throw new ActionError({ code: "BAD_REQUEST", message: "That event has finished" });
                    }

                    const [existing] = await tx
                        .select({ userId: rsvp.userId })
                        .from(rsvp)
                        .where(and(eq(rsvp.eventId, input.eventId), eq(rsvp.userId, user.id)));
                    if (existing) return;

                    if (target.capacity !== null) {
                        const [{ going }] = await tx
                            .select({ going: count() })
                            .from(rsvp)
                            .where(eq(rsvp.eventId, input.eventId));
                        if (going >= target.capacity) {
                            throw new ActionError({ code: "CONFLICT", message: "Sorry, that event is full" });
                        }
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
                    .where(and(eq(rsvp.eventId, input.eventId), eq(rsvp.userId, user.id)));
            },
        }),
    },
};
