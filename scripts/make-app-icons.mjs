// Builds the PWA / home-screen icons from the real logo.
//
// The logo is 172x215 (portrait), so it is centred on an opaque square rather
// than stretched: a squashed mark reads as a mistake on a home screen. iOS
// renders a transparent apple-touch-icon on black, so the background is baked
// in here too.
//
// Usage: node scripts/make-app-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BG = '#ffffff';        // matches --color-surface
const BLUSH = '#f7dbe3';     // matches --color-blush / theme-color
const SOURCE = 'public/assets/logo.png';

// Inside a maskable icon the outer ~20% can be cropped away by the launcher, so
// the mark is kept well inside the safe circle.
const TARGETS = [
  { file: 'public/icons/icon-192.png', size: 192, bg: BG, scale: 0.86 },
  { file: 'public/icons/icon-512.png', size: 512, bg: BG, scale: 0.86 },
  { file: 'public/icons/icon-maskable-512.png', size: 512, bg: BLUSH, scale: 0.6 },
  { file: 'public/apple-touch-icon.png', size: 180, bg: BG, scale: 0.84 },
];

mkdirSync('public/icons', { recursive: true });

for (const { file, size, bg, scale } of TARGETS) {
  const box = Math.round(size * scale);
  const mark = await sharp(SOURCE)
    .resize(box, box, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .flatten({ background: bg })
    .png({ compressionLevel: 9 })
    .toFile(file);

  console.log(`${file}  ${size}x${size}`);
}