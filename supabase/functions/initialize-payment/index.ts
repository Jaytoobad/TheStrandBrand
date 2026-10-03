// ============================================================================
// EDGE FUNCTION: initialize-payment
// ============================================================================
// Called by the React checkout page. This is the ONLY place an order's total
// is decided — the browser sends product IDs + quantities + variant choices,
// never prices. We look up real prices/stock from the database, calculate
// the trusted total ourselves, create a 'pending_payment' order, then ask
// Paystack to start a transaction for that trusted amount.
//
// Deploy with:  supabase functions deploy initialize-payment
// Requires secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY
// (SUPABASE_URL/ANON_KEY are provided automatically; set the other two with
//  `supabase secrets set`.)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { captureServerEvent } from '../_shared/posthog.ts';
import { allowRequest, clientIdentifier } from '../_shared/rate-limit.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// The service-role client bypasses RLS — that's intentional and safe HERE
// because this code runs on the server, never in the browser, and we
// carefully control exactly what it's allowed to write below.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-posthog-distinct-id, x-posthog-session-id',
};

// Where Paystack sends the customer after paying. Without a callback_url,
// Paystack's hosted page just says "payment successful" and leaves them there.
//
// The callback carries ?reference=<paystack reference>, so it is pinned to our
// own configured site URL. This previously also accepted any *.vercel.app
// origin, which meant anyone could deploy a page there, send that Origin, and
// have Paystack redirect the payer to a site they control along with the
// order number and payment reference. Preview deployments do not need a
// callback of their own — falling back to the production URL is the correct
// behaviour for them. Loopback stays allowed for local development over http.
function resolveCallbackBase(req: Request): string | null {
  const configured = Deno.env.get('PUBLIC_SITE_URL')?.replace(/\/$/, '');
  if (configured && !configured.includes('example')) {
    try {
      // The configured site is the single trust anchor. Validate it once so a
      // misconfigured secret cannot silently become a phishing target.
      const { protocol, hostname } = new URL(configured);
      if (protocol === 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(hostname)) {
        return configured;
      }
    } catch {
      // Fall through to the Origin-based development paths below.
    }
  }

  const origin = req.headers.get('origin')?.replace(/\/$/, '');
  if (origin) {
    try {
      const { protocol, hostname } = new URL(origin);
      const isLocal =
        protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
      if (isLocal) return origin;
    } catch {
      // Malformed Origin header — no callback URL at all.
    }
  }
  return configured && !configured.includes('example') ? configured : null;
}

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 900 + 100); // 3-digit suffix; good enough given the date prefix + unique constraint
  return `TSB-${ymd}-${rand}`;
}

// Which account (if any) this order belongs to. The browser may send a
// Supabase access token; we verify it here and use the identity from the
// verified token. Nothing in the request body can decide this, so an order
// can never be attached to somebody else's account by guessing an id.
async function authenticatedUserId(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !data?.user) return null;
  return data.user.id;
}

