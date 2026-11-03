<script lang="ts">
    import { authClient } from "../lib/auth-client";

    // An error from a failed login redirect, shown until the next attempt
    const { error: redirectError = "" }: { error?: string } = $props();

    let email = $state("");
    let status = $state<"idle" | "sending" | "sent">("idle");
    let error = $state("");
    let attempted = $state(false);
    const shownError = $derived(error || (attempted ? "" : redirectError));

    const callbackURL = "/profile";
    const errorCallbackURL = "/login";

    async function discord() {
        attempted = true;
        error = "";
        const result = await authClient.signIn.social({
            provider: "discord",
            callbackURL,
            errorCallbackURL,
        });
        if (result.error) error = result.error.message ?? "Couldn't reach Discord";
    }

    async function sendLink(event: SubmitEvent) {
        event.preventDefault();
        attempted = true;
        error = "";
        status = "sending";
        const result = await authClient.signIn.magicLink({
            email,
            callbackURL,
            errorCallbackURL,
        });
        if (result.error) {
            error = result.error.message ?? "Couldn't send the link";
            status = "idle";
        } else {
            status = "sent";
        }
    }
</script>

<div class="flex flex-col gap-6 max-w-sm py-4">
    <button type="button" class="border px-2 py-1" onclick={discord}>
        log in with Discord
    </button>

    <p>or get a login link by email</p>

    {#if status === "sent"}
        <p>Check your inbox: we sent a link to {email}.</p>
    {:else}
        <form class="flex flex-col gap-2" onsubmit={sendLink}>
            <label for="email">email</label>
            <input
                id="email"
                class="border px-1"
                type="email"
                autocomplete="email"
                required
                bind:value={email}
            />
            <button class="border px-2 py-1" disabled={status === "sending"}>
                {status === "sending" ? "sending…" : "email me a link"}
            </button>
        </form>
    {/if}

    {#if shownError}
        <p role="alert">{shownError}</p>
    {/if}
</div>

<style>
    button {
        cursor: pointer;
        text-decoration: underline;
    }

    button:disabled {
        cursor: wait;
    }
</style>
