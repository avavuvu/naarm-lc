<script lang="ts">
    import type { ViewerEvent } from "../../lib/events";
    import { eventPath } from "../../lib/paths";
    import { formatEventTime } from "../../lib/time";

    const {
        event,
        link = false,
        title = true,
        count = true,
    }: { event: ViewerEvent; link?: boolean; title?: boolean; count?: boolean } = $props();
</script>

<div>
    {#if title && link}
        <h2><a href={eventPath(event)}>{event.title}</a></h2>
    {:else if title}
        <h2>{event.title}</h2>
    {/if}

    <p>{formatEventTime(event.startsAt, event.endsAt)}</p>

    {#if event.location}
        <p>{event.location}</p>
    {/if}
    {#if event.locationHidden}
        <p>exact location shared once you rsvp</p>
    {/if}

    {#if count && event.kind === "meetup"}
        <p>{event.spotsTaken} going{event.capacity === null ? "" : ` · ${event.capacity} spots`}</p>
    {/if}
</div>
