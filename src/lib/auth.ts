import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { magicLink, oAuthProxy } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, eq, ne } from "drizzle-orm";
import {
    BETTER_AUTH_PREVIEW_HOSTS,
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    OAUTH_PROXY_PRODUCTION_URL,
    OAUTH_PROXY_SECRET,
} from "astro:env/server";
import { db } from "./db";
import { emailConfigured, magicLinkEmail, sendEmail } from "./email";
import * as schema from "./schema";

// Within Discourse's username rules, so usernames carry over to a forum unchanged
export const USERNAME_PATTERN = /^(?=.{3,20}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
export const USERNAME_RULES =
    "Usernames are 3–20 characters: lowercase letters, numbers, _ and -, starting and ending with a letter or number";

/** Login providers with credentials set; GitHub is optional */
export const socialLogins = ["discord", ...(GITHUB_CLIENT_ID ? ["github"] : [])] as const;

const withoutTokens = <T extends object>(account: T) => ({
    ...account,
    accessToken: null,
    refreshToken: null,
    idToken: null,
});

// Deploy previews each get their own address, e.g.
// deploy-preview-12--<site>.netlify.app, so they match against patterns instead
// of having a fixed BETTER_AUTH_URL
const previewHosts = (BETTER_AUTH_PREVIEW_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

export const auth = betterAuth({
    secret: BETTER_AUTH_SECRET,
    baseURL:
        BETTER_AUTH_URL ||
        (previewHosts.length > 0 ? { allowedHosts: previewHosts, protocol: "https" } : undefined),
    // Production must trust previews for their logins to come back through it
    trustedOrigins: previewHosts.map((host) => `https://${host}`),
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
        ...(GITHUB_CLIENT_ID &&
            GITHUB_CLIENT_SECRET && {
                github: {
                    clientId: GITHUB_CLIENT_ID,
                    clientSecret: GITHUB_CLIENT_SECRET,
                    // GitHub accounts can keep every email private
                    mapProfileToUser: (profile) => ({
                        email: profile.email ?? `${profile.id}@github.placeholder.invalid`,
                    }),
                },
            }),
    },

    account: {
        accountLinking: {
            enabled: true,
            // Members link accounts deliberately from their profile, so the
            // emails on their Discord and GitHub accounts needn't match
            allowDifferentEmails: true,
        },
    },

    plugins: [
        magicLink({
            sendMagicLink: async ({ email, url }) => {
                if (emailConfigured) return sendEmail(magicLinkEmail(email, url));
                if (import.meta.env.DEV) {
                    console.log(`\n[magic link] ${email}\n${url}\n`);
                    return;
                }
                throw new APIError("SERVICE_UNAVAILABLE", {
                    message: "Email login isn't set up yet",
                });
            },
        }),
        // Discord and GitHub only accept callbacks to registered URLs, so previews
        // send their logins through production. Set on production and previews.
        ...(OAUTH_PROXY_SECRET && OAUTH_PROXY_PRODUCTION_URL
            ? [oAuthProxy({ productionURL: OAUTH_PROXY_PRODUCTION_URL, secret: OAUTH_PROXY_SECRET })]
            : []),
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
                                USERNAME_RULES,
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
