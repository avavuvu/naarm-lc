<script lang="ts">
    import { authClient } from "../../lib/auth-client";
    import ProfileFields from "./ProfileFields.svelte";
    import type { MemberStatus } from "../../lib/members";

    type Props = {
        profile: { name: string; alias: string | null; bio: string | null; image: string | null; links: string[] };
        status: MemberStatus;
        path: string | null;
        email: string | null;
        admin: { pending: number } | null;
        action: string;
        saved: boolean;
        error?: string;
    };

    const { profile, status, path, email, admin, action, saved, error }: Props = $props();

    async function signOut() {
        await authClient.signOut();
        window.location.href = "/";
    }
</script>

{#if admin}
    <p>
        you're an admin · <a href="/admin">admin area</a>{admin.pending > 0 ? ` (${admin.pending} waiting)` : ""}
    </p>
{/if}

{#if status === "approved" && path}
    <p>your profile is on the <a href="/members">members</a> page: <a href={path}>{path}</a></p>
{:else if status === "pending"}
    <p>your profile is waiting for an admin to approve it. once it's approved it'll show on the members page.</p>
{:else}
    <p>your profile isn't shown on the members page.</p>
{/if}

<form method="POST" {action} class="flex flex-col gap-2 w-full max-w-md">
    <ProfileFields {profile} />
    {#if email}
        <label for="email">email (only admins can see this)</label>
        <input id="email" value={email} disabled />
    {/if}
    {#if error}
        <p role="alert">{error}</p>
    {/if}
    <p class="flex gap-4 items-baseline mt-4">
        <button>save</button>
        {#if saved}<span>saved ✓</span>{/if}
    </p>
</form>

<button type="button" class="self-start" onclick={signOut}>log out</button>
