<script lang="ts">
    import { authClient } from "../../lib/auth-client";

    const { name: initialName, email, admin }: { name: string; email: string | null; admin: boolean } = $props();

    let name = $derived(initialName);
    let saving = $state(false);
    let saved = $state(false);
    let error = $state("");

    async function save(event: SubmitEvent) {
        event.preventDefault();
        error = "";
        saving = true;
        const result = await authClient.updateUser({ name: name.trim() });
        if (result.error) error = result.error.message ?? "couldn't save your name";
        saved = !result.error;
        saving = false;
    }

    async function signOut() {
        await authClient.signOut();
        window.location.href = "/";
    }
</script>

{#if admin}
    <p>you're an admin</p>
{/if}

<div class="flex flex-col gap-2">
    <form class="flex gap-4" onsubmit={save}>
        <input class="w-64" aria-label="name" required maxlength="64" bind:value={name} oninput={() => (saved = false)} />
        <button disabled={saving}>{saving ? "saving…" : saved ? "saved" : "save"}</button>
    </form>
    {#if email}
        <input class="w-64" aria-label="email" value={email} disabled />
    {/if}
    {#if error}
        <p role="alert">{error}</p>
    {/if}
</div>

<button type="button" class="self-start" onclick={signOut}>log out</button>
