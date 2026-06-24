/// <reference types="bun-types" />

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const file = await Bun.file("./scripts/assets/logo-small.png").arrayBuffer();

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

writeFile("./scripts/assets/output.txt", out.join(""));
