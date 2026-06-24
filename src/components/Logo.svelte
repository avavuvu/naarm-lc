<script lang="ts">
    import type { Attachment } from "svelte/attachments";
    //@ts-ignore
    import logoData from "../assets/small-logo.txt?raw";

    const {
        variant = "small",
    }: {
        variant: "small" | "large";
    } = $props();

    const COLS = 81;
    const ROWS = 28;
    const CELL = 10;
    const FILLED_CHARS = [..."LIVECODERSNAARM"].map((c) =>
        c === "M" || c === "N" ? `[${c}` : `[${c}]`,
    );

    // svelte-ignore state_referenced_locally
    const UNFILLED_CHARS =
        variant === "large" ? ["  - ", "  , "] : ["  - ", "  # "];

    const data: string[] = logoData.split("");
    const cells = data.reduce(
        (acc, value, index) => {
            acc.push({
                x: index % COLS,
                y: Math.floor(index / COLS),
                filled: value === "1",
            });
            return acc;
        },
        [] as Array<{ x: number; y: number; filled: boolean }>,
    );

    const animate: Attachment = (element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const color = getComputedStyle(canvas).color;
        const dpr = window.devicePixelRatio || 1;
        const start = performance.now();

        const additional = variant === "large" ? 0 : 100;
        const cols = COLS + additional;
        const rows = ROWS;
        canvas.width = cols * CELL * dpr;
        canvas.height = rows * CELL * dpr;
        context.scale(dpr, dpr);

        let raf: number;

        const draw = (now: number) => {
            const time = (now - start) / 1000;
            context.clearRect(0, 0, cols * CELL, rows * CELL);
            context.font = `${CELL * 0.9}px "Times New Roman", serif`;
            context.fillStyle = color;
            context.textBaseline = "top";

            for (const { x, y, filled } of cells) {
                const dist = Math.sqrt(x * x + y * y);
                const phase = Math.abs(
                    Math.floor(
                        time / 2 -
                            dist * 0.09 +
                            (Math.sin(x) + Math.sin(y)) * 0.2,
                    ),
                );

                const char = filled
                    ? FILLED_CHARS[phase % FILLED_CHARS.length]
                    : UNFILLED_CHARS[phase % UNFILLED_CHARS.length];

                context.fillText(char, x * CELL, y * CELL);
            }

            for (let x = COLS; x < cols; x++) {
                for (let y = 0; y < rows; y++) {
                    const dist = Math.sqrt(x * x + y * y);
                    const phase = Math.abs(
                        Math.floor(
                            time / 2 -
                                dist * 0.09 +
                                (Math.sin(x) + Math.sin(y)) * 0.2,
                        ),
                    );
                    context.fillText(
                        UNFILLED_CHARS[phase % UNFILLED_CHARS.length],
                        x * CELL,
                        y * CELL,
                    );
                }
            }

            raf = requestAnimationFrame(draw);
        };

        raf = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(raf);
        };
    };
</script>

<canvas {@attach animate}></canvas>

<style>
    canvas {
        color: blue;
        width: 100%;
        height: auto;
        min-height: 4rem;
        display: block;
    }
</style>
