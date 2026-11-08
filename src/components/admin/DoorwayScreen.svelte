<script lang="ts">
    import Doorway from "./Doorway.svelte";
    import type { DoorwayState } from "../../lib/events";

    const { initial, opensMinutes }: { initial: DoorwayState | null; opensMinutes: number } = $props();
</script>

{#if initial}
    <Doorway {initial} />
{:else}
    <div class="py-4 flex flex-col gap-2">
        <p>no event is on right now.</p>
        <p>
            the doorway opens {opensMinutes} minutes before a meetup starts. you can also open it from any meetup's
            page on <a href="/events">the events list</a>.
        </p>
    </div>
{/if}
