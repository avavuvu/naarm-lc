<script lang="ts">
    import type { Snippet } from "svelte";
    import EventDetails from "./EventDetails.svelte";
    import EventImage from "./EventImage.svelte";
    import EventAdmin from "../admin/EventAdmin.svelte";
    import type { RsvpStatus, ViewerEvent } from "../../lib/events";

    type AdminData = {
        attendees: { id: string; name: string; status: RsvpStatus }[];
        guests: { id: number; name: string }[];
    };

    const {
        event,
        path,
        error,
        admin,
        children,
    }: { event: ViewerEvent; path: string; error?: string; admin: AdminData | null; children?: Snippet } = $props();
</script>

<div class={["grid gap-12 py-6", event.image && "sm:grid-cols-2"]}>
    <EventImage {event} />
    <div class="flex flex-col gap-6">
        <EventDetails {event} title={false} />
        {#if event.description}
            <p class="whitespace-pre-line">{event.description}</p>
        {/if}
        {#if error}
            <p role="alert">{error}</p>
        {/if}
        {@render children?.()}
    </div>
</div>

{#if admin}
    <EventAdmin {event} {path} {...admin} />
{/if}
