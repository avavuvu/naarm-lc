<script lang="ts">
    import type { EventKind, RsvpStatus } from "../../lib/events";

    type Props = {
        event: { kind: EventKind; capacity: number | null; spotsTaken: number };
        path: string;
        attendees: { id: string; name: string; status: RsvpStatus }[];
        guests: { id: number; name: string }[];
    };

    const { event, path, attendees, guests }: Props = $props();

    const statusLabels: Record<RsvpStatus, string> = { going: "", at_door: " · at the door", present: " · here" };
</script>

<section class="flex flex-col gap-4 border-t py-6">
    <h2>admin</h2>
    <p class="flex gap-6">
        <a class="button" href="{path}/edit">edit</a>
        {#if event.kind === "meetup"}
            <a class="button" href="{path}/rsvps">rsvps</a>
            <a class="button" href="{path}/doorway">doorway</a>
        {/if}
    </p>

    {#if event.kind === "meetup"}
        <div>
            <h3>going ({event.spotsTaken}{event.capacity === null ? "" : ` of ${event.capacity}`})</h3>
            {#if attendees.length === 0 && guests.length === 0}
                <p>no rsvps yet.</p>
            {/if}
            <ul>
                {#each attendees as member (member.id)}
                    <li>{member.name}{statusLabels[member.status]}</li>
                {/each}
                {#each guests as guest (guest.id)}
                    <li>{guest.name} (guest)</li>
                {/each}
            </ul>
        </div>
    {/if}
</section>
