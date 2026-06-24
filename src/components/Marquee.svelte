<script lang="ts">
    const { children } = $props();
</script>

<div class="marquee">
    {#each { length: 10 } as _index}
        <span class="marquee-text">[{@render children()}]</span>
    {/each}
</div>

<style>
    .marquee {
        overflow: hidden;
        white-space: nowrap;
        font-size: 9px;
        display: flex;
        gap: 2em;
    }

    .marquee-text {
        display: inline-block;
        animation: scroll 15s steps(81) infinite;
    }

    @keyframes scroll {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(-42ch);
        }
    }
</style>
