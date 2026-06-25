/// <reference types="bun-types" />

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

if (!process.argv[2]) {
    throw new Error("No argument provided for image path!");
}
const filePath = process.argv[2];

const file = await Bun.file(filePath).arrayBuffer();

const data = await sharp(file).raw().toBuffer();

const out = [];
for (let i = 0; i < data.length / 4; i++) {
    const alpha = data[i * 4 + 3];
    if (alpha !== 0) {
        out[i] = 1;
        continue;
    }

    out[i] = 0;
}

const outputName = `${Bun.file(filePath).name!.split("/").at(-1)}.txt`;

writeFile(`./scripts/assets/${outputName}`, out.join(""));
