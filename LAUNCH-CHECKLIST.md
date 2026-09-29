# TheStrandBrand launch checklist

Everything that still needs a real value, a decision or a dashboard step.
Tick items off as you go. **Never paste secret keys into chat or commit them to git.**

Last reviewed: 29 September 2026

---

## 1. Business details (edit in `src/config/siteConfig.js`)

| Done | Item | Current value | Where it shows |
|---|---|---|---|
| [ ] | Real business email | `hello@thestrandbrand.com` (placeholder, this inbox probably doesn't exist) | Contact page, Admin → Settings |
| [ ] | Real Instagram link | `https://instagram.com/thestrandbrand` (placeholder) | Footer, Contact page |
| [ ] | Confirm TikTok link | `https://tiktok.com/@the.strandbrand` | Footer |
| [ ] | Confirm Snapchat link | `https://snapchat.com/add/the.strandbrand` | Footer |
| [ ] | Confirm WhatsApp number | `054 198 8028` (`233541988028`) | Floating button, order help, email templates |
| [ ] | Confirm call number | `054 302 2208` | Contact page |
| [ ] | Business location or address | Footer only says "Accra, Ghana" | Footer, email templates |

> If you change the WhatsApp number, also update it in both files in `supabase/templates/` and paste them into Supabase again.

## 2. Photos and branding

| Done | Item | File to replace (keep the same name, or update `siteConfig.js`) |
|---|---|---|
| [ ] | Hero slide 1 photo | `public/assets/hero-placeholder-1.png` |
| [ ] | Hero slide 2 photo | `public/assets/hero-placeholder-2.png` |
| [ ] | Product photos | Upload in **Admin → Products** (fallback: `public/assets/placeholder-product.jpg`) |
| [ ] | Category photos | Upload in **Admin → Categories** (fallback: `public/assets/placeholder-category.jpg`) |
| [ ] | Link-preview image for WhatsApp/Instagram shares | None yet. Add a 1200×630 image and an `og:image` tag in `index.html` |
| [ ] | Unused founder photo | `public/assets/placeholder-ceo.jpg` isn't used anywhere. Delete it, or send a real photo so it can go on the About page |

## 3. Delivery and pricing

| Done | Item | Notes |
|---|---|---|
| [ ] | Delivery fee | One flat **GH₵30** for every region (`defaultDeliveryFee`). Decide whether Accra and other regions should cost different amounts |
| [ ] | Delivery times | Emails and the site say about 7 days to prepare plus 2–3 days to deliver. Confirm this is right |

## 4. Legal pages

| Done | Item | Notes |
|---|---|---|
| [ ] | Lawyer review | Refund, Privacy, Cookie and Terms pages should be checked by a Ghana-qualified lawyer |
| [ ] | Registered business name and number | Not shown anywhere yet. Add them to Terms and Privacy once registered |
| [ ] | Refund policy version | Checkout records version `2026-09-28` (`supabase/functions/initialize-payment/index.ts`). If you change the refund policy, update this date and the "Last updated" line, then redeploy the function |

## 5. Emails

| Done | Item | Notes |
|---|---|---|
| [ ] | Sign-up and password emails (Supabase SMTP) | Set up Brevo SMTP. Steps are in the plan and README |
| [ ] | Branded email templates | Paste `supabase/templates/confirm-signup.html` and `reset-password.html` into **Supabase → Authentication → Emails → Templates**. Subjects are at the top of each file |
| [ ] | Order confirmation emails (Resend) | Needs Edge Function secrets `RESEND_API_KEY` and `ORDER_NOTIFICATION_FROM_EMAIL`. Resend needs a verified domain, so this waits until you own one. Until then no order emails are sent (the code skips them safely) |
| [ ] | Order SMS (Twilio) | Needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Optional. Without them, SMS is skipped |

## 6. Custom domain (when you buy one)

- [ ] Add the domain in Vercel → Project → Settings → Domains
- [ ] Vercel env var `VITE_PUBLIC_SITE_URL` → `https://yourdomain`, then redeploy
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

- [ ] First admin account created (register, then run `update profiles set role = 'admin' where email = '…';` in the Supabase SQL editor)
- [ ] PostHog: confirm `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` are set in Vercel (analytics are silently off without them)
- [ ] `sitemap.xml` for Google (not created yet)
- [ ] Google Search Console / Google Business Profile (optional)
