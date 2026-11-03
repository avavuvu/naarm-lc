import { and, asc, eq, getTableColumns, gt, lte, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "./db";
import { eventPath } from "./paths";
import { event, guest, rsvp, user } from "./schema";

export const DOORBELL_OPENS_MS = 30 * 60 * 1000;

export type RsvpStatus = "going" | "at_door" | "present";

export function rsvpStatus(row: { arrivedAt: Date | null; welcomedAt: Date | null }): RsvpStatus {
    if (row.welcomedAt) return "present";
    if (row.arrivedAt) return "at_door";
    return "going";
}

export function isDoorbellOpen(target: { startsAt: Date; endsAt: Date }, now = new Date()) {
    return target.startsAt.getTime() - DOORBELL_OPENS_MS <= now.getTime() && now < target.endsAt;
}

export function isFull(target: { capacity: number | null; spotsTaken: number }) {
    return target.capacity !== null && target.spotsTaken >= target.capacity;
}

export type EventKind = "meetup" | "gig";

export type EventAction = "ended" | "tickets" | "login" | "rsvp" | "full" | "going" | "ring" | RsvpStatus;

export function eventAction(
    target: {
        kind: EventKind;
        startsAt: Date;
        endsAt: Date;
        capacity: number | null;
        spotsTaken: number;
        myStatus: RsvpStatus | null;
    },
    loggedIn: boolean,
): EventAction {
    if (target.endsAt <= new Date()) return "ended";
    if (target.kind === "gig") return "tickets";
    if (!loggedIn) return isFull(target) ? "full" : "login";
    if (target.myStatus === "at_door" || target.myStatus === "present") return target.myStatus;
    if (isDoorbellOpen(target)) return "ring";
    if (target.myStatus === "going") return "going";
    if (isFull(target)) return "full";
    return "rsvp";
}

const eventIdColumn = sql.raw(`"event"."id"`);

const spotsTaken = sql<number>`cast(
    (select count(*) from ${rsvp} where ${rsvp.eventId} = ${eventIdColumn}) +
    (select count(*) from ${guest} where ${guest.eventId} = ${eventIdColumn})
as int)`;

export async function lockEvent(tx: Tx, id: number) {
    const [target] = await tx
        .select({ kind: event.kind, capacity: event.capacity, startsAt: event.startsAt, endsAt: event.endsAt })
        .from(event)
        .where(eq(event.id, id))
        .for("update");
    if (!target) return null;
    const [counted] = await tx.select({ spotsTaken }).from(event).where(eq(event.id, id));
    return { ...target, spotsTaken: counted.spotsTaken };
}

export type RsvpResult = "ok" | "not_found" | "gig" | "finished" | "full";

export async function rsvpTo(eventId: number, userId: string): Promise<RsvpResult> {
    return db.transaction(async (tx) => {
        const target = await lockEvent(tx, eventId);
        if (!target) return "not_found";
        if (target.kind !== "meetup") return "gig";
        if (target.endsAt < new Date()) return "finished";
        const [existing] = await tx
            .select({ userId: rsvp.userId })
            .from(rsvp)
            .where(and(eq(rsvp.eventId, eventId), eq(rsvp.userId, userId)));
        if (existing) return "ok";
        if (isFull(target)) return "full";
        await tx.insert(rsvp).values({ eventId, userId });
        return "ok";
    });
}

async function eventsForViewer(userId: string | null, where: SQL | undefined) {
    const rows = await db
        .select({
            ...getTableColumns(event),
            spotsTaken,
            rsvpAt: rsvp.createdAt,
            arrivedAt: rsvp.arrivedAt,
            welcomedAt: rsvp.welcomedAt,
        })
        .from(event)
        .leftJoin(rsvp, and(eq(rsvp.eventId, event.id), eq(rsvp.userId, userId ?? "")))
        .where(where)
        .orderBy(asc(event.startsAt));
    return rows.map(({ rsvpAt, arrivedAt, welcomedAt, privateLocation, ...item }) => ({
        ...item,
        location: (rsvpAt && privateLocation) || item.location,
        locationHidden: !rsvpAt && Boolean(privateLocation),
        myStatus: rsvpAt ? rsvpStatus({ arrivedAt, welcomedAt }) : null,
    }));
}

export function upcomingEvents(userId: string | null) {
    return eventsForViewer(userId, gt(event.endsAt, new Date()));
}

export async function nextMeetup(userId: string | null) {
    const [found] = await eventsForViewer(userId, and(gt(event.endsAt, new Date()), eq(event.kind, "meetup")));
    return found ?? null;
}

export async function pastEvents() {
    const events = await eventsForViewer(null, lte(event.endsAt, new Date()));
    return events.reverse();
}

export async function eventForViewer(id: number, userId: string | null) {
    const [found] = await eventsForViewer(userId, eq(event.id, id));
    return found ?? null;
}

export type ViewerEvent = NonNullable<Awaited<ReturnType<typeof eventForViewer>>>;

export async function eventById(id: number) {
    const [found] = await db
        .select({ ...getTableColumns(event), spotsTaken })
        .from(event)
        .where(eq(event.id, id));
    return found ?? null;
}

export async function currentEvent() {
    const events = await upcomingEvents(null);
    return events.find((item) => item.kind === "meetup" && isDoorbellOpen(item)) ?? null;
}

export async function attendees(eventId: number) {
    const rows = await db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            rsvpAt: rsvp.createdAt,
            arrivedAt: rsvp.arrivedAt,
            welcomedAt: rsvp.welcomedAt,
        })
        .from(rsvp)
        .innerJoin(user, eq(user.id, rsvp.userId))
        .where(eq(rsvp.eventId, eventId))
        .orderBy(asc(rsvp.createdAt));
    return rows.map((row) => ({ ...row, status: rsvpStatus(row) }));
}

export async function guests(eventId: number) {
    return db
        .select({ id: guest.id, name: guest.name })
        .from(guest)
        .where(eq(guest.eventId, eventId))
        .orderBy(asc(guest.createdAt));
}

export async function doorwayState(eventId: number) {
    const target = await eventById(eventId);
    if (!target) return null;
    const [members, guestList] = await Promise.all([attendees(eventId), guests(eventId)]);
    return {
        event: { id: target.id, title: target.title, capacity: target.capacity, path: eventPath(target) },
        spotsTaken: target.spotsTaken,
        atDoor: members
            .filter((member) => member.status === "at_door")
            .sort((a, b) => a.arrivedAt!.getTime() - b.arrivedAt!.getTime()),
        coming: members.filter((member) => member.status === "going"),
        present: members.filter((member) => member.status === "present"),
        guests: guestList,
    };
}

export type DoorwayState = NonNullable<Awaited<ReturnType<typeof doorwayState>>>;
