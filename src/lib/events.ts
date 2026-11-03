import { and, asc, desc, eq, getTableColumns, gt, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { event, guest, rsvp, user } from "./schema";

/** The doorbell and doorway open this long before an event starts */
export const DOORBELL_OPENS_MS = 30 * 60 * 1000;

export function isDoorbellOpen(target: { startsAt: Date; endsAt: Date }, now = new Date()) {
    return target.startsAt.getTime() - DOORBELL_OPENS_MS <= now.getTime() && now < target.endsAt;
}

// Drizzle leaves columns unqualified in single-table queries, so inside a
// subquery a bare "id" would mean the subquery's own table. Spell it out.
const eventIdColumn = sql.raw(`"event"."id"`);

// Members who RSVP'd plus guests: everyone taking up a spot
const spotsTaken = sql<number>`cast(
    (select count(*) from ${rsvp} where ${rsvp.eventId} = ${eventIdColumn}) +
    (select count(*) from ${guest} where ${guest.eventId} = ${eventIdColumn})
as int)`;

/** Events that haven't finished yet, soonest first, with `userId`'s RSVP status */
export async function upcomingEvents(userId: string | null) {
    return db
        .select({
            ...getTableColumns(event),
            going: spotsTaken,
            myStatus: sql<"going" | "at_door" | "present" | null>`(
                select ${rsvp.status} from ${rsvp}
                where ${rsvp.eventId} = ${eventIdColumn} and ${rsvp.userId} = ${userId ?? ""}
            )`,
        })
        .from(event)
        .where(gt(event.endsAt, new Date()))
        .orderBy(asc(event.startsAt));
}

/** Every event, newest first, for admins */
export async function allEvents() {
    return db
        .select({ ...getTableColumns(event), going: spotsTaken })
        .from(event)
        .orderBy(desc(event.startsAt));
}

export async function eventById(id: string) {
    const [found] = await db
        .select({ ...getTableColumns(event), going: spotsTaken })
        .from(event)
        .where(eq(event.id, id));
    return found ?? null;
}

/** The event whose doorbell is open now, if any (the earliest, if several overlap) */
export async function currentEvent() {
    const now = new Date();
    const [found] = await db
        .select({ id: event.id })
        .from(event)
        .where(
            and(
                lte(event.startsAt, new Date(now.getTime() + DOORBELL_OPENS_MS)),
                gt(event.endsAt, now),
            ),
        )
        .orderBy(asc(event.startsAt))
        .limit(1);
    return found?.id ?? null;
}

/** Members who RSVP'd, in the order they did, with where they're up to */
export async function attendees(eventId: string) {
    return db
        .select({
            id: user.id,
            name: user.name,
            username: user.username,
            image: user.image,
            status: rsvp.status,
            arrivedAt: rsvp.arrivedAt,
            welcomedAt: rsvp.welcomedAt,
        })
        .from(rsvp)
        .innerJoin(user, eq(user.id, rsvp.userId))
        .where(eq(rsvp.eventId, eventId))
        .orderBy(asc(rsvp.createdAt));
}

export async function guests(eventId: string) {
    return db
        .select({ id: guest.id, name: guest.name, createdAt: guest.createdAt })
        .from(guest)
        .where(eq(guest.eventId, eventId))
        .orderBy(asc(guest.createdAt));
}

/** Everything the doorway shows, in one go */
export async function doorwayState(eventId: string) {
    const target = await eventById(eventId);
    if (!target) return null;
    const [members, guestList] = await Promise.all([attendees(eventId), guests(eventId)]);
    return {
        event: {
            id: target.id,
            title: target.title,
            capacity: target.capacity,
            startsAt: target.startsAt.toISOString(),
            endsAt: target.endsAt.toISOString(),
        },
        spotsTaken: target.going,
        atDoor: members
            .filter((member) => member.status === "at_door")
            .sort((a, b) => (a.arrivedAt?.getTime() ?? 0) - (b.arrivedAt?.getTime() ?? 0)),
        coming: members.filter((member) => member.status === "going"),
        present: members.filter((member) => member.status === "present"),
        guests: guestList,
    };
}

export type DoorwayState = NonNullable<Awaited<ReturnType<typeof doorwayState>>>;
