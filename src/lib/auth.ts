import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, eq, ne } from "drizzle-orm";
import {
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
} from "astro:env/server";
import { db } from "./db";
import * as schema from "./schema";

export const USERNAME_PATTERN = /^[a-z0-9_-]{2,32}$/;

const withoutTokens = <T extends object>(account: T) => ({
    ...account,
    accessToken: null,
    refreshToken: null,
    idToken: null,
});

export const auth = betterAuth({
    secret: BETTER_AUTH_SECRET,
    baseURL: BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "pg", schema }),

    user: {
        additionalFields: {
            // Chosen by the member, used for profile URLs
            username: { type: "string", required: false, unique: true },
            role: {
                type: ["member", "admin"],
                required: false,
                defaultValue: "member",
                input: false,
            },
        },
    },

    socialProviders: {
        discord: {
            clientId: DISCORD_CLIENT_ID,
            clientSecret: DISCORD_CLIENT_SECRET,
            // Phone-only Discord accounts have no email
            mapProfileToUser: (profile) => ({
                email: profile.email ?? `${profile.id}@discord.placeholder.invalid`,
            }),
        },
    },

    plugins: [
        magicLink({
            sendMagicLink: async ({ email, url }) => {
                if (import.meta.env.DEV) {
                    console.log(`\n[magic link] ${email}\n${url}\n`);
                    return;
                }
                throw new APIError("SERVICE_UNAVAILABLE", {
                    message: "Email login isn't set up yet",
                });
            },
        }),
    ],

    // Serverless functions don't share memory, so keep counters in the database
    rateLimit: { storage: "database" },

    databaseHooks: {
        // Discord is only used to log in, so don't keep its API tokens
        account: {
            create: { before: async (account) => ({ data: withoutTokens(account) }) },
            update: { before: async (account) => ({ data: withoutTokens(account) }) },
        },
        user: {
            create: {
                // Email sign-ups arrive without a name
                before: async (user) => ({
                    data: { ...user, name: user.name?.trim() || user.email.split("@")[0] },
                }),
            },
            update: {
                before: async (data, ctx) => {
                    if (data.name != null) {
                        const name = String(data.name).trim();
                        if (name.length < 1 || name.length > 64) {
                            throw new APIError("BAD_REQUEST", {
                                message: "Display names are 1–64 characters",
                            });
                        }
                        data = { ...data, name };
                    }

                    if (data.username == null) return { data };

                    const username = String(data.username).trim().toLowerCase();
                    if (!USERNAME_PATTERN.test(username)) {
                        throw new APIError("BAD_REQUEST", {
                            message:
                                "Usernames are 2–32 characters: lowercase letters, numbers, _ and -",
                        });
                    }

                    const userId = ctx?.context.session?.user.id ?? "";
                    const [taken] = await db
                        .select({ id: schema.user.id })
                        .from(schema.user)
                        .where(and(eq(schema.user.username, username), ne(schema.user.id, userId)))
                        .limit(1);
                    if (taken) {
                        throw new APIError("BAD_REQUEST", {
                            message: "That username is taken",
                        });
                    }

                    return { data: { ...data, username } };
                },
            },
        },
    },
});

export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;
