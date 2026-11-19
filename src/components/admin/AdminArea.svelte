<script lang="ts">
    import MemberName from "../members/MemberName.svelte";
    import StatusButtons from "./StatusButtons.svelte";
    import { linkLabel, memberPath, type AdminAccount } from "../../lib/members";

    type Props = {
        pending: AdminAccount[];
        approved: AdminAccount[];
        declined: AdminAccount[];
        error?: string;
    };

    const { pending, approved, declined, error }: Props = $props();

    const joined = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Melbourne",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
</script>

<p class="flex gap-6 flex-wrap py-4">
    <a class="button" href="/events/new">new event</a>
    <a class="button" href="/doorway">doorway</a>
    <a href="/members">members page</a>
</p>

{#if error}
    <p role="alert">{error}</p>
{/if}

<section class="flex flex-col gap-4 py-4">
    <h2>waiting for approval ({pending.length})</h2>
    {#if pending.length === 0}
        <p>no one's waiting. new accounts show up here.</p>
    {/if}
    <ul class="flex flex-col gap-4">
        {#each pending as account (account.id)}
            <li class="border p-3 flex flex-col gap-2">
                <div class="flex gap-4 items-start">
                    {#if account.image}
                        <img class="border w-16 h-16 object-cover" src={account.image} alt="" loading="lazy" />
                    {/if}
                    <div>
                        <h3><MemberName member={account} /></h3>
                        <p>{account.email ?? "no email (discord)"} · joined {joined.format(account.createdAt).toLowerCase()}</p>
                    </div>
                </div>
                {#if account.bio}
                    <p class="whitespace-pre-line">{account.bio}</p>
                {/if}
                {#if account.links.length > 0}
                    <ul class="flex gap-x-2 flex-wrap">
                        {#each account.links as link (link)}
                            <li>[<a href={link} rel="noopener" target="_blank">{linkLabel(link)}</a>]</li>
                        {/each}
                    </ul>
                {/if}
                <StatusButtons userId={account.id} status={account.status} page="/admin" />
            </li>
        {/each}
    </ul>
</section>

{#snippet table(accounts: AdminAccount[])}
    <table class="w-full border-collapse text-left">
        <thead>
            <tr>
                <th class="border px-2 font-normal">name</th>
                <th class="border px-2 font-normal">email</th>
                <th class="border px-2 font-normal"></th>
            </tr>
        </thead>
        <tbody>
            {#each accounts as account (account.id)}
                <tr>
                    <td class="border px-2">
                        {#if account.slug}
                            <a href={memberPath({ slug: account.slug })}><MemberName member={account} /></a>
                        {:else}
                            <MemberName member={account} />
                        {/if}
                        {account.role === "admin" ? " · admin" : ""}
                    </td>
                    <td class="border px-2 break-all">{account.email ?? ""}</td>
                    <td class="border px-2">
                        <span class="inline-flex gap-4 flex-wrap">
                            {#if account.slug}
                                <a class="button" href="{memberPath({ slug: account.slug })}/edit">edit</a>
                            {/if}
                            <StatusButtons userId={account.id} status={account.status} page="/admin" />
                        </span>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/snippet}

<section class="flex flex-col gap-4 py-4">
    <h2>members ({approved.length})</h2>
    {#if approved.length === 0}
        <p>no approved members yet.</p>
    {:else}
        {@render table(approved)}
    {/if}
</section>

{#if declined.length > 0}
    <section class="flex flex-col gap-4 py-4">
        <h2>declined or hidden ({declined.length})</h2>
        {@render table(declined)}
    </section>
{/if}
