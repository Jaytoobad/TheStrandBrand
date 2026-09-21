# TheStrandBrand

A full-stack e-commerce wig store for the Ghanaian market — React + Vite frontend,
Supabase (Auth, Postgres, Storage, Edge Functions) backend, and Paystack payments.

This is a **real, functioning application architecture**, not a static mockup:
products come from a real database, checkout is priced and verified server-side,
and admin access is controlled by a database role rather than a hardcoded password.

---

## 1. Project Overview

Customers can browse wigs, filter/search, select variants (length, color, etc.),
add to cart, check out as a guest or a registered user, pay with Paystack
(card / Mobile Money), track their order, leave verified reviews, and manage
addresses/wishlist/profile. Admins get a separate dashboard to manage products,
categories, inventory, orders, customers, reviews, and view analytics.

## 2. Features

- Customer storefront: home, shop with filters/sort, product details with
  variants and image gallery, cart, checkout, order confirmation, order
  tracking (authenticated + guest-by-order-number), account area, wishlist,
  reviews
- Admin dashboard: products (with image upload + variants), categories,
  inventory, orders (status + courier tracking), customers, review moderation,
  analytics, settings
- Secure Paystack integration via Supabase Edge Functions — the frontend never
  decides prices or payment status
- Row Level Security on every sensitive table
- Responsive, accessible, mobile-first design

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Payments | Paystack |
| Hosting | Vercel-compatible (or any static host + Supabase) |

## 4. Folder Structure

```
the-strand-brand/
├── src/
│   ├── components/    # Navbar, Footer, ProductCard, HeroSlider, route guards…
│   ├── pages/          # Customer-facing pages + pages/account/
│   ├── admin/           # Admin dashboard (AdminLayout + admin/pages/)
│   ├── context/         # AuthContext, CartContext, ToastContext
│   ├── services/        # All Supabase queries, grouped by domain
│   ├── config/           # siteConfig.js — the one file for business info
│   ├── lib/                # supabaseClient.js
│   └── styles/             # globals.css, variables.css (design tokens)
├── supabase/
│   ├── migrations/0001_init.sql   # Full schema + RLS policies
│   └── functions/
│       ├── initialize-payment/    # Re-prices order, starts Paystack transaction
│       ├── verify-payment/        # Verifies + fulfils after redirect
│       └── paystack-webhook/      # Verifies + fulfils via webhook (reliable path)
├── .env.example
└── README.md (this file)
```

