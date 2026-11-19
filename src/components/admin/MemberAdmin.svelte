<script lang="ts">
    import StatusButtons from "./StatusButtons.svelte";
    import type { MemberStatus } from "../../lib/members";

    type Props = { member: { id: string; status: MemberStatus; email: string | null }; path: string };

    const { member, path }: Props = $props();

    const statusLabels: Record<MemberStatus, string> = {
        pending: "waiting for approval",
        approved: "listed on the members page",
        declined: "hidden from the members page",
    };
</script>

<section class="flex flex-col gap-4 border-t py-6">
    <h2>admin</h2>
    <p>{statusLabels[member.status]}{member.email ? ` · ${member.email}` : ""}</p>
    <p class="flex gap-6 flex-wrap">
        <a class="button" href="{path}/edit">edit</a>
        <StatusButtons userId={member.id} status={member.status} page={path} />
        <a href="/admin">admin area</a>
    </p>
</section>
