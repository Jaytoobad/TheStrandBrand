/* =======================================================================
   UI-COMMON.JS  —  SHARED ON EVERY PAGE
   -----------------------------------------------------------------------
   Small bits of behaviour that every page needs: the cart/favorites
   counters in the nav bar, the little toast pop-up messages, and the
   mobile hamburger menu. Loaded on every .html file.
   ======================================================================= */

/* Run once the page's HTML is ready */
document.addEventListener("DOMContentLoaded", function () {
  refreshNavBadges();
  setupMobileNav();
  setupYearStamp();
});

/* Updates the little number bubbles next to the Cart and Favorites
   nav links. Call this again any time the cart/favorites change so the
   number stays accurate without a page reload. */
function refreshNavBadges() {
  const cartBadge = document.querySelector("[data-cart-badge]");
  const favBadge = document.querySelector("[data-fav-badge]");
  if (cartBadge) {
    const count = getCartCount();
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? "flex" : "none";
  }
  if (favBadge) {
    const count = getFavorites().length;
    favBadge.textContent = count;
    favBadge.style.display = count > 0 ? "flex" : "none";
  }
}

/* Opens/closes the nav menu on small screens */
function setupMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const links = document.querySelector("[data-nav-links]");
  if (!toggle || !links) return;
  toggle.addEventListener("click", function () {
    links.classList.toggle("open");
  });
}

/* Puts the current year in the footer automatically so you never have
   to remember to update a copyright date. */
function setupYearStamp() {
  const el = document.querySelector("[data-year]");
  if (el) el.textContent = new Date().getFullYear();
}


/* -----------------------------------------------------------------------
   TOASTS — little "Added to cart" style pop-ups
   -------------------------------------------------------------------- */
function showToast(message) {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  stack.appendChild(toast);

  setTimeout(function () {
    toast.remove();
  }, 2600);
}


/* -----------------------------------------------------------------------
   MONEY FORMATTING — used everywhere a price is shown
   -------------------------------------------------------------------- */
function formatMoney(amount) {
  const symbol = (typeof STORE_CONFIG !== "undefined") ? STORE_CONFIG.currencySymbol : "₦";
  return symbol + Number(amount).toLocaleString("en-NG");
}


/* -----------------------------------------------------------------------
   STOCK STATUS — used on product cards, quick view, and admin
   -------------------------------------------------------------------- */
/* Change the numbers here if you want "limited stock" to kick in at a
   different quantity — right now anything from 1-5 counts as limited. */
function getStockInfo(product) {
  const available = getAvailableStock(product);
  if (available <= 0) {
    return { available, label: "Sold out", cssClass: "stock-out", canBuy: false };
  }
  if (available <= 5) {
    return { available, label: "Limited stock — " + available + " left", cssClass: "stock-low", canBuy: true };
  }
  return { available, label: "In stock", cssClass: "stock-in", canBuy: true };
}
