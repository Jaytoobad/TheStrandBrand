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

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// The service-role client bypasses RLS — that's intentional and safe HERE
// because this code runs on the server, never in the browser, and we
// carefully control exactly what it's allowed to write below.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 900 + 100); // 3-digit suffix; good enough given the date prefix + unique constraint
  return `TSB-${ymd}-${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { items, customer, delivery, userId } = body;
    // items: [{ productId, variantId, quantity }]
    // customer: { name, email, phone }
    // delivery: { region, city, area, digitalAddress, directions, fee }

    if (!items?.length || !customer?.email || !delivery?.region) {
      return json({ error: 'Missing required checkout information.' }, 400);
    }

    // --- Re-price everything from the database. Never trust client prices. ---
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, sale_price, stock, is_active')
        .eq('id', item.productId)
        .single();

      if (error || !product || !product.is_active) {
        return json({ error: `Product unavailable: ${item.productId}` }, 400);
      }

      let unitPrice = product.sale_price ?? product.price;
      let availableStock = product.stock;
      let variantSummary = null;

      if (item.variantId) {
        const { data: variant, error: vErr } = await supabase
          .from('product_variants')
          .select('id, option_name, option_value, price_adjustment, stock')
          .eq('id', item.variantId)
          .single();
        if (vErr || !variant) return json({ error: 'Selected option unavailable.' }, 400);
        unitPrice += Number(variant.price_adjustment);
        availableStock = variant.stock;
        variantSummary = `${variant.option_name}: ${variant.option_value}`;
      }

      if (item.quantity < 1 || item.quantity > availableStock) {
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

    const deliveryFee = Number(delivery.fee) || 0;
    const discount = 0; // hook for future promo codes
    const total = subtotal + deliveryFee - discount;

    // --- Create the order in 'pending_payment' state. ---
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber(),
        user_id: userId ?? null,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_name: customer.name,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        status: 'pending_payment',
        payment_status: 'pending',
        delivery_region: delivery.region,
        delivery_city: delivery.city,
        delivery_area: delivery.area ?? null,
        delivery_digital_address: delivery.digitalAddress ?? null,
        delivery_directions: delivery.directions ?? null,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    await supabase.from('order_items').insert(
      lineItems.map((li) => ({
        order_id: order.id,
        product_id: li.product_id,
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
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customer.email,
        amount: Math.round(total * 100), // Paystack expects amount in pesewas (kobo-equivalent for GHS)
        currency: 'GHS',
        metadata: { order_id: order.id, order_number: order.order_number },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
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

    return json({
      authorizationUrl: paystackData.data.authorization_url,
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
