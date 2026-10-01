// One-off / repeatable: creates the small `<name>.thumb.jpg` copy for every
// photo in the `product-images` bucket that doesn't have one yet.
// New uploads from the admin already get one; this covers older images.
//
// Usage (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/make-thumbnails.mjs
// The service-role key is read from the environment only. Never commit it.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_SERVICE_ROLE_KEY (and VITE_SUPABASE_URL in .env).'); process.exit(1); }

const bucket = createClient(url, key, { auth: { persistSession: false } }).storage.from('product-images');
const THUMB_WIDTH = 640;
const thumbPath = (p) => p.replace(/\.[^./]+$/, '') + '.thumb.jpg';

async function listAll(prefix = '') {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...await listAll(path)); // folder
      else out.push(path);
    }
    if (data.length < 1000) return out;
  }
}

const files = await listAll();
const existing = new Set(files);
const images = files.filter((p) => /\.(jpe?g|png|webp)$/i.test(p) && !p.includes('.thumb.'));
let made = 0; let savedFrom = 0; let savedTo = 0;

for (const path of images) {
  if (existing.has(thumbPath(path))) continue;
  const { data, error } = await bucket.download(path);
  if (error) { console.warn('skip', path, error.message); continue; }
  const input = Buffer.from(await data.arrayBuffer());
  const thumb = await sharp(input).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  const { error: upErr } = await bucket.upload(thumbPath(path), thumb, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true });
  if (upErr) { console.warn('upload failed', path, upErr.message); continue; }
  made += 1; savedFrom += input.length; savedTo += thumb.length;
  console.log(`${path}: ${Math.round(input.length / 1024)} KB -> ${Math.round(thumb.length / 1024)} KB`);
}
console.log(`Done. ${made} thumbnails made (${Math.round(savedFrom / 1024)} KB -> ${Math.round(savedTo / 1024)} KB). ${images.length - made} already had one or were skipped.`);
