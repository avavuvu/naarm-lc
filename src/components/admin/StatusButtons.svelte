<script lang="ts">
    import { actions } from "astro:actions";
    import type { MemberStatus } from "../../lib/members";

    // `page` is where the form posts back to, so the page can redirect after the action runs.
    const { userId, status, page }: { userId: string; status: MemberStatus; page: string } = $props();
</script>

<span class="inline-flex gap-4">
    {#if status !== "approved"}
        <form method="POST" action="{page}{actions.members.approve}" class="inline">
            <input type="hidden" name="userId" value={userId} />
            <button>approve</button>
        </form>
    {/if}
    {#if status !== "declined"}
        <form method="POST" action="{page}{actions.members.decline}" class="inline">
            <input type="hidden" name="userId" value={userId} />
            <button>{status === "approved" ? "hide" : "decline"}</button>
        </form>
    {/if}
</span>
