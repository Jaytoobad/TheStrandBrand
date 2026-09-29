import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import seoPlugin from './seo.config.js';

// Vercel auto-detects Vite projects (build command: `npm run build`, output: `dist`).
// seoPlugin adds link-preview URLs, sitemap.xml and robots.txt at build time.
export default defineConfig(({ mode }) => ({
  plugins: [react(), seoPlugin({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env })],
}));
