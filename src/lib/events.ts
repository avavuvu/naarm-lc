import { asc, desc, eq, getTableColumns, gt, sql } from "drizzle-orm";
import { db } from "./db";
import { event, rsvp, user } from "./schema";

const going = sql<number>`cast(count(${rsvp.userId}) as int)`;

/** Events that haven't finished yet, soonest first, with whether `userId` is going */
export async function upcomingEvents(userId: string | null) {
    const rows = await db
        .select({
            ...getTableColumns(event),
            going,
            isGoing: sql<boolean>`coalesce(bool_or(${rsvp.userId} = ${userId ?? ""}), false)`,
        })
        .from(event)
        .leftJoin(rsvp, eq(rsvp.eventId, event.id))
        .where(gt(event.endsAt, new Date()))
        .groupBy(event.id)
        .orderBy(asc(event.startsAt));
    return rows;
}

/** Every event, newest first, for admins */
export async function allEvents() {
    return db
        .select({ ...getTableColumns(event), going })
        .from(event)
        .leftJoin(rsvp, eq(rsvp.eventId, event.id))
        .groupBy(event.id)
        .orderBy(desc(event.startsAt));
}

export async function eventById(id: string) {
    const [found] = await db.select().from(event).where(eq(event.id, id));
    return found ?? null;
}

/** Who's going, in the order they RSVP'd */
export async function attendees(eventId: string) {
    return db
        .select({
            id: user.id,
            name: user.name,
            username: user.username,
            image: user.image,
            rsvpAt: rsvp.createdAt,
        })
        .from(rsvp)
        .innerJoin(user, eq(user.id, rsvp.userId))
        .where(eq(rsvp.eventId, eventId))
        .orderBy(asc(rsvp.createdAt));
}
