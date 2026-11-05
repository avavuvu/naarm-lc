<script lang="ts">
    import { actions } from "astro:actions";
    import LoginForm from "../account/LoginForm.svelte";
    import type { EventAction } from "../../lib/events";


    const {
        eventId,
        path,
        action,
        ticketUrl,
    }: { eventId: number; path: string; action: EventAction; ticketUrl: string | null } = $props();

    // svelte-ignore state_referenced_locally
    const rsvp = `${path}${actions.events.rsvp}`;
    // svelte-ignore state_referenced_locally
    const cancel = `${path}${actions.events.cancelRsvp}`;
    // svelte-ignore state_referenced_locally
    const ring = `${path}${actions.events.ringDoorbell}`;
</script>

{#if action === "ended"}
    <p>this event has finished</p>
{:else if action === "tickets" && ticketUrl}
    <a class="button self-start" href={ticketUrl} target="_blank" rel="noopener">get tickets ↗</a>
{:else if action === "login"}
    <LoginForm {eventId} />
{:else if action === "full"}
    <p>full</p>
{:else if action === "rsvp"}
    <form method="POST" action={rsvp}>
        <input type="hidden" name="eventId" value={eventId} />
        <button>i'm coming</button>
    </form>
{:else if action === "going"}
    <form method="POST" action={cancel} class="flex gap-4">
        <span>you're going ✓</span>
        <input type="hidden" name="eventId" value={eventId} />
        <button>can't make it</button>
    </form>
{:else if action === "ring"}
    <form method="POST" action={ring}>
        <input type="hidden" name="eventId" value={eventId} />
        <button>ring the doorbell</button>
    </form>
{:else if action === "at_door"}
    <p>you've rung the doorbell. someone's coming to let you in…</p>
{:else if action === "present"}
    <p>you're in. welcome!</p>
{/if}
