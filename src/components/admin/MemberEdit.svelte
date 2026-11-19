<script lang="ts">
    import ProfileFields from "../account/ProfileFields.svelte";
    import type { Profile } from "../../lib/members";

    type Props = {
        member: Profile & { slug: string };
        updateAction: string;
        deleteAction: string;
        canDelete: boolean;
        error?: string;
    };

    const { member, updateAction, deleteAction, canDelete, error }: Props = $props();

    function confirmDelete(submit: SubmitEvent) {
        if (!confirm(`delete ${member.name}'s account, profile and rsvps? this can't be undone.`)) {
            submit.preventDefault();
        }
    }
</script>

{#if error}
    <p role="alert">{error}</p>
{/if}

<form method="POST" action={updateAction} class="flex flex-col gap-2 max-w-md py-6">
    <input type="hidden" name="userId" value={member.id} />
    <ProfileFields profile={member} />

    <label for="slug">page url: /members/…</label>
    <input id="slug" name="slug" required maxlength="48" value={member.slug} />

    <button class="self-start mt-4">save changes</button>
</form>

{#if canDelete}
    <form method="POST" action={deleteAction} class="py-8" onsubmit={confirmDelete}>
        <input type="hidden" name="userId" value={member.id} />
        <button>delete account</button>
    </form>
{/if}
