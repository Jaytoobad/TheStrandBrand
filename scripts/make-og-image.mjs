// ============================================================================
// Build the WhatsApp / Instagram link-preview image (public/assets/og-image.png)
// ============================================================================
// The preview image is what people see when the store link is shared, so it
// carries the slogan on top of the hero photo with a dark scrim that keeps the
// white text readable at thumbnail size.
//
// This script renders candidates into scripts/og-candidates/ so a font style can
// be chosen before anything replaces the live og-image.png. Text is white,
// positioned with real margins, and sized so the photo stays visible.
//
// Usage: node scripts/make-og-image.mjs
// Fonts come from the local Windows font set; no network access needed.
// ============================================================================

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const BACKGROUND = 'public/assets/hero-placeholder-1.png';
const SLOGAN_LINES = ['Hi Beautiful,', 'Your Signature', 'Look Starts Here!'];

const CANDIDATES = [
  { name: 'serif', font: 'Constantia', size: 78, style: 'normal', weight: 'normal', letterSpacing: 0 },
  { name: 'script', font: 'Brush Script MT', size: 104, style: 'normal', weight: 'normal', letterSpacing: 0 },
  { name: 'sans', font: 'Segoe UI', size: 66, style: 'normal', weight: '300', letterSpacing: 1 },
];

const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function overlaySvg({ font, size, weight, letterSpacing }) {
  const lineHeight = Math.round(size * 1.16);
  const blockHeight = lineHeight * SLOGAN_LINES.length;
  const startY = Math.round((HEIGHT - blockHeight) / 2 + size * 0.86); // optical centring
  const left = 88;

  const brandSize = 20;
  const brandY = startY - blockHeight - 58;

  return Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a1614" stop-opacity="0.78"/>
      <stop offset="55%" stop-color="#1a1614" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#1a1614" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrim)"/>
  <text x="${left}" y="${brandY}" font-family="${font}" font-size="${brandSize}" font-weight="600"
        letter-spacing="4.5" fill="#ffffff" fill-opacity="0.92">THE STRAND BRAND</text>
  ${SLOGAN_LINES.map((line, index) => `<text x="${left}" y="${startY + index * lineHeight}" font-family="${font}" font-size="${size}" font-weight="${weight}" font-style="${weight === 'italic' ? 'italic' : 'normal'}" letter-spacing="${letterSpacing}" fill="#ffffff">${esc(line)}</text>`).join('\n  ')}
</svg>`);
}

await mkdir('scripts/og-candidates', { recursive: true });

for (const candidate of CANDIDATES) {
  const output = path.join('scripts/og-candidates', `og-image-${candidate.name}.png`);
  await sharp(BACKGROUND)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlaySvg(candidate) }])
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`wrote ${output}`);
}

console.log('\nCopy the chosen file over public/assets/og-image.png to publish it.');
