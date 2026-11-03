<script lang="ts">
    import { authClient } from "../lib/auth-client";

    type Provider = "discord" | "github";

    const {
        providers,
        connected,
    }: { providers: readonly Provider[]; connected: string[] } = $props();

    const providerNames = { discord: "Discord", github: "GitHub" };
    let error = $state("");

    async function connect(provider: Provider) {
        error = "";
        const result = await authClient.linkSocial({
            provider,
            callbackURL: "/profile",
            errorCallbackURL: "/profile",
        });
        if (result.error) error = result.error.message ?? `Couldn't reach ${providerNames[provider]}`;
    }
</script>

<ul class="flex flex-col gap-2">
    {#each providers as provider (provider)}
        <li class="flex items-center gap-2">
            <span>{providerNames[provider]}</span>
            {#if connected.includes(provider)}
                <span>connected ✓</span>
            {:else}
                <button type="button" onclick={() => connect(provider)}>connect</button>
            {/if}
        </li>
    {/each}
</ul>
{#if error}
    <p role="alert">{error}</p>
{/if}

<style>
    button {
        border: 1px solid var(--color-primary);
        padding: 0 0.5rem;
        text-decoration: underline;
        cursor: pointer;
    }
</style>
