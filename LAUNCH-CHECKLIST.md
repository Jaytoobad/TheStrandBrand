# TheStrandBrand launch checklist

Everything that still needs a real value, a decision or a dashboard step.
Tick items off as you go. **Never paste secret keys into chat or commit them to git.**

Last reviewed: 1 October 2026

---

## 1. Business details (edit in `src/config/siteConfig.js`)

| Done | Item | Current value | Where it shows |
|---|---|---|---|
| [x] | Real business email | `abigaillartey99@icloud.com` | Contact page, Admin → Settings |
| [ ] | Real Instagram link | `https://instagram.com/thestrandbrand` (placeholder) | Footer, Contact page |
| [ ] | Confirm TikTok link | `https://tiktok.com/@the.strandbrand` | Footer |
| [ ] | Confirm Snapchat link | `https://snapchat.com/add/the.strandbrand` | Footer |
| [x] | Confirm WhatsApp number | `054 198 8028` (`233541988028`) | Floating button, order help, email templates |
| [x] | Confirm call number | `054 302 2208` | Contact page |
| [x] | Business location or address | "Accra, Ghana" confirmed on 1 October 2026 | Footer, email templates |

> If you change the WhatsApp number, also update it in both files in `supabase/templates/` and paste them into Supabase again.

## 2. Photos and branding

| Done | Item | File to replace (keep the same name, or update `siteConfig.js`) |
|---|---|---|
| [ ] | Hero slide 1 photo | `public/assets/hero-placeholder-1.png` |
| [ ] | Hero slide 2 photo | `public/assets/hero-placeholder-2.png` |
| [x] | "The Collection" photo on the home page | Done: `src/assets/collection-hair.jpg` (bundles + 3 wigs) |
| [ ] | Product photos | Upload in **Admin → Products** (fallback: `public/assets/placeholder-product.jpg`) |
| [ ] | Category photos | Upload in **Admin → Categories** (fallback: `public/assets/placeholder-category.jpg`) |
| [x] | Link-preview image for WhatsApp/Instagram shares | Done: `public/assets/og-image.png` (logo on pink, 1200×630) |
| [x] | Unused founder photo | Removed unused `public/assets/placeholder-ceo.jpg` placeholder |
| [x] | Old collection photo | `src/assets/background.jpg.jpg` was already absent and is no longer referenced |

## 3. Delivery and pricing

Fees are edited in **Admin → Settings → Delivery fees** (no code change needed). The server charges whatever is saved there.

| Done | Item | Notes |
|---|---|---|
| [x] | Greater Accra fee | **GH₵35** (confirmed) |
| [x] | Decide fees for the other 15 regions | Owner approved the listed GH₵45–60 fees on 1 October 2026 |
| [x] | Apply and verify fees for the other 15 regions | All 16 live `delivery_rates` rows read back with the approved values on 1 October 2026 |
| [x] | Delivery times | Owner confirmed 7 days to prepare plus 2–3 days to deliver on 1 October 2026 |

## 4. Legal pages

| Done | Item | Notes |
|---|---|---|
| [ ] | Lawyer review | Refund, Privacy, Cookie and Terms pages should be checked by Ghana-qualified counsel, including US-region PostHog analytics and cross-border data processing |
| [ ] | Registered business name and number | Not shown anywhere yet. Add them to Terms and Privacy once registered |
| [ ] | Refund policy version | Checkout records version `2026-09-28` (`supabase/functions/initialize-payment/index.ts`). If you change the refund policy, update this date and the "Last updated" line, then redeploy the function |

## 5. Emails

| Done | Item | Notes |
|---|---|---|
| [ ] | Sign-up and password emails (Supabase SMTP) | Set up Brevo SMTP. Steps are in the plan and README |
| [ ] | Branded email templates | Paste `supabase/templates/confirm-signup.html` and `reset-password.html` into **Supabase → Authentication → Emails → Templates**. Subjects are at the top of each file |
| [ ] | Order confirmation emails (Resend) | Needs Edge Function secrets `RESEND_API_KEY` and `ORDER_NOTIFICATION_FROM_EMAIL`. Resend needs a verified domain, so this waits until you own one. Until then no order emails are sent (the code skips them safely) |
| [ ] | Order SMS (Twilio) | Needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Optional. Without them, SMS is skipped |

## 6. Current site URL and custom domain

Current canonical URL: `https://the-strand-brand.vercel.app` until a custom domain is purchased.

- [x] Local `.env` and `.env.example` use the current Vercel URL
- [ ] Set Vercel `VITE_PUBLIC_SITE_URL` to `https://the-strand-brand.vercel.app` and redeploy
- [ ] Supabase Auth → URL Configuration: set Site URL to the Vercel URL and add `https://the-strand-brand.vercel.app/reset-password`
- [x] Supabase Edge Function secret `PUBLIC_SITE_URL` set to the current Vercel URL on 1 October 2026

### When you buy a custom domain

- [ ] Add the domain in Vercel → Project → Settings → Domains
- [ ] Vercel env var `VITE_PUBLIC_SITE_URL` → `https://yourdomain`, then redeploy (this also updates the link preview, sitemap and robots.txt)
- [ ] Supabase → Authentication → URL Configuration: Site URL + Redirect URL `https://yourdomain/reset-password`
- [ ] Supabase Edge Function secret `PUBLIC_SITE_URL=https://yourdomain`
- [ ] Brevo: add and verify the domain (DNS records), then change the sender to `hello@yourdomain`
- [ ] Resend: verify the domain, then set `ORDER_NOTIFICATION_FROM_EMAIL`
- [ ] Update `contactEmail` in `siteConfig.js`
- [ ] Update `VITE_PUBLIC_SITE_URL` / `PUBLIC_SITE_URL` in `.env.example` (currently `your-store-domain.example`)

## 7. Payments (before accepting real money)

- [ ] Paystack account fully verified (business documents submitted)
- [ ] Paystack → Settings → API Keys & Webhooks → Webhook URL set to
      `https://orsipouxwpxowsgzgjxf.supabase.co/functions/v1/paystack-webhook`
- [ ] Complete one full test payment, confirm "Order Confirmed" then Track Order
- [ ] Switch to **live** keys: Vercel `VITE_PAYSTACK_PUBLIC_KEY=pk_live_…` and Supabase secret `PAYSTACK_SECRET_KEY=sk_live_…`, then redeploy both
- [ ] Place one small real order and refund it from Paystack to confirm the full flow

## 8. Accounts, analytics and SEO

- [x] First admin account exists (one admin profile verified on 1 October 2026)
- [ ] PostHog: set `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` in Vercel. The local project uses the US host and analytics are consent-gated; include cross-border processing in counsel's review
- [x] Supabase Edge Function PostHog settings configured with the existing US project on 1 October 2026
- [x] `sitemap.xml` and `robots.txt`: built automatically on every deploy (`seo.config.js`), including every active product. New products appear after the next deploy
- [ ] Google Search Console: add the site, then submit `https://the-strand-brand.vercel.app/sitemap.xml` (use your own domain once you have one)
- [ ] Google Business Profile (optional)

## 9. Marketing

- [ ] Short promo video ("brag" skill). Needs FFmpeg installed on this PC; not made yet
