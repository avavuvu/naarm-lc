import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const event = pgTable(
    "event",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        title: text("title").notNull(),
        description: text("description"),
        location: text("location"),
        startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
        endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
        // null means no limit
        capacity: integer("capacity"),
        createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("event_startsAt_idx").on(table.startsAt)],
);

export const rsvp = pgTable(
    "rsvp",
    {
        eventId: text("event_id")
            .notNull()
            .references(() => event.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.eventId, table.userId] }),
        index("rsvp_userId_idx").on(table.userId),
    ],
);
