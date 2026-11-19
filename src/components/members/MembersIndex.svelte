<script lang="ts">
    import MemberName from "./MemberName.svelte";
    import { memberPath } from "../../lib/members";

    type Props = {
        members: { id: string; name: string; alias: string | null; slug: string }[];
        loggedIn: boolean;
        admin: { pending: number } | null;
    };

    const { members, loggedIn, admin }: Props = $props();
</script>

{#if admin}
    <p class="py-4">
        <a class="button" href="/admin">admin area{admin.pending > 0 ? ` · ${admin.pending} waiting` : ""}</a>
    </p>
{/if}

<p>
    want to be listed here? join the <a href="/discord">discord</a>, then
    {#if loggedIn}
        fill in your <a href="/profile">profile</a>.
    {:else}
        <a href="/login">make an account</a>.
    {/if}
    an admin will approve it.
</p>

<hr class="my-4" />

{#if members.length === 0}
    <p>no members yet.</p>
{/if}
<ul class="columns-2 md:columns-3">
    {#each members as member (member.id)}
        <li><a href={memberPath(member)}><MemberName {member} /></a></li>
    {/each}
</ul>
