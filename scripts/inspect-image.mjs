// ============================================================================
// Terminal inspection of an image, for when the model cannot view images.
// ============================================================================
// Renders a coarse ASCII luminance map so the layout can be read from the
// terminal: where the text sits, how many lines there are, whether the type is
// white on a dark photo, and how much of the frame the artwork occupies.
//
// Usage: node scripts/inspect-image.mjs <path> [columns]
// ============================================================================

import sharp from 'sharp';

const file = process.argv[2];
const columns = Number(process.argv[3] || 64);

if (!file) {
  console.error('Usage: node scripts/inspect-image.mjs <image-path> [columns]');
  process.exit(1);
}

const image = sharp(file);
const meta = await image.metadata();
const stats = await image.stats();

console.log(`file:   ${file}`);
console.log(`size:   ${meta.width}x${meta.height} (${meta.format})`);
console.log(`mean:   ${stats.channels.slice(0, 3).map((c) => Math.round(c.mean)).join(', ')}`);
console.log(`spread: ${stats.channels.slice(0, 3).map((c) => Math.round(c.stdev)).join(', ')}`);

const height = Math.max(1, Math.round((meta.height / meta.width) * columns * 0.5));
const { data } = await image
  .resize(columns, height, { fit: 'fill' })
  .removeAlpha()
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const RAMP = ' .:-=+*#%@';
console.log(`\nluminance map (${columns}x${height}), darker = blank:\n`);
for (let y = 0; y < height; y += 1) {
  let row = '';
  for (let x = 0; x < columns; x += 1) {
    row += RAMP[Math.min(RAMP.length - 1, Math.floor((data[y * columns + x] / 255) * RAMP.length))];
  }
  console.log(row);
}
