<script lang="ts">
    import { actions } from "astro:actions";
    import type { DoorwayState } from "../../lib/events";

    const POLL_MS = 2000;

    const { initial }: { initial: DoorwayState } = $props();

    let doorway = $derived(initial);
    let offline = $state(false);
    let busy = $state(false);
    let guestName = $state("");
    let error = $state("");

    const hereCount = $derived(doorway.present.length + doorway.guests.length);

    async function refresh() {
        const { data, error: failed } = await actions.doorway.state({ eventId: doorway.event.id });
        offline = Boolean(failed);
        if (data) doorway = data;
    }

    async function run(request: Promise<{ error?: { message: string } }>) {
        error = "";
        busy = true;
        const result = await request;
        if (result.error) error = result.error.message;
        await refresh();
        busy = false;
        return !result.error;
    }

    $effect(() => {
        const timer = setInterval(() => {
            if (document.visibilityState === "visible") refresh();
        }, POLL_MS);
        return () => clearInterval(timer);
    });

    $effect(() => {
        document.title = doorway.atDoor.length > 0 ? `(${doorway.atDoor.length}) doorway` : "doorway";
    });

    const welcome = (userId: string) => run(actions.doorway.welcome({ eventId: doorway.event.id, userId }));

    async function addGuest(event: SubmitEvent) {
        event.preventDefault();
        if (await run(actions.doorway.addGuest({ eventId: doorway.event.id, name: guestName }))) guestName = "";
    }

    function removeGuest(guestId: string, name: string) {
        if (confirm(`remove ${name}?`)) run(actions.doorway.removeGuest({ guestId }));
    }
</script>

<div class="flex flex-col gap-10 py-6">
    <div>
        <h2><a href={doorway.event.path}>{doorway.event.title}</a></h2>
        <p>
            {hereCount} here · {doorway.spotsTaken}{doorway.event.capacity !== null
                ? ` of ${doorway.event.capacity}`
                : ""} spots taken
        </p>
        {#if offline}
            <p role="status">⚠ can't reach the server, retrying…</p>
        {/if}
        {#if error}
            <p role="alert">{error}</p>
        {/if}
    </div>

    <section>
        <h3>at the door</h3>
        {#if doorway.atDoor.length === 0}
            <p>nobody yet. new arrivals pop up here when they ring the doorbell.</p>
        {/if}
        <ul class="flex flex-col gap-2 pt-2">
            {#each doorway.atDoor as member (member.id)}
                <li class="flex gap-4">
                    <span>{member.name}</span>
                    <button disabled={busy} onclick={() => welcome(member.id)}>welcome</button>
                </li>
            {/each}
        </ul>
    </section>

    <section>
        <h3>add a guest</h3>
        <form class="flex gap-4 pt-2 max-w-md" onsubmit={addGuest}>
            <input
                class="grow"
                placeholder="a +1, or someone without an account"
                required
                maxlength="64"
                bind:value={guestName}
            />
            <button disabled={busy}>add</button>
        </form>
    </section>

    <section>
        <h3>here ({hereCount})</h3>
        <ul class="flex flex-col gap-2 pt-2">
            {#each doorway.present as member (member.id)}
                <li>{member.name}</li>
            {/each}
            {#each doorway.guests as guest (guest.id)}
                <li class="flex gap-4">
                    <span>{guest.name} (guest)</span>
                    <button disabled={busy} onclick={() => removeGuest(guest.id, guest.name)}>
                        remove
                    </button>
                </li>
            {/each}
        </ul>
    </section>

    <section>
        <h3>coming ({doorway.coming.length})</h3>
        <p>rsvp'd but haven't rung yet. welcome them here if they arrive without their phone.</p>
        <ul class="flex flex-col gap-2 pt-2">
            {#each doorway.coming as member (member.id)}
                <li class="flex gap-4">
                    <span>{member.name}</span>
                    <button disabled={busy} onclick={() => welcome(member.id)}>welcome</button>
                </li>
            {/each}
        </ul>
    </section>
</div>

