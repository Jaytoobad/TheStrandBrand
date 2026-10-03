// ============================================================================
// Build the WhatsApp / Instagram link-preview image (public/assets/og-image.jpg)
// ============================================================================
// The preview image is what people see when the store link is shared, so it
// carries the slogan on top of the hero photo with a dark scrim that keeps the
// white text readable at thumbnail size.
//
// Type treatment, per the client's direction:
//   "Hi Beautiful,"  → the serif intro face (a stand-in for the brand's
//                      Cormorant Garamond)
//   "Your Signature / Look Starts Here!" → the script face
//
// The client's script face is "Paty" (2013) by Carolina Mejia Villegas, a
// paid commercial typeface. It cannot be shipped here, so the defaults are the
// closest free equivalents from Google Fonts. To use the real thing, buy the
// licence, drop the .ttf anywhere on disk and run:
//
//   node scripts/make-og-image.mjs --script-font C:\path\to\Paty.ttf
//
// Nothing is overwritten: candidates are written to scripts/og-candidates/ and
// you convert the chosen file to JPEG as public/assets/og-image.jpg yourself.
//
// Usage: node scripts/make-og-image.mjs [--script-font <ttf>] [--name <label>]
// ============================================================================

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const BACKGROUND = 'public/assets/hero-placeholder-1.png';
const INTRO = 'Hi Beautiful,';
const SCRIPT_LINES = ['Your Signature', 'Look Starts Here!'];
const INTRO_FONT = 'Cormorant Garamond, Constantia, Georgia, serif';

const FONT_DIR = path.join(process.env.LOCALAPPDATA || '.', 'Temp', 'kilo', 'fonts');
const FREE_SCRIPTS = [
  { name: 'great-vibes', file: 'GreatVibes-Regular.ttf', size: 132 },
  { name: 'parisienne', file: 'Parisienne-Regular.ttf', size: 104 },
  { name: 'sacramento', file: 'Sacramento-Regular.ttf', size: 150 },
  { name: 'allura', file: 'Allura-Regular.ttf', size: 132 },
];

const args = process.argv.slice(2);
const flag = (key) => {
  const index = args.indexOf(key);
  return index === -1 ? null : args[index + 1];
};

const customScript = flag('--script-font');
const customName = flag('--name') || 'custom-script';

const INTRO_SIZE = 74;
const LINE_GAP = 1.04;
const LEFT = 88;
const BOTTOM = 118; // keeps the slogan clear of the hero's bottom edge

const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function overlaySvg({ scriptFont, scriptSize, introSize }) {
  const lineHeight = Math.round(scriptSize * LINE_GAP);
  const scriptBlock = lineHeight * SCRIPT_LINES.length;
  // Intro sits directly above the script block, and the whole group is centred
  // inside the left column with a fixed bottom margin, so nothing drifts when
  // the slogan or font size changes.
  const scriptBottom = HEIGHT - BOTTOM;
  const scriptTop = scriptBottom - scriptBlock;
  const introBaseline = Math.round(scriptTop - 26);

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
  <text x="${LEFT}" y="${Math.round(introBaseline - introSize * 0.72)}" font-family="${INTRO_FONT}" font-size="20" font-weight="600"
        letter-spacing="5" fill="#ffffff" fill-opacity="0.9">THE STRAND BRAND</text>
  <text x="${LEFT}" y="${introBaseline}" font-family="${INTRO_FONT}" font-size="${introSize}" fill="#ffffff">${esc(INTRO)}</text>
  ${SCRIPT_LINES.map((line, index) => `<text x="${LEFT}" y="${Math.round(scriptTop + scriptSize * 0.78 + index * lineHeight)}" font-family="${scriptFont}" font-size="${scriptSize}" fill="#ffffff">${esc(line)}</text>`).join('\n  ')}
</svg>`);
}

await mkdir('scripts/og-candidates', { recursive: true });

const base = () => sharp(BACKGROUND).resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' });

const variants = customScript
  ? [{ name: customName, file: customScript, size: Number(flag('--script-size') || 132) }]
  : FREE_SCRIPTS.map((font) => ({ ...font, file: path.join(FONT_DIR, font.file) }));

for (const variant of variants) {
  try {
    await stat(variant.file);
  } catch {
    console.error(`Missing font file: ${variant.file}`);
    console.error('Download the free substitutes into %LOCALAPPDATA%\\Temp\\kilo\\fonts, or pass --script-font <path>.');
    process.exit(1);
  }

  const output = path.join('scripts/og-candidates', `og-image-${variant.name}.png`);
  await base()
    .composite([{ input: overlaySvg({ scriptFont: variant.file.replace(/\\/g, '/'), scriptSize: variant.size, introSize: INTRO_SIZE }) }])
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`wrote ${output} (script size ${variant.size}px)`);
}

console.log('\nOpen the candidates, pick one, then convert it to JPEG and save it as public/assets/og-image.jpg.');
