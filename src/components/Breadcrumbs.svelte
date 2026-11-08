<script lang="ts">
    export type Crumb = { label: string; href?: string };

    const { crumbs, current }: { crumbs: Crumb[]; current: string } = $props();
</script>

<nav aria-label="breadcrumb">
    <a href="/">naarm.lc</a>
    {#each crumbs as crumb, i (i)}
        {" / "}
        {#if crumb.href}
            <a href={crumb.href}>{crumb.label}</a>
        {:else}
            <span>{crumb.label}</span>
        {/if}
    {/each}
    {" / "}
    <span aria-current="page">{current}</span>
</nav>
