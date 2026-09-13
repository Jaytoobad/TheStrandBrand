/* =======================================================================
   CART.JS  —  CART PAGE LOGIC
   -----------------------------------------------------------------------
   Draws the cart table on cart.html, handles quantity +/-, removing
   lines, and the order summary total. The actual payment step lives in
   checkout.js (kept separate so this file stays easy to read).
   ======================================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const list = document.querySelector("[data-cart-list]");
  if (!list) return; // not on the cart page

  renderCart();
});

function getCartLinesWithProducts() {
  return getCart()
    .map(line => {
      const product = PRODUCTS.find(p => p.id === line.productId);
      if (!product) return null; // product was removed from products.js
      return { ...line, product };
    })
    .filter(Boolean);
}

function renderCart() {
  const list = document.querySelector("[data-cart-list]");
  const emptyState = document.querySelector("[data-cart-empty]");
  const summary = document.querySelector("[data-cart-summary]");
  const lines = getCartLinesWithProducts();

  if (lines.length === 0) {
    list.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    if (summary) summary.style.display = "none";
    return;
  }
  if (emptyState) emptyState.style.display = "none";
  if (summary) summary.style.display = "block";

  list.innerHTML = lines.map(renderCartLine).join("");

  list.querySelectorAll("[data-qty-minus]").forEach(btn => {
    btn.addEventListener("click", function () {
      changeQty(Number(btn.dataset.qtyMinus), -1);
    });
  });
  list.querySelectorAll("[data-qty-plus]").forEach(btn => {
    btn.addEventListener("click", function () {
      changeQty(Number(btn.dataset.qtyPlus), 1);
    });
  });
  list.querySelectorAll("[data-remove-line]").forEach(btn => {
    btn.addEventListener("click", function () {
      removeFromCart(Number(btn.dataset.removeLine));
      refreshNavBadges();
      renderCart();
      showToast("Removed from cart");
    });
  });

  renderSummary(lines);
}

function changeQty(productId, delta) {
  const lines = getCart();
  const line = lines.find(l => l.productId === productId);
  if (!line) return;
  const product = PRODUCTS.find(p => p.id === productId);
  const maxAvailable = product ? getAvailableStock(product) : 99;
  const newQty = Math.min(Math.max(1, line.qty + delta), maxAvailable);
  updateCartQty(productId, newQty);
  refreshNavBadges();
  renderCart();
}

function renderCartLine(line) {
  const product = line.product;
  return `
    <div class="cart-line">
      <img src="${product.image}" alt="${product.name}">
      <div>
        <div class="cart-line-name">${product.name}</div>
        <div class="cart-line-meta">${formatMoney(product.price)} each</div>
        <div class="qty-control">
          <button data-qty-minus="${product.id}" aria-label="Decrease quantity">&minus;</button>
          <span>${line.qty}</span>
          <button data-qty-plus="${product.id}" aria-label="Increase quantity">&plus;</button>
        </div>
      </div>
      <div style="text-align:right">
        <div class="cart-line-name">${formatMoney(product.price * line.qty)}</div>
        <button class="remove-link" data-remove-line="${product.id}">Remove</button>
      </div>
    </div>
  `;
}

function renderSummary(lines) {
  const subtotalEl = document.querySelector("[data-cart-subtotal]");
  const totalEl = document.querySelector("[data-cart-total]");
  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  if (subtotalEl) subtotalEl.textContent = formatMoney(total);
  if (totalEl) totalEl.textContent = formatMoney(total);
}
