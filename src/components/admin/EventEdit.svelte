<script lang="ts">
    import EventForm from "./EventForm.svelte";
    import type { EventKind } from "../../lib/events";

    type Props = {
        event: {
            id: number;
            kind: EventKind;
            title: string;
            description: string | null;
            location: string | null;
            privateLocation: string | null;
            startsAt: Date;
            endsAt: Date;
            capacity: number | null;
            url: string | null;
            image: string | null;
        };
        updateAction: string;
        deleteAction: string;
        error?: string;
    };

    const { event, updateAction, deleteAction, error }: Props = $props();

    function confirmDelete(submit: SubmitEvent) {
        if (!confirm("delete this event and all its rsvps?")) submit.preventDefault();
    }
</script>

{#if error}
    <p role="alert">{error}</p>
{/if}

<EventForm action={updateAction} submitLabel="save changes" {event} />

<form method="POST" action={deleteAction} class="py-8" onsubmit={confirmDelete}>
    <input type="hidden" name="eventId" value={event.id} />
    <button>delete event</button>
</form>
