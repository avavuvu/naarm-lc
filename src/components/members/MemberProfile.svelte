<script lang="ts">
    import MemberName from "./MemberName.svelte";
    import { linkLabel, type Profile } from "../../lib/members";

    const { member, portrait }: { member: Profile; portrait: string | null } = $props();
</script>

<div class="grid grid-cols-[20%_60%_auto] md:grid-cols-[10%_20%_auto_10%] grid-rows-1 py-12">
    {#if portrait}
        <div class="border col-start-2 col-end-4 row-start-1 row-end-2">
            <img class="w-full h-auto block" src={portrait} alt="picture of {member.name}" />
        </div>
    {/if}
    <div
        class={[
            "bg-surface border p-3 h-min row-start-1 row-end-2 flex flex-col gap-2",
            portrait ? "mt-36 md:mt-4 ml-4 col-start-1 col-end-3" : "col-start-1 col-end-4",
        ]}
    >
        <h2><MemberName {member} /></h2>
        {#if member.bio}
            <p class="whitespace-pre-line">{member.bio}</p>
        {/if}
        {#if member.links.length > 0}
            <ul class="flex gap-x-2 flex-wrap">
                {#each member.links as link (link)}
                    <li>[<a href={link} rel="me noopener" target="_blank">{linkLabel(link)}</a>]</li>
                {/each}
            </ul>
        {/if}
    </div>
</div>
