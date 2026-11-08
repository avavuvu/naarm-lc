<script lang="ts">
    import EventDetails from "./EventDetails.svelte";
    import EventImage from "./EventImage.svelte";
    import type { ViewerEvent } from "../../lib/events";
    import { eventPath } from "../../lib/paths";

    const { event }: { event: ViewerEvent | null } = $props();
</script>

<section class="border bg-surface p-6 flex flex-col gap-6">
    <h2>next meetup</h2>
    {#if event}
        <EventImage {event} link />
        <EventDetails {event} link count={false} />
        <a class="button self-start" href={eventPath(event)}>rsvp</a>
    {:else}
        <p>check the <a href="/discord">discord</a>.</p>
    {/if}
</section>
