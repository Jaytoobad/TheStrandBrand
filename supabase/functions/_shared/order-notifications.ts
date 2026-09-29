type OrderForNotification = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total: number;
};

type OrderItemForNotification = {
  product_name: string;
  variant_summary: string | null;
  quantity: number;
  subtotal: number;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

function toE164Ghana(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233')) return `+${digits}`;
  if (digits.startsWith('0')) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  return null;
}

async function sendOrderEmail(order: OrderForNotification, items: OrderItemForNotification[]) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('ORDER_NOTIFICATION_FROM_EMAIL');
  if (!apiKey || !from) {
    console.warn('Order email skipped. Configure RESEND_API_KEY and ORDER_NOTIFICATION_FROM_EMAIL.');
    return;
  }

  const itemRows = items.map((item) => {
    const variant = item.variant_summary ? ` (${escapeHtml(item.variant_summary)})` : '';
    return `<li>${escapeHtml(item.product_name)}${variant} × ${item.quantity} <strong>GH₵${Number(item.subtotal).toFixed(2)}</strong></li>`;
  }).join('');
  const orderNumber = escapeHtml(order.order_number);
  const customerName = escapeHtml(order.customer_name);
  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '');
  const trackLink = siteUrl ? `<p><a href="${escapeHtml(siteUrl)}/track-order">Track your order</a></p>` : '';
  const html = `<p>Hello ${customerName},</p><p>Your payment is confirmed and we have started preparing your custom made order.</p><p><strong>Order ${orderNumber}</strong></p><ul>${itemRows}</ul><p>Allow about 7 days for preparation, followed by 2 to 3 days for delivery. The estimated total is 9 to 10 days.</p><p>Order total: <strong>GH₵${Number(order.total).toFixed(2)}</strong></p>${trackLink}<p>Thank you for choosing TheStrandBrand.</p>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `order-confirmation-${order.id}`,
    },
    body: JSON.stringify({
      from,
      to: [order.customer_email],
      subject: `Order ${order.order_number} confirmed`,
      html,
    }),
  });
  if (!response.ok) throw new Error(`Order email provider returned ${response.status}.`);
}

async function sendOrderSms(order: OrderForNotification) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  const to = toE164Ghana(order.customer_phone);
  if (!accountSid || !authToken || !from) {
    console.warn('Order SMS skipped. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.');
    return;
  }
  if (!to) {
    console.warn(`Order SMS skipped for ${order.order_number}: customer phone is not a valid Ghana number.`);
    return;
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `TheStrandBrand: Order ${order.order_number} is confirmed. Custom wig preparation takes about 7 days, then delivery takes 2 to 3 days. Estimated total: 9 to 10 days.`,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) throw new Error(`Order SMS provider returned ${response.status}.`);
}

export async function sendOrderNotifications(order: OrderForNotification, items: OrderItemForNotification[]) {
  const results = await Promise.allSettled([
    sendOrderEmail(order, items),
    sendOrderSms(order),
  ]);
  results.forEach((result) => {
    if (result.status === 'rejected') console.error('Order notification failed:', result.reason);
  });
}
