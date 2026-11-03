<script lang="ts">
    import EventList from "./EventList.svelte";
    import type { ViewerEvent } from "../../lib/events";

    const { upcoming, past, admin }: { upcoming: ViewerEvent[]; past: ViewerEvent[]; admin: boolean } = $props();
</script>

{#if admin}
    <p class="py-4"><a class="button" href="/events/new">new event</a></p>
{/if}

{#if upcoming.length === 0}
    <p class="py-4">no upcoming events yet. check the discord for news.</p>
{/if}
<EventList events={upcoming} />

{#if past.length > 0}
    <h2 class="pt-6">past events</h2>
    <EventList events={past} />
{/if}
