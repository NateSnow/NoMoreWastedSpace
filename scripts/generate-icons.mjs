import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

const svgContent = readFileSync(resolve(publicDir, 'icon-512.svg'));

const sizes = [48, 72, 96, 144, 192, 512];

for (const size of sizes) {
  await sharp(svgContent)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, `icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}

console.log('Done!');
