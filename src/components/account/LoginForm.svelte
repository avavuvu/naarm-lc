<script lang="ts">
    import { authClient } from "../../lib/auth-client";

    const {
        discord = false,
        eventId,
        error: redirectError = "",
    }: { discord?: boolean; eventId?: number; error?: string } = $props();

    const callbackURL = eventId ? `/confirm?event=${eventId}` : "/profile";
    const errorCallbackURL = "/login";

    let name = $state("");
    let email = $state("");
    let status = $state<"idle" | "sending" | "sent">("idle");
    let error = $derived(redirectError);

    async function logInWithDiscord() {
        error = "";
        const result = await authClient.signIn.social({ provider: "discord", callbackURL: "/profile", errorCallbackURL });
        if (result.error) error = result.error.message ?? "couldn't reach discord";
    }

    async function sendLink(event: SubmitEvent) {
        event.preventDefault();
        error = "";
        status = "sending";
        const result = await authClient.signIn.magicLink({
            ...(eventId && { name: name.trim() }),
            email,
            callbackURL,
            errorCallbackURL,
        });
        if (result.error) {
            error = result.error.message ?? "couldn't send the email";
            status = "idle";
        } else {
            status = "sent";
        }
    }
</script>

<div class="flex flex-col gap-4 max-w-sm">
    {#if discord}
        <button type="button" class="self-start" onclick={logInWithDiscord}>log in with discord</button>
        <p>or with your email</p>
    {/if}

    {#if status === "sent"}
        <p>check your inbox{eventId ? " to confirm" : ""}. we sent a link to {email}</p>
    {:else}
        <form class="flex flex-col gap-2" onsubmit={sendLink}>
            {#if eventId}
                <label class="field">
                    name
                    <input required maxlength="64" autocomplete="name" bind:value={name} />
                </label>
            {/if}
            <label class="field">
                email
                <input type="email" required autocomplete="email" bind:value={email} />
            </label>
            <button class="self-start mt-2" disabled={status === "sending"}>
                {status === "sending" ? "sending…" : eventId ? "i'm coming" : "email me a link"}
            </button>
        </form>
    {/if}

    {#if error}
        <p role="alert">{error}</p>
    {/if}
</div>

<style>
    .field {
        display: grid;
        grid-template-columns: 3.5rem 1fr;
        align-items: center;
    }
</style>
