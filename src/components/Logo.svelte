<script lang="ts">
    import type { Attachment } from "svelte/attachments";
    //@ts-ignore
    import smallLogoData from "../assets/small-logo.txt?raw";
    import sidewaysLogoData from "../assets/small-logo-sideways.txt?raw";

    const {
        variant = "small",
    }: {
        variant: Variant;
    } = $props();

    type Variant = "small" | "large" | "sideways" | "blank";

    const defaultFilledChars = [..."LIVECODERSNAARM"].map((c) =>
        c === "M" || c === "N" ? `[${c}` : `[${c}]`,
    );

    const displayDataMap: Record<
        Variant,
        {
            rawDataCols: number;
            cols: number;
            rawDataRows: number;
            rows: number;
            filledChars: string[];
            unfilledChars: string[];
            data: string;
        }
    > = {
        large: {
            rawDataCols: 81,
            cols: 81,
            rawDataRows: 28,
            rows: 28,
            filledChars: defaultFilledChars,
            unfilledChars: ["  ^ ", "  , "],
            data: smallLogoData,
        },
        small: {
            // small has more cols than large because it means the height is smaller
            // bc the aspect ratio makes it thinner
            rawDataCols: 81,
            cols: 181,
            rawDataRows: 28,
            rows: 28,
            filledChars: defaultFilledChars,
            unfilledChars: ["  - ", "  # "],
            data: smallLogoData,
        },
        sideways: {
            rawDataCols: 28,
            cols: 28,
            rawDataRows: 81,
            rows: 60,
            filledChars: defaultFilledChars,
            unfilledChars: ["  - ", "  # "],
            data: sidewaysLogoData,
        },
        blank: {
            rawDataCols: 0,
            cols: 181,
            rawDataRows: 0,
            rows: 28,
            filledChars: defaultFilledChars,
            unfilledChars: ["  - ", "  # "],
            data: "",
        },
    };

    const CELL = 10;

    // svelte-ignore state_referenced_locally
    const display = displayDataMap[variant];

    const data: string[] = display.data.split("");
    const cells = data.reduce(
        (acc, value, index) => {
            acc.push({
                x: index % display.rawDataCols,
                y: Math.floor(index / display.rawDataCols),
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

        canvas.width = display.cols * CELL * dpr;
        canvas.height = display.rows * CELL * dpr;
        context.scale(dpr, dpr);

        let raf: number;

        const draw = (now: number) => {
            const time = (now - start) / 1000;
            context.clearRect(0, 0, display.cols * CELL, display.rows * CELL);
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
                    ? display.filledChars[phase % display.filledChars.length]
                    : display.unfilledChars[
                          phase % display.unfilledChars.length
                      ];

                context.fillText(char, x * CELL, y * CELL);
            }

            const colDifference = display.cols - display.rawDataCols;
            const rowDifference = display.rows - display.rawDataRows;

            const drawUnfilled = (x: number, y: number) => {
                const dist = Math.sqrt(x * x + y * y);
                const phase = Math.abs(
                    Math.floor(
                        time / 2 -
                            dist * 0.09 +
                            (Math.sin(x) + Math.sin(y)) * 0.2,
                    ),
                );
                context.fillText(
                    display.unfilledChars[phase % display.unfilledChars.length],
                    x * CELL,
                    y * CELL,
                );
            };

            if (colDifference > 0) {
                for (let x = display.rawDataCols; x < display.cols; x++) {
                    for (let y = 0; y < display.rows; y++) {
                        drawUnfilled(x, y);
                    }
                }
            }

            if (rowDifference > 0) {
                for (let y = display.rawDataRows; y < display.rows; y++) {
                    for (let x = 0; x < display.rawDataCols; x++) {
                        drawUnfilled(x, y);
                    }
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
        color: var(--color-primary);
        width: 100%;
        height: auto;
        min-height: 4rem;
        display: block;
    }
</style>
