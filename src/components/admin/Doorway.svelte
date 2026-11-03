<script lang="ts">
    import { actions } from "astro:actions";
    import Avatar from "../Avatar.svelte";
    import type { DoorwayState } from "../../lib/events";

    const POLL_MS = 2000;

    const { initial }: { initial: DoorwayState } = $props();

    let doorway = $state(initial);
    let offline = $state(false);
    let guestName = $state("");
    let error = $state("");
    // Members whose welcome is on its way to the server
    let welcoming = $state<string[]>([]);

    const atDoor = $derived(doorway.atDoor.filter((member) => !welcoming.includes(member.id)));
    const hereCount = $derived(doorway.present.length + doorway.guests.length + welcoming.length);

    async function refresh() {
        const { data, error: failed } = await actions.doorway.state({ eventId: doorway.event.id });
        offline = Boolean(failed);
        if (!data) return;

        const known = new Set(doorway.atDoor.map((member) => member.id));
        if (data.atDoor.some((member) => !known.has(member.id))) navigator.vibrate?.(200);
        doorway = data;
        welcoming = welcoming.filter((id) => !data.present.some((member) => member.id === id));
    }

    // Poll while the page is visible
    $effect(() => {
        const timer = setInterval(() => {
            if (document.visibilityState === "visible") refresh();
        }, POLL_MS);
        return () => clearInterval(timer);
    });

    // Show the queue in the tab title, so it's visible from another tab
    $effect(() => {
        document.title = atDoor.length > 0 ? `(${atDoor.length}) Doorway` : "Doorway";
    });

    async function welcome(userId: string) {
        error = "";
        welcoming = [...welcoming, userId];
        const result = await actions.doorway.welcome({ eventId: doorway.event.id, userId });
        if (result.error) {
            welcoming = welcoming.filter((id) => id !== userId);
            error = result.error.message;
        }
        await refresh();
    }

    async function addGuest(event: SubmitEvent) {
        event.preventDefault();
        error = "";
        const result = await actions.doorway.addGuest({ eventId: doorway.event.id, name: guestName });
        if (result.error) {
            error = result.error.message;
        } else {
            guestName = "";
        }
        await refresh();
    }

    async function removeGuest(guestId: string, name: string) {
        if (!confirm(`Remove ${name}?`)) return;
        const result = await actions.doorway.removeGuest({ guestId });
        if (result.error) error = result.error.message;
        await refresh();
    }
</script>

<div class="flex flex-col gap-6 py-4">
    <div>
        <h2 class="text-xl">{doorway.event.title}</h2>
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
        {#if atDoor.length === 0}
            <p class="quiet">Nobody yet. New arrivals pop up here when they ring the doorbell.</p>
        {/if}
        <ul class="flex flex-col gap-3 pt-2">
            {#each atDoor as member (member.id)}
                <li class="arrival flex items-center gap-3 p-2">
                    <Avatar name={member.name} image={member.image} size="4rem" />
                    <div class="grow">
                        <p class="text-lg">{member.name}</p>
                        {#if member.username}<p>@{member.username}</p>{/if}
                    </div>
                    <button class="welcome" onclick={() => welcome(member.id)}>welcome</button>
                </li>
            {/each}
        </ul>
    </section>

    <section>
        <h3>add a guest</h3>
        <form class="flex gap-2 pt-2" onsubmit={addGuest}>
            <input
                class="grow px-1"
                placeholder="name (a +1, or someone without an account)"
                required
                maxlength="64"
                bind:value={guestName}
            />
            <button>add</button>
        </form>
    </section>

    <section>
        <h3>here ({hereCount})</h3>
        <ul class="flex flex-col gap-2 pt-2">
            {#each doorway.present as member (member.id)}
                <li class="flex items-center gap-2">
                    <Avatar name={member.name} image={member.image} />
                    <span>{member.name}</span>
                </li>
            {/each}
            {#each doorway.guests as guest (guest.id)}
                <li class="flex items-center gap-2">
                    <Avatar name={guest.name} />
                    <span>{guest.name} (guest)</span>
                    <button class="small" onclick={() => removeGuest(guest.id, guest.name)}>remove</button>
                </li>
            {/each}
        </ul>
    </section>

    <section>
        <h3>coming ({doorway.coming.length})</h3>
        <p class="quiet">RSVP'd but haven't rung yet. Welcome them here if they arrive without their phone.</p>
        <ul class="flex flex-col gap-2 pt-2">
            {#each doorway.coming.filter((member) => !welcoming.includes(member.id)) as member (member.id)}
                <li class="flex items-center gap-2">
                    <Avatar name={member.name} image={member.image} />
                    <span>{member.name}</span>
                    <button class="small" onclick={() => welcome(member.id)}>welcome</button>
                </li>
            {/each}
        </ul>
    </section>
</div>

<style>
    h3 {
        border-bottom: 1px solid var(--color-primary);
    }

    input {
        border: 1px solid var(--color-primary);
    }

    button {
        border: 1px solid var(--color-primary);
        padding: 0.25rem 0.75rem;
        text-decoration: underline;
        cursor: pointer;
    }

    .arrival {
        border: 1px solid var(--color-primary);
    }

    .welcome {
        font-size: 1.25rem;
        padding: 0.75rem 1rem;
        background: var(--color-primary);
        color: var(--color-surface);
    }

    .small {
        padding: 0 0.5rem;
    }

    .quiet {
        font-size: 0.875rem;
    }
</style>
