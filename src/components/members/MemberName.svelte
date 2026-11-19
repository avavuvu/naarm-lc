<script lang="ts">
    const { member }: { member: { name: string; alias: string | null } } = $props();
</script>

{member.name}{#if member.alias}{" "}<span class="italic">({member.alias})</span>{/if}