// Paystack hosts checkout on its own domains. Anything else is treated as a
// tampered response and the customer is not redirected to it.
function safePaystackUrl(candidate: unknown): string | null {
  if (typeof candidate !== 'string' || !candidate) return null;
  try {
    const { protocol, hostname } = new URL(candidate);
    const isPaystack = protocol === 'https:' && /(^|\.)paystack\.com$/.test(hostname);
    return isPaystack ? candidate : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { items, customer, delivery, policyAccepted } = body;
    const posthogDistinctId = req.headers.get('x-posthog-distinct-id');
    const posthogSessionId = req.headers.get('x-posthog-session-id');
    // items: [{ productId, variantId, quantity }]
    // customer: { name, email, phone }
    // delivery: { region, city, area, digitalAddress, directions, fee }

    if (!items?.length || !customer?.email || !delivery?.region || policyAccepted !== true) {
      return json({ error: 'Missing required checkout information.' }, 400);
    }

    // The browser validates all of this, but this endpoint is public and
    // unauthenticated, so it is checked again here rather than trusted. Without
    // it a scripted caller could file orders with no name and a junk phone
    // number, which the business could not contact about delivery.
    const name = String(customer.name ?? '').trim();
    const email = String(customer.email).trim();
    const phone = String(customer.phone ?? '').replace(/\s+/g, '');
    const city = String(delivery.city ?? '').trim();

    if (name.length < 2) {
      return json({ error: 'Please enter your full name.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }
    // Ghanaian mobile numbers: 10 digits starting with 0, spaces allowed. The
    // same rule the checkout form applies, so the two cannot disagree.
    if (!/^0\d{9}$/.test(phone)) {
      return json({ error: 'Enter a valid 10-digit number starting with 0 (e.g. 024 123 4567).' }, 400);
    }
    if (!city) {
      return json({ error: 'City / Town is required.' }, 400);
    }

    // --- Abuse protection (see ../_shared/rate-limit.ts). ---
    // Per-IP limits are generous because many Ghanaian mobile customers share
    // one public IP; the per-email limit is the tighter of the two because an
    // email address is what actually ties a flood of orders to one person.
    // Both are hourly so a customer double-submitting or refreshing checkout
    // is never blocked.
    const emailKey = email.toLowerCase().slice(0, 200);
    const ipKey = clientIdentifier(req);
    const rateLimited = !(await allowRequest([
      { scope: 'checkout_ip', max: 40, windowSeconds: 3600, identifier: ipKey },
      { scope: 'checkout_email', max: 10, windowSeconds: 3600, identifier: emailKey },
    ]));
    if (rateLimited) {
      return json({
        error: 'Too many checkout attempts from this device. Please wait a few minutes and try again, or message us on WhatsApp.',
        code: 'rate_limited',
      }, 429);
    }

    // --- Delivery fee comes from the database, never from the browser. ---
    const region = String(delivery.region).trim();
    const { data: rate, error: rateErr } = await supabase
      .from('delivery_rates')
      .select('fee')
      .eq('region', region)
      .maybeSingle();
    if (rateErr) throw rateErr;
    if (!rate) {
      return json({ error: 'We do not deliver to that region yet. Please choose another region or message us on WhatsApp.' }, 400);
    }
    const deliveryFee = Number(rate.fee);
    // If the admin changed the fee while the customer was on the checkout
    // page, stop and let them see the new amount before paying.
    if (delivery.fee != null && Number(delivery.fee) !== deliveryFee) {
      return json({
        error: `Delivery to ${region} is now GH₵${deliveryFee.toFixed(2)}. Please check the new total and try again.`,
        code: 'delivery_fee_changed',
        deliveryFee,
      }, 409);
    }

// --- Re-price everything from the database. Never trust client prices. ---
// Products and variants are fetched in one query each rather than per cart
// item. The old loop awaited a row per item (and another per option), so a
// four-item cart cost eight sequential round trips before the customer could
// reach Paystack — seconds of dead time on a Ghanaian mobile connection.
let subtotal = 0;
const lineItems = [];

const productIds = [...new Set(items.map((i) => String(i.productId ?? '')).filter(Boolean))];
const variantIds = [...new Set(items.map((i) => String(i.variantId ?? '')).filter(Boolean))];

const { data: productRows, error: productErr } = await supabase
  .from('products')
  .select('id, name, price, sale_price, stock, is_active, allow_preorder')
  .in('id', productIds);

if (productErr) {
  console.error('Product lookup failed:', productErr);
  return json({ error: 'Could not start payment. Please try again.' }, 502);
}

const productsById = new Map((productRows || []).map((p) => [p.id, p]));

let variantsById = new Map();
if (variantIds.length) {
  const { data: variantRows, error: variantErr } = await supabase
    .from('product_variants')
    .select('id, product_id, option_name, option_value, price_adjustment, stock')
    .in('id', variantIds);

  if (variantErr) {
    console.error('Variant lookup failed:', variantErr);
    return json({ error: 'Could not start payment. Please try again.' }, 502);
  }
  variantsById = new Map((variantRows || []).map((v) => [v.id, v]));
}

for (const item of items) {
  const product = productsById.get(item.productId);
  if (!product || !product.is_active) {
    return json({ error: `Product unavailable: ${item.productId}` }, 400);
  }

  let unitPrice = product.sale_price ?? product.price;
  let availableStock = product.stock;
  let variantSummary = null;

  if (item.variantId) {
    const variant = variantsById.get(item.variantId);
    // The option must belong to this product, not just exist.
    if (!variant || variant.product_id !== product.id) {
      return json({ error: 'Selected option unavailable.' }, 400);
    }
    unitPrice += Number(variant.price_adjustment);
    availableStock = variant.stock;
    variantSummary = `${variant.option_name}: ${variant.option_value}`;
  }

  if (!Number.isInteger(item.quantity) || item.quantity < 1 || (!product.allow_preorder && item.quantity > availableStock)) {
    return json({ error: `Not enough stock for ${product.name}.` }, 400);
  }

  const lineSubtotal = unitPrice * item.quantity;
  subtotal += lineSubtotal;

      lineItems.push({
        product_id: product.id,
        product_name: product.name,
        variant_id: item.variantId ?? null,
        variant_summary: variantSummary,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal: lineSubtotal,
      });
    }

    const discount = 0; // hook for future promo codes
    const total = subtotal + deliveryFee - discount;

    // --- Create the order in 'pending_payment' state. ---
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber(),
        user_id: await authenticatedUserId(req),
        customer_email: email,
        customer_phone: phone,
        customer_name: name,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        status: 'pending_payment',
        payment_status: 'pending',
        delivery_region: region,
        delivery_city: city,
        delivery_area: delivery.area ?? null,
        delivery_digital_address: delivery.digitalAddress ?? null,
        delivery_directions: delivery.directions ?? null,
        refund_policy_accepted_at: new Date().toISOString(),
        refund_policy_version: '2026-09-28',
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    await supabase.from('order_items').insert(
      lineItems.map((li) => ({
        order_id: order.id,
        product_id: li.product_id,
        variant_id: li.variant_id,
        product_name: li.product_name,
        variant_summary: li.variant_summary,
        unit_price: li.unit_price,
        quantity: li.quantity,
        subtotal: li.subtotal,
      }))
    );

    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'pending_payment',
      note: 'Order created, awaiting payment.',
    });

    // --- Ask Paystack to start a transaction for the TRUSTED total. ---
    const callbackBase = resolveCallbackBase(req);
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(total * 100), // Paystack expects amount in pesewas (kobo-equivalent for GHS)
        currency: 'GHS',
        // Paystack appends ?trxref=...&reference=... to this URL.
        ...(callbackBase ? { callback_url: `${callbackBase}/order-confirmation/${order.order_number}` } : {}),
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          posthog_distinct_id: posthogDistinctId,
          posthog_session_id: posthogSessionId,
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return json({ error: 'Could not start payment. Please try again.' }, 502);
    }

    // Only ever hand the browser a Paystack checkout URL. The browser is about
    // to be redirected here, so a tampered or unexpected host would be an open
    // redirect off the store — validate it before it leaves this function.
    const authorizationUrl = safePaystackUrl(paystackData.data?.authorization_url);
    if (!authorizationUrl) {
      console.error('Unexpected Paystack authorization URL:', paystackData.data?.authorization_url);
      return json({ error: 'Could not start payment. Please try again.' }, 502);
    }

    await supabase.from('payments').insert({
      order_id: order.id,
      reference: paystackData.data.reference,
      amount: total,
      currency: 'GHS',
      status: 'initialized',
    });

    await supabase
      .from('orders')
      .update({ payment_reference: paystackData.data.reference })
      .eq('id', order.id);

    if (posthogDistinctId) {
      await captureServerEvent(posthogDistinctId, 'payment_initialized', {
        order_id: order.id,
        order_total: total,
        item_count: lineItems.reduce((sum, item) => sum + item.quantity, 0),
        currency: 'GHS',
        ...(posthogSessionId ? { $session_id: posthogSessionId } : {}),
      });
    }

    return json({
      authorizationUrl,
      reference: paystackData.data.reference,
      orderNumber: order.order_number,
    });
  } catch (err) {
    console.error(err);
    return json({ error: 'Something went wrong starting your payment. Please try again.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
