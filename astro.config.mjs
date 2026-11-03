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
            DISCORD_CLIENT_ID: envField.string({ context: "server", access: "secret" }),
            DISCORD_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
        },
    },

    integrations: [svelte()],

    vite: {
        plugins: [tailwindcss()],
    },
});
