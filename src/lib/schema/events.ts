import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

const time = (name: string) => timestamp(name, { withTimezone: true });

export const event = pgTable(
    "event",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        kind: text("kind", { enum: ["meetup", "gig"] }).default("meetup").notNull(),
        title: text("title").notNull(),
        description: text("description"),
        location: text("location"),
        privateLocation: text("private_location"),
        url: text("url"),
        image: text("image"),
        startsAt: time("starts_at").notNull(),
        endsAt: time("ends_at").notNull(),
        capacity: integer("capacity"),
        createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
        createdAt: time("created_at").defaultNow().notNull(),
        updatedAt: time("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("event_startsAt_idx").on(table.startsAt)],
);

export const rsvp = pgTable(
    "rsvp",
    {
        eventId: integer("event_id")
            .notNull()
            .references(() => event.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        arrivedAt: time("arrived_at"),
        welcomedAt: time("welcomed_at"),
        createdAt: time("created_at").defaultNow().notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.eventId, table.userId] }),
        index("rsvp_userId_idx").on(table.userId),
    ],
);

export const guest = pgTable(
    "guest",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        eventId: integer("event_id")
            .notNull()
            .references(() => event.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        addedBy: text("added_by").references(() => user.id, { onDelete: "set null" }),
        createdAt: time("created_at").defaultNow().notNull(),
    },
    (table) => [index("guest_eventId_idx").on(table.eventId)],
);
