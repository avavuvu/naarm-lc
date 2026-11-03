<script lang="ts">
    import type { Snippet } from "svelte";
    import EventDetails from "./EventDetails.svelte";
    import EventImage from "./EventImage.svelte";
    import type { ViewerEvent } from "../../lib/events";

    const { event, children }: { event: ViewerEvent | null; children?: Snippet } = $props();
    // svelte-ignore state_referenced_locally
    const onNow = event !== null && event.startsAt <= new Date();
</script>

<section class="border bg-surface p-6 flex flex-col gap-6">
    <h2>{onNow ? "on now" : "next meetup"}</h2>
    {#if event}
        <EventImage {event} link />
        <EventDetails {event} link />
        {@render children?.()}
    {:else}
        <p>check the <a href="/discord">discord</a>.</p>
    {/if}
</section>
