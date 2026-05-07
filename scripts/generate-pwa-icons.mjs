/**
 * Renders PWA / Apple touch icons from an inline SVG (paper + book frame + seal).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "icons");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#ffffff"/>
  <rect x="120" y="100" width="272" height="312" rx="20" fill="none" stroke="#1a1a1a" stroke-width="10"/>
  <line x1="120" y1="168" x2="392" y2="168" stroke="#1a1a1a" stroke-width="6"/>
  <circle cx="256" cy="286" r="44" fill="#6b2f2f"/>
</svg>`;

async function writePng(size, filename) {
  await mkdir(outDir, { recursive: true });
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(outDir, filename));
}

await writePng(192, "icon-192x192.png");
await writePng(512, "icon-512x512.png");
await writePng(180, "apple-touch-icon.png");
console.log("Wrote PWA icons to public/icons/");
