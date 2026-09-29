// ============================================================================
// SEO build step: link-preview tags, sitemap.xml and robots.txt.
// The site address comes from VITE_PUBLIC_SITE_URL (set in Vercel). When you
// move to your own domain, change that env var and redeploy; everything here
// follows automatically.
// ============================================================================

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FALLBACK_SITE_URL = 'https://the-strand-brand.vercel.app';

// Public pages worth indexing. Account, cart, checkout and admin are left out.
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/faq', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/track-order', priority: '0.5', changefreq: 'monthly' },
  { path: '/refund-policy', priority: '0.4', changefreq: 'yearly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookie-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
];

function resolveSiteUrl(env) {
  const url = env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  return url && !url.includes('example') ? url : FALLBACK_SITE_URL;
}

// Adds every active product page. Runs at build time with the public key, so
// products added later appear in the sitemap after the next deploy.
async function fetchProductRoutes(env) {
  const base = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return [];
  try {
    const res = await fetch(`${base}/rest/v1/products?select=slug,updated_at&is_active=eq.true`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((p) => ({
      path: `/product/${encodeURIComponent(p.slug)}`,
      lastmod: p.updated_at?.slice(0, 10),
      priority: '0.8',
      changefreq: 'weekly',
    }));
  } catch {
    return []; // never fail the build over the sitemap
  }
}

function buildSitemap(siteUrl, routes) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes.map((r) => [
    '  <url>',
    `    <loc>${siteUrl}${r.path}</loc>`,
    `    <lastmod>${r.lastmod || today}</lastmod>`,
    `    <changefreq>${r.changefreq}</changefreq>`,
    `    <priority>${r.priority}</priority>`,
    '  </url>',
  ].join('\n'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function buildRobots(siteUrl) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /account',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /order-confirmation',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

export default function seoPlugin(env) {
  const siteUrl = resolveSiteUrl(env);
  return {
    name: 'strand-seo',
    // Replaces %SITE_URL% in index.html so link previews use absolute URLs.
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', siteUrl);
    },
    async generateBundle() {
      const productRoutes = await fetchProductRoutes(env);
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(siteUrl, [...STATIC_ROUTES, ...productRoutes]) });
    },
    // public/robots.txt is the dev copy; overwrite the built one so its
    // Sitemap line uses the real site address.
    writeBundle(options) {
      writeFileSync(join(options.dir || 'dist', 'robots.txt'), buildRobots(siteUrl));
    },
  };
}
