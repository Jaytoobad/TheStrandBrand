import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standard Vite + React setup. No special config needed for Vercel deployment;
// Vercel auto-detects Vite projects (build command: `npm run build`, output: `dist`).
export default defineConfig({
  plugins: [react()],
});
