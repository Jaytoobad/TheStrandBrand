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
| [x] | Supabase custom SMTP configuration | Brevo SMTP is enabled at `smtp-relay.brevo.com:587` |
| [ ] | Verify email sender and delivery | Verify the configured sender address in Brevo, then send a safe auth-email test |
| [x] | Branded email templates | Confirm sign up and Reset password templates saved in Supabase on 1 October 2026; required URL variables retained |
| [ ] | Order confirmation emails (Resend) | Needs Edge Function secrets `RESEND_API_KEY` and `ORDER_NOTIFICATION_FROM_EMAIL`. Resend needs a verified domain, so this waits until you own one. Until then no order emails are sent (the code skips them safely) |
| [ ] | Order SMS (Twilio) | Needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Optional. Without them, SMS is skipped |

## 6. Current site URL and custom domain

Current canonical URL: `https://the-strand-brand.vercel.app` until a custom domain is purchased.

- [x] Local `.env` and `.env.example` use the current Vercel URL
- [x] Vercel `VITE_PUBLIC_SITE_URL` is set to `https://the-strand-brand.vercel.app` for Production; live contact page verified after deployment
- [x] Supabase Auth Site URL set to `https://the-strand-brand.vercel.app/`; production reset-password URL already allowlisted
- [x] Supabase Edge Function secret `PUBLIC_SITE_URL` set to the current Vercel URL on 1 October 2026

### When you buy a custom domain

- [ ] Add the domain in Vercel → Project → Settings → Domains
- [ ] Vercel env var `VITE_PUBLIC_SITE_URL` → `https://yourdomain`, then redeploy (this also updates the link preview, sitemap and robots.txt)
- [ ] Supabase → Authentication → URL Configuration: Site URL + Redirect URL `https://yourdomain/reset-password`
- [ ] Supabase Edge Function secret `PUBLIC_SITE_URL=https://yourdomain`
- [ ] Brevo: add and verify the domain (DNS records), then change the sender to `hello@yourdomain`
- [ ] Resend: verify the domain, then set `ORDER_NOTIFICATION_FROM_EMAIL`
- [ ] Update `contactEmail` in `siteConfig.js`
- [ ] When a custom domain is purchased, update `VITE_PUBLIC_SITE_URL` and `PUBLIC_SITE_URL` in `.env.example`, local/Vercel config, and Supabase Auth

## 7. Payments (before accepting real money)

- [ ] Paystack account fully verified (business documents submitted)
- [ ] Paystack → Settings → API Keys & Webhooks → Webhook URL set to
      `https://orsipouxwpxowsgzgjxf.supabase.co/functions/v1/paystack-webhook`
- [ ] Complete one full test payment, confirm "Order Confirmed" then Track Order
- [x] Live mode is active: Vercel public key is `pk_live`; a successful production payment was recorded on 30 September 2026. No additional live payment test was run
- [ ] Place one small real order and refund it from Paystack to confirm the full flow
- [ ] Confirm compliant fee-recovery pricing: Paystack's Merchant Agreement says card rules prohibit card acceptance surcharges. Do not add a payment-specific fee to delivery without written Paystack and Ghana legal advice; consider uniform advertised product pricing instead

## 8. Accounts, analytics and SEO

- [x] First admin account exists (one admin profile verified on 1 October 2026)
- [x] Vercel PostHog token and host are configured for Production. The project uses the US host and analytics are consent-gated; include cross-border processing in counsel's review
- [x] Supabase Edge Function PostHog settings configured with the existing US project on 1 October 2026
- [x] `sitemap.xml` and `robots.txt`: built automatically on every deploy (`seo.config.js`), including every active product. New products appear after the next deploy
- [ ] Google Search Console: add the site, then submit `https://the-strand-brand.vercel.app/sitemap.xml` (use your own domain once you have one)
- [ ] Google Business Profile (optional)

## 9. Security follow-up

- [x] Baseline Vercel security headers configured in `vercel.json`
- [x] Paystack webhook verifies HMAC signatures; transient processing failures now return non-2xx so Paystack retries
- [ ] Enable leaked-password protection (Supabase advisor reports it disabled; the feature requires Pro) — dashboard step, no code change
- [x] Rate limiting added to guest checkout initialization, payment verification and public order tracking (`supabase/functions/_shared/rate-limit.ts`, migration `0008_rate_limiting.sql`). Limits: checkout 40/IP + 10/email per hour, verification 60/IP + 20/reference per hour, tracking 15/IP per 10 minutes. Migration applied and both functions deployed on 2 October 2026; blocking, counters and the friendly error message verified live
- [x] Reviewed the `is_admin` and `track_order` `SECURITY DEFINER` RPCs. Both pin `search_path = ''` and were revoked from `public` (migration `0006`); `track_order` is now revoked from `anon`/`authenticated` so the only public entry point is the rate-limited `track_order_limited`
- [x] Order ownership is decided server-side. `initialize-payment` used to trust a `userId` sent by the browser; it now verifies the Supabase access token and takes the account from the token, so an order can never be attached to another customer's account
- [ ] Automate cleanup of abandoned `pending_payment` orders (14 have accumulated from unpaid checkouts) with a `pg_cron` job — not yet written

## 10. Marketing

- [ ] Short promo video ("brag" skill). Needs FFmpeg installed on this PC; not made yet