### What each major folder does
- **components/** — reusable UI pieces used across pages (nav, cards, guards).
- **pages/** — one file per customer-facing route.
- **admin/** — the entire admin dashboard, kept separate from the storefront.
- **context/** — React Context providers for auth state, the cart, and toast
  notifications, available anywhere via `useAuth()`, `useCart()`, `useToast()`.
- **services/** — every database/Edge Function call lives here, organized by
  domain (products, orders, auth, wishlist, reviews, addresses, admin). Pages
  import from here rather than calling Supabase directly.
- **config/siteConfig.js** — the single file to edit for WhatsApp number,
  socials, hero banners, currency, and delivery fee.
- **supabase/** — everything that runs on the server: the database schema and
  the three payment Edge Functions.

## 5. Local Installation

```bash
git clone <your-repo-url>
cd the-strand-brand
npm install
cp .env.example .env
# fill in .env — see Section 6 and 8 below
npm run dev
```

The app runs at `http://localhost:5173`.

## 6. Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxx
```

These three are safe to expose in the frontend build — they're public
identifiers, not secrets. Your Paystack **secret key** and your Supabase
**service role key** are configured separately as Edge Function secrets (never
in this file, never in frontend code — see Section 12).

## 7. What Supabase Does (in plain terms)

Supabase is a hosted Postgres database plus a set of ready-made backend
services built around it:
- **Auth** handles sign-up/login/password reset/email verification for you.
- **Postgres + Row Level Security (RLS)** is the actual database. RLS is a set
  of rules attached to each table that the database itself enforces — e.g.
  "a customer can only see rows in `orders` where `user_id` matches their own
  login." This means even if someone tampered with the frontend, the database
  would still refuse to hand over someone else's data.
- **Storage** holds uploaded files (product images) and gives back public URLs.
- **Edge Functions** are small server-side scripts (see Section 11) — this is
  where the Paystack secret key lives and where trustworthy work like "what is
  the real price of this order" happens, safely out of reach of the browser.

## 8. Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New Project. Choose a region
   close to Ghana (e.g. an EU region) for lower latency.
2. Once created, go to **Project Settings → API**. Copy the **Project URL**
   and the **anon / public key** into your `.env` as `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Go to **SQL Editor**, paste the entire contents of
   `supabase/migrations/0001_init.sql`, and run it. This creates every table,
   the RLS policies, and a couple of demo categories/products.
   - Alternatively, with the [Supabase CLI](https://supabase.com/docs/guides/cli)
     installed: `supabase link --project-ref your-project-ref` then
     `supabase db push`.

## 9. Storage Setup (product images)

1. In the Supabase dashboard, go to **Storage → New Bucket**.
2. Create a bucket named exactly `product-images`. Make it **Public**.
3. (Optional but recommended) Under the bucket's policies, restrict `INSERT`
   to authenticated admin users only — the app already restricts who can
   *reach* the upload screen via RLS/role checks, but a storage-level policy
   is good defense in depth. A simple starting policy:
   ```sql
   create policy "admin_upload_product_images"
   on storage.objects for insert
   with check (bucket_id = 'product-images' and public.is_admin());
   ```
4. No other setup is needed — `uploadProductImage()` in
   `src/services/admin.js` uploads here and stores the resulting public URL
   in `product_images.url`.

## 10. Authentication Setup

Supabase Auth is enabled by default. Two things worth checking:
- **Project Settings → Auth → Email** — confirm "Confirm email" is switched
  on so new customers must verify their email before logging in (this is
  what powers the "check your email" screen after registration).
- **Project Settings → Auth → URL Configuration** — set your **Site URL**
  (e.g. your Vercel deployment URL) and add it to **Redirect URLs**, so
  password-reset links and email confirmations point to the right place.

## 11. Edge Functions

There are three:

| Function | Purpose |
|---|---|
| `initialize-payment` | Re-prices the cart from the database (never trusts the browser), creates the order as `pending_payment`, and asks Paystack to start a transaction. |
| `verify-payment` | Called by the frontend right after Paystack redirects back. Verifies the transaction directly with Paystack, then marks the order paid and safely decrements stock. Idempotent — safe to call twice. |
| `paystack-webhook` | Called directly by Paystack's servers (not the browser) when a payment's status changes. This is the *reliable* path, since a customer can close their browser before the redirect fires. Verifies Paystack's HMAC signature before trusting anything. |

Deploy with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref your-project-ref

supabase functions deploy initialize-payment
supabase functions deploy verify-payment
supabase functions deploy paystack-webhook --no-verify-jwt
```

(`--no-verify-jwt` on the webhook because Paystack calls it anonymously — the
function verifies authenticity itself via the signature check instead.)

## 12. Edge Function Secrets

These are **server-side only** — never put them in `.env` or any frontend file:

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to
Edge Functions by Supabase — you don't need to set these yourself.

## 13. Paystack Setup

1. Create a account at [paystack.com](https://paystack.com) (Ghana is
   supported).
2. Go to **Settings → API Keys & Webhooks**. Copy the **Test Public Key**
   into `VITE_PAYSTACK_PUBLIC_KEY` in `.env`, and the **Test Secret Key**
   into the Edge Function secret above.
3. Enable the payment channels you want under **Settings → Preferences**
   (Card and Mobile Money are the common choices for Ghana).
4. Use Paystack's [test cards](https://paystack.com/docs/payments/test-payments/)
   to test the full flow before going live.

## 14. Webhook Setup

1. After deploying `paystack-webhook` (Section 11), find its URL — it will
   look like:
   `https://<your-project-ref>.functions.supabase.co/paystack-webhook`
2. In the Paystack dashboard, go to **Settings → API Keys & Webhooks** and
   paste that URL into **Webhook URL**.
3. Paystack will now call this function on every transaction event; the
   function only acts on `charge.success` and ignores everything else.

## 15. How Authentication Works

Customers and admins use the exact same Supabase Auth system — there is no
separate hardcoded admin login. What makes an account an "admin" is a single
column: `profiles.role = 'admin'`. This is checked two ways:
- **Frontend** (`AdminRoute.jsx`) redirects non-admins away from `/admin/*`
  for a smooth user experience.
- **Database** (RLS policies using the `is_admin()` function in the SQL
  migration) is the *real* security boundary — it enforces the same rule at
  the data layer, so even a modified frontend couldn't read/write admin-only
  data.

## 16. How to Create the First Admin

There is intentionally no "make me admin" button anywhere in the app (that
would be a security hole). To create your first admin:

1. Register a normal account through the storefront (`/register`) and verify
   the email.
2. In the Supabase dashboard, go to **SQL Editor** and run:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Log in at `/admin/login` with that account.

## 17. How Products Are Added

Admins add products at `/admin/products/new`. The form collects the name,
description, category, price/sale price, base stock, image uploads (stored in
Supabase Storage), and any variant options (e.g. Length: 18"/20"/22", each
with its own price adjustment and stock). Saving writes to the `products`,
`product_images`, and `product_variants` tables. Because the storefront reads
directly from these tables (filtered to `is_active = true` products), a saved
product appears on the shop immediately — no redeploy needed.

## 18. How Orders Are Processed

1. Customer checks out → frontend calls the `initialize-payment` Edge
   Function with product IDs, quantities, and delivery info (no prices).
2. The function looks up real prices/stock in the database, creates the order
   as `pending_payment`, and starts a Paystack transaction for the
   server-calculated total.
3. Customer completes payment on Paystack's hosted page and is redirected
   back to `/order-confirmation/:orderNumber?reference=...`.
4. The frontend calls `verify-payment`, which asks Paystack directly whether
   the transaction succeeded, marks the order `paid`, and safely decrements
   stock.
5. Independently, Paystack's webhook also fires and runs the same fulfilment
   logic — whichever arrives first "wins"; the second call is a no-op thanks
   to the idempotency check. This means an order still gets fulfilled even if
   the customer closes their browser right after paying.
6. From there, the admin updates `status` (processing → packaged →
   dispatched → …) from the Orders section, and each change is logged to
   `order_status_history`, which powers the customer-facing tracking timeline.

## 19. Development Mode

```bash
npm run dev
```

Runs Vite's dev server with hot reload at `http://localhost:5173`.

## 20. Production Deployment (Vercel)

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Import Project** and select the repo. Vercel auto-detects
   Vite (build command `npm run build`, output directory `dist`).
3. Add the three `VITE_...` environment variables from Section 6 in Vercel's
   Project Settings → Environment Variables.
4. Deploy. Update your Supabase Auth **Site URL**/**Redirect URLs**
   (Section 10) to match your new Vercel domain.

