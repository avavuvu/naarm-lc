<script lang="ts">
    import { toMelbourne } from "../../lib/time";
    import type { EventKind } from "../../lib/events";

    type EditableEvent = {
        id: string;
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

    const { action, submitLabel, event }: { action: string; submitLabel: string; event?: EditableEvent } = $props();

    const kind = event?.kind ?? "meetup";
    const start = event ? toMelbourne(event.startsAt) : null;
    const end = event ? toMelbourne(event.endsAt) : null;
</script>

<form method="POST" {action} class="event-form flex flex-col gap-2 max-w-md py-6">
    {#if event}
        <input type="hidden" name="eventId" value={event.id} />
    {/if}

    <fieldset class="flex gap-6 pb-2">
        <legend class="pb-2">type</legend>
        <label><input type="radio" name="kind" value="meetup" checked={kind === "meetup"} /> meetup</label>
        <label><input type="radio" name="kind" value="gig" checked={kind === "gig"} /> gig</label>
    </fieldset>

    <label for="title">title</label>
    <input id="title" name="title" required maxlength="200" value={event?.title ?? ""} />

    <label for="date">date</label>
    <input id="date" name="date" type="date" required value={start?.date ?? ""} />

    <div class="flex gap-4">
        <div class="flex flex-col gap-2">
            <label for="startTime">starts</label>
            <input id="startTime" name="startTime" type="time" required value={start?.time ?? ""} />
        </div>
        <div class="flex flex-col gap-2">
            <label for="endTime">ends</label>
            <input id="endTime" name="endTime" type="time" required value={end?.time ?? ""} />
        </div>
    </div>

    <label for="location">public location</label>
    <input id="location" name="location" maxlength="200" value={event?.location ?? ""} />

    <div class="gig-only flex flex-col gap-2">
        <label for="url">ticket link</label>
        <input id="url" name="url" type="url" maxlength="500" placeholder="https://events.humanitix.com/…" value={event?.url ?? ""} />
    </div>

    <div class="meetup-only flex flex-col gap-2">
        <label for="privateLocation">private location (optional, only shown to people who rsvp)</label>
        <input id="privateLocation" name="privateLocation" maxlength="300" value={event?.privateLocation ?? ""} />

        <label for="capacity">capacity (optional, leave empty for no limit)</label>
        <input id="capacity" name="capacity" type="number" min="1" step="1" value={event?.capacity ?? ""} />
    </div>

    <label for="image">image (optional, use a url to a file)</label>
    <input id="image" name="image" maxlength="500" value={event?.image ?? ""} />

    <label for="description">description</label>
    <textarea id="description" name="description" rows="6" maxlength="5000" value={event?.description ?? ""}></textarea>

    <button class="self-start mt-4">{submitLabel}</button>
</form>

<style>
    .event-form:has(:global([value="meetup"]:checked)) .gig-only,
    .event-form:has(:global([value="gig"]:checked)) .meetup-only {
        display: none;
    }
</style>
