<script lang="ts">
    import type { RsvpStatus } from "../../lib/events";
    import { formatEventTime } from "../../lib/time";

    type Props = {
        event: { startsAt: Date; endsAt: Date; capacity: number | null; spotsTaken: number };
        attendees: { id: string; name: string; email: string; status: RsvpStatus }[];
        guests: { id: number; name: string }[];
    };

    const { event, attendees, guests }: Props = $props();

    const statusLabels: Record<RsvpStatus, string> = { going: "going", at_door: "at the door", present: "here" };

    const rows = $derived(
        [
            ...attendees.map((member) => ({
                key: member.id,
                name: member.name,
                email: member.email,
                status: statusLabels[member.status],
            })),
            ...guests.map((guest) => ({ key: `guest-${guest.id}`, name: guest.name, email: "", status: "guest" })),
        ].sort((a, b) => a.name.localeCompare(b.name)),
    );
</script>

<div class="flex flex-col gap-4 py-4">
    <p>
        {formatEventTime(event.startsAt, event.endsAt)} · {event.spotsTaken} going{event.capacity === null
            ? ""
            : ` of ${event.capacity}`}
    </p>

    {#if rows.length === 0}
        <p>no rsvps yet.</p>
    {:else}
        <table class="w-full border-collapse text-left">
            <thead>
                <tr>
                    <th class="border px-2 font-normal w-0">#</th>
                    <th class="border px-2 font-normal">name</th>
                    <th class="border px-2 font-normal">email</th>
                    <th class="border px-2 font-normal">status</th>
                </tr>
            </thead>
            <tbody>
                {#each rows as row, i (row.key)}
                    <tr class="break-inside-avoid">
                        <td class="border px-2">{i + 1}</td>
                        <td class="border px-2">{row.name}</td>
                        <td class="border px-2 break-all">{row.email}</td>
                        <td class="border px-2">{row.status}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>
