import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Uploaded profile pictures: small JPEGs (resized in the browser), stored as base64
export const avatar = pgTable("avatar", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    data: text("data").notNull(),
    // The Discord/GitHub picture to go back to if the upload is removed
    previousImage: text("previous_image"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
