import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
} from "astro:env/server";
import { signConfirmLink } from "./confirm";
import { db } from "./db";
import { emailConfigured, emailMagicLink } from "./email";
import { eventById } from "./events";
import * as schema from "./schema";

const NAME_MAX = 64;

function cleanName(value: unknown) {
    const name = String(value ?? "").trim();
    if (name.length < 1 || name.length > NAME_MAX) {
        throw new APIError("BAD_REQUEST", { message: `names are 1–${NAME_MAX} characters` });
    }
    return name;
}

export const discordEnabled = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);

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
            role: {
                type: ["member", "admin"],
                required: false,
                defaultValue: "member",
                input: false,
            },
        },
    },

    socialProviders:
        DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET
            ? {
                  discord: {
                      clientId: DISCORD_CLIENT_ID,
                      clientSecret: DISCORD_CLIENT_SECRET,
                      mapProfileToUser: (profile) => ({
                          email: profile.email ?? `${profile.id}@discord.placeholder.invalid`,
                      }),
                  },
              }
            : {},

    plugins: [
        magicLink({
            sendMagicLink: async ({ email, url }, ctx) => {
                const name = ctx?.body?.name == null ? null : cleanName(ctx.body.name);
                const link = name ? signConfirmLink(url, email, name) : { url, eventId: null };
                const eventTitle = link.eventId ? ((await eventById(Number(link.eventId)))?.title ?? null) : null;
                if (emailConfigured) return emailMagicLink(email, link.url, eventTitle);
                if (import.meta.env.DEV) {
                    console.log(`\n[magic link] ${email}\n${link.url}\n`);
                    return;
                }
                throw new APIError("SERVICE_UNAVAILABLE", { message: "email login isn't set up yet" });
            },
        }),
    ],

    rateLimit: { storage: "database" },

    databaseHooks: {
        account: {
            create: { before: async (account) => ({ data: withoutTokens(account) }) },
            update: { before: async (account) => ({ data: withoutTokens(account) }) },
        },
        user: {
            create: {
                before: async (user) => ({
                    data: { ...user, name: user.name?.trim() || user.email.split("@")[0] },
                }),
            },
            update: {
                before: async (data) =>
                    data.name == null ? { data } : { data: { ...data, name: cleanName(data.name) } },
            },
        },
    },
});

export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;
