import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const members = defineCollection({
    loader: glob({ base: "./src/content/members", pattern: "**/*.md" }),
    schema: ({ image }) =>
        z.object({
            name: z.string(),
            additionalName: z.string().optional(),
            profile: image().optional(),
            links: z.array(
                z.object({
                    type: z
                        .literal([
                            "instagram",
                            "youtube",
                            "website",
                            "twitter",
                            "soundcloud",
                            "bandcamp",
                        ])
                        .or(z.string()),
                    link: z.url(),
                }),
            ),
        }),
});

export const collections = {
    members,
};
