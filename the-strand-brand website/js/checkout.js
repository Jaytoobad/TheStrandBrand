/* =======================================================================
   CHECKOUT.JS  —  PAYSTACK PAYMENT
   -----------------------------------------------------------------------
   This opens the Paystack popup using the key you set in js/config.js.
   When Paystack confirms the payment, we save an order (see storage.js)
   and send the customer to a confirmation screen with their tracking ID.

   HOW PAYMENT ACTUALLY WORKS HERE
   -------------------------------------------------------------------
   Paystack's "Inline" popup (loaded via the <script> tag in cart.html)
   handles collecting card details and talking to Paystack directly —
   your site's code never touches raw card numbers, which is exactly
   how it should be.

   ONE IMPORTANT THING TO ADD LATER: right now, the order is marked as
   paid as soon as Paystack's popup calls back into this page saying
   "success". That's fine for testing, but a determined person could
   fake that callback. Before going fully live, add Paystack's
   "Verify Transaction" step on a small server using your SECRET key,
   and/or set up a Paystack webhook — that's the only fully secure way
   to confirm a payment really went through. Paystack's docs walk
   through this: https://paystack.com/docs/payments/verify-payments/
   ======================================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const payBtn = document.querySelector("[data-pay-button]");
  if (!payBtn) return; // not on the cart page

  payBtn.addEventListener("click", function () {
    startCheckout();
  });
});

function startCheckout() {
  const emailInput = document.querySelector("#checkout-email");
  const phoneInput = document.querySelector("#checkout-phone");
  const email = emailInput ? emailInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";

  if (!email || !email.includes("@")) {
    showToast("Please enter a valid email first");
    if (emailInput) emailInput.focus();
    return;
  }

  const lines = getCartLinesWithProducts();
  if (lines.length === 0) {
    showToast("Your cart is empty");
    return;
  }

  // Double check nothing in the cart went out of stock while browsing
  const outOfStockLine = lines.find(l => l.qty > getAvailableStock(l.product));
  if (outOfStockLine) {
    showToast(outOfStockLine.product.name + " no longer has enough stock");
    renderCart();
    return;
  }

  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  if (typeof PaystackPop === "undefined") {
    showToast("Payment system didn't load — check your internet connection");
    return;
  }

  if (STORE_CONFIG.paystackPublicKey.includes("REPLACE_WITH_YOUR_PUBLIC_KEY")) {
    showToast("Add your Paystack public key in js/config.js first");
    return;
  }

  const handler = PaystackPop.setup({
    key: STORE_CONFIG.paystackPublicKey,
    email: email,
    amount: total * 100, // Paystack expects the amount in kobo (naira x 100)
    currency: "NGN",
    ref: "CC_" + Date.now(), // a unique reference per payment attempt
    metadata: {
      custom_fields: [
        { display_name: "Phone", variable_name: "phone", value: phone || "not provided" }
      ]
    },
    callback: function (response) {
      // Paystack has confirmed the card payment on their end.
      const order = createOrder({
        email: email,
        phone: phone,
        items: lines.map(l => ({
          productId: l.product.id,
          name: l.product.name,
          qty: l.qty,
          price: l.product.price
        })),
        total: total,
        paystackRef: response.reference
      });

      clearCart();
      showOrderConfirmation(order);
    },
    onClose: function () {
      showToast("Payment window closed — nothing was charged");
    }
  });

  handler.openIframe();
}

/* Swaps the cart page content for a simple confirmation panel once
   payment is done, so the customer immediately sees their tracking ID. */
function showOrderConfirmation(order) {
  const container = document.querySelector("[data-cart-page-body]");
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state" style="max-width:520px;margin:0 auto">
      <h3>Thank you — your order is confirmed 🎉</h3>
      <p>We've sent a confirmation to <strong>${order.email}</strong>.</p>
      <p>Your tracking ID is:</p>
      <p style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent)">${order.id}</p>
      <p>Keep this ID safe — you'll need it, along with your email, to track your order.</p>
      <a class="btn btn-primary" href="track-order.html">Track this order</a>
      <a class="btn btn-ghost" href="index.html" style="margin-left:0.5rem">Continue shopping</a>
    </div>
  `;
  refreshNavBadges();
}
