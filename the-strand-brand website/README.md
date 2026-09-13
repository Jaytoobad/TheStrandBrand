# TheStrandBrand — Wig & Hair Store

A plain HTML/CSS/JavaScript website (no build tools, no frameworks) so
you can open any file and change it directly. Built for a wig & hair
bundle business with a home page, about page, cart, favorites, order
tracking, an admin dashboard, and Paystack payments.

## Opening the site

Because a couple of features (fonts, some browsers' localStorage rules)
work better when the site is served rather than opened as a bare file,
run a tiny local server from inside this folder instead of double
clicking index.html:

```
# if you have Python installed:
python3 -m http.server 8000
# then visit http://localhost:8000 in your browser
```

Or, if you use VS Code, install the "Live Server" extension and click
"Go Live" — either works fine.

When you're ready to put this online, any static hosting works
(Netlify, Vercel, GitHub Pages, or your own hosting account) — just
upload the whole folder as-is.

## Folder guide

```
index.html         Home page (hero, search, product grid)
about.html          About page (story + core values)
cart.html           Cart + checkout (Paystack)
favorites.html      Saved-for-later items
track-order.html    Customer order tracking
admin.html          Password-protected owner dashboard

css/style.css        All styling — colors/fonts are set as variables
                      near the top of the file, so you can re-theme the
                      whole site by editing a handful of lines.

js/products.js        <-- YOU EDIT THIS to add/remove/update products
                          (full instructions are written inside the file)
js/config.js           <-- YOU EDIT THIS for your Paystack key, store
                          name, and the admin password
js/storage.js           Where cart/favorites/orders/stock are stored
                          (see the big note inside about its current
                          localStorage-based limits)
js/ui-common.js         Shared nav bar / toast pop-ups / money formatting
js/main.js              Home page product grid, search, filters
js/cart.js              Cart page rendering + quantity controls
js/favorites.js         Favorites page rendering
js/checkout.js          Paystack payment flow
js/track-order.js       Order tracking page
js/admin.js             Admin dashboard (login, stats, orders, stock)

images/hero/            Put your homepage background photo here
images/products/        Put your product photos here
```

## The three things you'll actually touch day to day

1. **Adding products** — open `js/products.js`. Every product is a
   block like:
   ```js
   {
     id: 9,
     name: "Loose Curl 22\" Bundle",
     type: "curly",
     price: 40000,
     stock: 10,
     image: "images/products/loose-curl-22in.jpg",
     description: "A soft, romantic curl pattern...",
     featured: false
   }
   ```
   Copy a block, change the values, and drop the matching photo into
   `images/products/`. Full field-by-field notes are written right
   inside `products.js`.

2. **Getting paid** — open `js/config.js` and paste your Paystack
   **public** key (starts with `pk_test_` or `pk_live_`) into
   `paystackPublicKey`. That's the only setup step for payments.

3. **Running the store** — open `admin.html`, sign in with the
   password you set in `js/config.js` (`adminPassword`), and you'll
   see:
   - **Overview** stats: total orders, revenue, low-stock and
     sold-out counts.
   - **Orders tab**: every order placed, with a dropdown to move it
     through Processing → Packed → Shipped → Delivered. Customers see
     this same status when they track their order.
   - **Inventory tab**: current stock for every product, with a box
     to manually correct the number (after a restock, etc).

## How stock + "sold out" / "limited stock" works

You set a starting `stock` number per product in `products.js`. From
there the site automatically:
- Shows **"In stock"** when more than 5 are left
- Shows **"Limited stock — N left"** when 5 or fewer remain
- Shows **"Sold out"** and disables "Add to cart" at 0

Every completed order quietly subtracts from that number, and you can
always see or correct the live number in the admin Inventory tab.

## Paystack — one thing worth doing before going fully live

Right now, an order is confirmed as soon as Paystack's popup reports
success back to the browser. That's completely fine for testing, but
for real-money safety you should eventually add Paystack's **server-side
transaction verification** (and/or a webhook) using your **secret** key
on a small backend — never in browser code. Paystack's guide:
https://paystack.com/docs/payments/verify-payments/
There's a matching note inside `js/checkout.js` right where this
matters.

## The honest limitation of a no-backend site

This site keeps the cart, favorites, orders, and stock counts in the
browser's `localStorage` — there's no shared database. That means it's
fully working end-to-end (a customer can genuinely pay and get a
tracking ID, and you can genuinely see it in `/admin.html`) **as long as
you check `/admin.html` in the same browser the order was placed in**,
which is fine for testing or a very small operation on one device, but
won't scale to multiple staff or devices seeing the same order list.

When you're ready, the fix is to add a small backend (Node.js +
a database, or a service like Firebase/Supabase) and swap out the
functions inside `js/storage.js` for calls to that backend — every
other file in the site calls those same function names, so nothing
else has to change.

## Ideas for what to add next

- Email/SMS notifications when an order's status changes
- Customer accounts + order history
- Product reviews
- Discount codes at checkout
- Multiple photos per product (a small extension to `products.js`)
