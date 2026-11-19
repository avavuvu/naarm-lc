import sharp from "sharp";

// Character cell size. CELL_H matches Logo.svelte's CELL constant.
const CELL_W = 6;
const CELL_H = 10;
const FONT_SIZE = CELL_H * 0.9;
const COLS = 140;

const CHARS = [..."`.-;:sfI31tluneoZ5YxqksP6h9d4$Bg0MNWQ%&@GMN"];

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Redraws an image as blue text characters, darker pixels getting denser characters.
export async function mosaic(input: Buffer, outputWidth = 1200) {
    const meta = await sharp(input).metadata();
    const aspect = (meta.height ?? 1) / (meta.width ?? 1);
    const rows = Math.max(1, Math.round(COLS * aspect * (CELL_W / CELL_H)));

    const data = await sharp(input).rotate().resize(COLS, rows, { fit: "fill" }).grayscale().raw().toBuffer();

    const cells: string[] = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < COLS; x++) {
            const index = Math.round((1 - data[y * COLS + x] / 255) * (CHARS.length - 1));
            const shade = index / (CHARS.length - 1);
            cells.push(
                `<g transform="translate(${x * CELL_W} ${y * CELL_H})">` +
                    `<rect width="${CELL_W}" height="${CELL_H}" fill="rgba(0,0,255,${shade * 0.3})"/>` +
                    `<text dy="${CELL_H}">${escapeXml(CHARS[index])}</text>` +
                    `</g>`,
            );
        }
    }

    const width = COLS * CELL_W;
    const height = rows * CELL_H;
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
        `<rect width="${width}" height="${height}" fill="white"/>`,
        `<g font-family="'Times New Roman', Georgia, serif" font-size="${FONT_SIZE}" fill="blue">`,
        ...cells,
        `</g>`,
        `</svg>`,
    ].join("\n");

    return sharp(Buffer.from(svg)).resize(outputWidth).webp().toBuffer();
}
