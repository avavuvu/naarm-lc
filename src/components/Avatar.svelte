<script lang="ts">
    const {
        name,
        image = null,
        size = "2rem",
    }: { name: string; image?: string | null; size?: string } = $props();
</script>

{#if image}
    <img class="avatar" src={image} alt="" style:width={size} style:height={size} />
{:else}
    <span class="avatar initial" style:width={size} style:height={size} style:font-size="calc({size} / 2)">
        {name.charAt(0).toUpperCase()}
    </span>
{/if}

<style>
    .avatar {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--color-primary);
        object-fit: cover;
        /* Blue duotone, defined in BaseLayout */
        filter: url(#blue-mono);
    }
</style>
