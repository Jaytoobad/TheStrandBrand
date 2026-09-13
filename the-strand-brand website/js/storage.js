/* =======================================================================
   STORAGE.JS  —  WHERE THE SITE'S DATA LIVES
   -----------------------------------------------------------------------
   A HONEST NOTE BEFORE YOU READ THE CODE:

   This site is pure front-end (HTML/CSS/JS) with no server of its own,
   so it stores the cart, favorites, orders and stock changes in the
   browser's "localStorage". That means:

     - It works great for building, testing, and demoing the full flow
       end to end (add to cart -> pay -> order appears in admin ->
       track it -> admin updates status).
     - BUT localStorage lives on ONE device/browser only. If a customer
       orders from their phone, that order will only show up in YOUR
       admin page if admin.html is opened in that exact same browser.
       It will NOT sync between your customer's phone and your laptop.

   For a real store used by real customers, you'll eventually want a
   small backend (e.g. Node.js + a database like MongoDB/Postgres, or a
   service like Firebase/Supabase) that stores orders centrally and a
   webhook from Paystack that confirms payment server-side.

   The good news: every single place that touches data in this whole
   site goes through the functions in THIS file. When you're ready to
   add a real backend, you only need to rewrite the functions below to
   call your API with fetch() instead of reading localStorage — nothing
   in the other pages needs to change.
   ======================================================================= */

const STORAGE_KEYS = {
  cart: "cc_cart",
  favorites: "cc_favorites",
  orders: "cc_orders",
  stockAdjustments: "cc_stock_adjustments",
  adminAuth: "cc_admin_authed"
};

/* Small helper so we don't repeat JSON.parse/stringify + try/catch
   everywhere. Reads a key from localStorage, returns fallback if it's
   missing or broken. */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn("Couldn't read " + key + " from storage, using fallback.", err);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


/* -----------------------------------------------------------------------
   CART
   -------------------------------------------------------------------- */
function getCart() {
  return readJSON(STORAGE_KEYS.cart, []); // array of { productId, qty }
}

function saveCart(cart) {
  writeJSON(STORAGE_KEYS.cart, cart);
}

function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find(line => line.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId, qty });
  }
  saveCart(cart);
}

function updateCartQty(productId, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter(line => line.productId !== productId);
  } else {
    const line = cart.find(l => l.productId === productId);
    if (line) line.qty = qty;
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter(line => line.productId !== productId);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function getCartCount() {
  return getCart().reduce((sum, line) => sum + line.qty, 0);
}


/* -----------------------------------------------------------------------
   FAVORITES
   -------------------------------------------------------------------- */
function getFavorites() {
  return readJSON(STORAGE_KEYS.favorites, []); // array of productIds
}

function isFavorite(productId) {
  return getFavorites().includes(productId);
}

function toggleFavorite(productId) {
  let favs = getFavorites();
  if (favs.includes(productId)) {
    favs = favs.filter(id => id !== productId);
  } else {
    favs.push(productId);
  }
  writeJSON(STORAGE_KEYS.favorites, favs);
  return favs.includes(productId); // returns new state (true = now a favorite)
}


/* -----------------------------------------------------------------------
   STOCK
   -------------------------------------------------------------------- */
/* We never edit PRODUCTS directly (it's your hand-edited catalog file).
   Instead we keep a small ledger of "how many have been sold since the
   page was loaded" and subtract that from the number you set in
   products.js. This is what lets the site feel live without you having
   to rewrite products.js every time something sells. */
function getStockAdjustments() {
  return readJSON(STORAGE_KEYS.stockAdjustments, {}); // { productId: amountSold }
}

function recordStockSale(productId, qty) {
  const adjustments = getStockAdjustments();
  adjustments[productId] = (adjustments[productId] || 0) + qty;
  writeJSON(STORAGE_KEYS.stockAdjustments, adjustments);
}

/* The number that should actually be shown/used everywhere on the site */
function getAvailableStock(product) {
  const adjustments = getStockAdjustments();
  const sold = adjustments[product.id] || 0;
  return Math.max(0, product.stock - sold);
}

/* Lets the admin manually correct stock (e.g. after a physical count,
   or a restock) without editing products.js. This adds a "manual"
   adjustment on top of anything already sold. */
function setStockOverride(productId, newAvailableAmount, originalStock) {
  const adjustments = getStockAdjustments();
  adjustments[productId] = Math.max(0, originalStock - newAvailableAmount);
  writeJSON(STORAGE_KEYS.stockAdjustments, adjustments);
}


/* -----------------------------------------------------------------------
   ORDERS
   -------------------------------------------------------------------- */
function getOrders() {
  return readJSON(STORAGE_KEYS.orders, []);
}

function saveOrders(orders) {
  writeJSON(STORAGE_KEYS.orders, orders);
}

/* Creates a short, human-friendly tracking code like "CC-4F82A1" */
function generateTrackingId() {
  const chunk = Math.random().toString(16).slice(2, 8).toUpperCase();
  return "CC-" + chunk;
}

function createOrder({ email, phone, items, total, paystackRef }) {
  const order = {
    id: generateTrackingId(),
    email,
    phone,
    items,           // [{ productId, name, qty, price }]
    total,
    paystackRef: paystackRef || null,
    status: "Processing",   // Processing -> Packed -> Shipped -> Delivered
    createdAt: new Date().toISOString(),
    history: [
      { status: "Processing", at: new Date().toISOString() }
    ]
  };

  const orders = getOrders();
  orders.unshift(order); // newest first
  saveOrders(orders);

  // Take the sold quantities off the live stock count
  items.forEach(item => recordStockSale(item.productId, item.qty));

  return order;
}

function findOrder(trackingId, email) {
  const orders = getOrders();
  return orders.find(o =>
    o.id.toLowerCase() === trackingId.trim().toLowerCase() &&
    o.email.toLowerCase() === email.trim().toLowerCase()
  );
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;
  order.status = newStatus;
  order.history.push({ status: newStatus, at: new Date().toISOString() });
  saveOrders(orders);
  return order;
}
