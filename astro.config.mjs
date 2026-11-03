// @ts-check
import { defineConfig, envField } from "astro/config";

import netlify from "@astrojs/netlify";

import svelte from "@astrojs/svelte";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    redirects: {
        "/discord": "https://discord.gg/37xpc8hyaG",
    },

    output: "static",

    adapter: netlify(),

    env: {
        schema: {
            DATABASE_URL: envField.string({ context: "server", access: "secret" }),
            BETTER_AUTH_SECRET: envField.string({ context: "server", access: "secret" }),
            BETTER_AUTH_URL: envField.string({ context: "server", access: "secret", optional: true }),
            DISCORD_CLIENT_ID: envField.string({ context: "server", access: "secret", optional: true }),
            DISCORD_CLIENT_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
            RESEND_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
            EMAIL_FROM: envField.string({ context: "server", access: "secret", optional: true }),
        },
    },

    integrations: [svelte()],

    vite: {
        plugins: [tailwindcss()],
    },
});
