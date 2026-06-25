import type { LocalImageService } from "astro";
import sharp from "sharp";
import defaultImageService from "../../node_modules/astro/dist/assets/services/sharp";

// Character cell dimensions — CELL_H matches Logo.svelte's CELL constant
const CELL_W = 6;
const CELL_H = 10;
const FONT_SIZE = CELL_H * 0.9; // same ratio as Logo.svelte

const CHARS = [..."`.-;:sfI31tluneoZ5YxqksP6h9d4$Bg0MNWQ%&@GMN"];

const service: LocalImageService = {
    getURL(options) {
        const searchParams = new URLSearchParams();
        searchParams.append(
            "href",
            typeof options.src === "string" ? options.src : options.src.src,
        );
        if (options.width) searchParams.append("width", String(options.width));
        if (options.quality)
            searchParams.append("quality", String(options.quality));
        return `/_image?${searchParams}`;
    },

    parseURL(url) {
        const params = url.searchParams;
        return {
            src: params.get("href")!,
            width: params.get("width")!,
            quality: params.get("quality") || params.get("origFormat"),
        };
    },

    transform: async (inputBuffer, transform, imageConfig) => {
        const quality = transform.quality as string | undefined;
        if (!quality || quality !== "mosaic") {
            return defaultImageService.transform(
                inputBuffer,
                transform,
                imageConfig,
            );
        }

        const cols = 140;

        const meta = await sharp(inputBuffer).metadata();
        const imageAspect = (meta.height ?? 1) / (meta.width ?? 1);
        const gridRows = Math.round(cols * imageAspect * (CELL_W / CELL_H));

        const { data } = await sharp(inputBuffer)
            .resize(cols, gridRows, { fit: "fill" })
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const svgW = cols * CELL_W;
        const svgH = gridRows * CELL_H;

        const textElements: string[] = [];
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < cols; x++) {
                const brightness = data[y * cols + x];
                const charIndex = Math.round(
                    (1 - brightness / 255) * (CHARS.length - 1),
                );
                const char = CHARS[charIndex];
                const stepped = charIndex / (CHARS.length - 1);
                textElements.push(
                    `<g transform="translate(${x * CELL_W} ${y * CELL_H})">` +
                        `<rect width="${CELL_W}" height="${CELL_H}" fill="rgba(0,0,255,${stepped * 0.3})"/>` +
                        `<text dy="${CELL_H}">${escapeXml(char)}</text>` +
                        `</g>`,
                );
            }
        }

        const svg = [
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}">`,
            `<rect width="${svgW}" height="${svgH}" fill="white"/>`,
            `<g font-family="'Times New Roman', Georgia, serif" font-size="${FONT_SIZE}" fill="blue">`,
            ...textElements,
            `</g>`,
            `</svg>`,
        ].join("\n");

        const outputWidth = transform.width
            ? parseInt(transform.width as string)
            : svgW;

        const webpData = await sharp(Buffer.from(svg))
            .resize(outputWidth)
            .webp()
            .toBuffer();

        return { data: webpData, format: "webp" };
    },
};

export default service;

function escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
