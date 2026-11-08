import { createAuthClient } from "better-auth/svelte";
import { inferAdditionalFields, magicLinkClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
    plugins: [inferAdditionalFields<typeof auth>(), magicLinkClient()],
});
