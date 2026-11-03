<script lang="ts">
    import { authClient } from "../lib/auth-client";

    const {
        name: initialName,
        username: initialUsername,
    }: { name: string; username: string | null } = $props();

    // Matches USERNAME_PATTERN in lib/auth.ts; uppercase is fine because the server lowercases it
    const usernamePattern = "[a-zA-Z0-9]+([_\\-][a-zA-Z0-9]+)*";

    let name = $state(initialName);
    let username = $state(initialUsername ?? "");
    let status = $state<"idle" | "saving">("idle");
    let error = $state("");

    async function save(event: SubmitEvent) {
        event.preventDefault();
        error = "";
        status = "saving";
        const result = await authClient.updateUser({
            name: name.trim(),
            username: username.trim().toLowerCase() || undefined,
        });
        if (result.error) {
            error = result.error.message ?? "Couldn't save your profile";
            status = "idle";
        } else {
            // The header above the form is server-rendered
            window.location.reload();
        }
    }

    async function signOut() {
        await authClient.signOut();
        window.location.href = "/";
    }
</script>

<form class="flex flex-col gap-2 max-w-sm" onsubmit={save}>
    <label for="name">display name</label>
    <input id="name" class="border px-1" required maxlength="64" bind:value={name} />

    <label for="username">username</label>
    <input
        id="username"
        class="border px-1"
        pattern={usernamePattern}
        minlength="3"
        maxlength="20"
        title="3–20 characters: letters, numbers, _ and -, starting and ending with a letter or number"
        autocapitalize="none"
        spellcheck="false"
        bind:value={username}
    />

    <button class="border px-2 py-1 mt-2" disabled={status === "saving"}>
        {status === "saving" ? "saving…" : "save"}
    </button>

    {#if error}
        <p role="alert">{error}</p>
    {/if}
</form>

<button type="button" class="border px-2 py-1 mt-8" onclick={signOut}>log out</button>

<style>
    button {
        cursor: pointer;
        text-decoration: underline;
    }

    button:disabled {
        cursor: wait;
    }
</style>
