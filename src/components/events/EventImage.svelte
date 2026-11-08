<script lang="ts">
    import { eventPath } from "../../lib/paths";

    const {
        event,
        link = false,
        lazy = false,
    }: { event: { id: number; title: string; image: string | null }; link?: boolean; lazy?: boolean } = $props();
</script>

{#if event.image}
    {#if link}
        <a href={eventPath(event)} class="block">
            <img class="border w-full h-auto" src={event.image} alt="poster for {event.title}" loading={lazy ? "lazy" : undefined} />
        </a>
    {:else}
        <img class="border w-full h-auto" src={event.image} alt="poster for {event.title}" loading={lazy ? "lazy" : undefined} />
    {/if}
{/if}
