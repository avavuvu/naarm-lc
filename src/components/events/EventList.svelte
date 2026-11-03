<script lang="ts">
    import EventDetails from "./EventDetails.svelte";
    import EventImage from "./EventImage.svelte";
    import type { ViewerEvent } from "../../lib/events";

    const { events }: { events: ViewerEvent[] } = $props();
</script>

<ul class="flex flex-col gap-12 py-6">
    {#each events as event (event.id)}
        <li class="grid gap-6 sm:grid-cols-[14rem_1fr] items-start">
            {#if event.image}
                <EventImage {event} link lazy />
            {:else}
                <div class="hidden sm:block"></div>
            {/if}
            <EventDetails {event} link />
        </li>
    {/each}
</ul>
