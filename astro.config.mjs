// @ts-check
import { defineConfig } from "astro/config";

import svelte from "@astrojs/svelte";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    redirects: {
        "/discord": "https://discord.gg/37xpc8hyaG",
    },

    output: "static",

    integrations: [svelte()],

    vite: {
        plugins: [tailwindcss()],
    },
});