## 21. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Blank product list | Migration not run, or `.env` values wrong/missing |
| "Missing VITE_SUPABASE_URL" in console | `.env` not created from `.env.example`, or dev server not restarted after editing it |
| Checkout fails immediately | Edge Functions not deployed, or `PAYSTACK_SECRET_KEY` not set |
| Payment succeeds but order stays "pending" | Webhook URL not configured in Paystack, or `verify-payment` failed — check Supabase Edge Function logs |
| Image upload fails | `product-images` bucket doesn't exist yet, or isn't public |
| Can't reach `/admin` | Account's `profiles.role` isn't set to `'admin'` (Section 16) |

## 22. Security Notes

- No secret keys ever appear in frontend code — the Paystack secret key and
  Supabase service role key live only as Edge Function secrets.
- Every order total is calculated server-side from the database at checkout
  time; the browser cannot influence the amount charged.
- Payment status is only ever set to `paid` after direct server-side
  verification with Paystack (via signature-checked webhook or redirect
  verification) — never from a frontend claim.
- Row Level Security is enabled on every table that holds customer or
  business data; customers can only read/write their own rows.
- Admin access is enforced in the database via a role column and RLS, not
  just a frontend route guard.
- Stock is decremented through a database function that rejects the update
  if there isn't enough stock, preventing negative inventory and race
  conditions between simultaneous orders.

---

# THESTRANDBRAND OWNER CONFIGURATION

Everything below is in **`src/config/siteConfig.js`** — edit this one file
and redeploy to update it everywhere:

| Setting | Field |
|---|---|
| WhatsApp number | `whatsappNumber` (digits only, country code first, e.g. `233241234567`) |
| Instagram | `instagramUrl` |
| TikTok | `tiktokUrl` |
| Snapchat | `snapchatUrl` |
| Contact email | `contactEmail` |
| Hero images/text | `heroSlides` array |
| Announcement bar text | `announcementBar` |
| Default delivery fee | `defaultDeliveryFee` |

Supabase and Paystack credentials go in `.env` (frontend keys) and Supabase
Edge Function secrets (server-side keys) — see Sections 6 and 12 above.

The "Meet the CEO" section and legal pages (Privacy Policy, Terms) contain
clearly-marked placeholder text in `src/pages/About.jsx`,
`src/pages/PrivacyPolicy.jsx`, and `src/pages/Terms.jsx` — replace these
before launch, and have the legal pages reviewed by a qualified professional.

---

## Final Checklist

### Files Created
- Full React/Vite app under `src/` (components, pages, admin, context,
  services, config, lib, styles)
- `supabase/migrations/0001_init.sql` — schema + RLS + seed data
- `supabase/functions/initialize-payment/index.ts`
- `supabase/functions/verify-payment/index.ts`
- `supabase/functions/paystack-webhook/index.ts`
- `.env.example`, `.gitignore`, `package.json`, `vite.config.js`,
  `index.html`, this `README.md`

### Supabase Migrations Created
- `0001_init.sql` (profiles, categories, products, product_images,
  product_variants, addresses, orders, order_items, order_status_history,
  payments, wishlists, reviews, notifications, admin_activity, RLS policies,
  helper functions, seed data)

### Edge Functions Created
- `initialize-payment`, `verify-payment`, `paystack-webhook`

### Environment Variables Required
- Frontend (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_PAYSTACK_PUBLIC_KEY`
- Edge Function secrets: `PAYSTACK_SECRET_KEY` (`SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` are provided automatically)

### Manual Setup Steps Remaining
1. Create the Supabase project and run the migration (Section 8)
2. Create the `product-images` storage bucket (Section 9)
3. Deploy the three Edge Functions and set `PAYSTACK_SECRET_KEY` (Sections 11–12)
4. Create a Paystack account, grab test keys, configure the webhook (Sections 13–14)
5. Register an account and promote it to admin via SQL (Section 16)
6. Replace placeholder content in `siteConfig.js`, About, Privacy Policy, and
   Terms pages
7. Run `npm install` and `npm run build` locally to confirm a clean production
   build before deploying (this could not be verified in the environment this
   project was generated in — see the note below)

### How to Run the Project
```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev
```

### How to Test Payments Safely
Use Paystack **test mode** keys (they start with `pk_test_` / `sk_test_`) and
their [documented test cards](https://paystack.com/docs/payments/test-payments/)
— test transactions never move real money. Switch to live keys only once
you've verified the full checkout → webhook → order-status flow end to end.

### How to Create the First Admin
Register normally through `/register`, verify the email, then in the
Supabase SQL Editor run:
```sql
update profiles set role = 'admin' where email = 'you@example.com';
```
Then log in at `/admin/login`.

---

**A note on how this project was generated:** this codebase was written in an
environment without internet access, so `npm install` / `npm run build`
could not be run here to verify a clean production build, and no live
Supabase project or Paystack account was connected to test the flows
end-to-end. Please run `npm install && npm run build` as your first step
after downloading this project, and work through the checklist above before
considering it launch-ready.
