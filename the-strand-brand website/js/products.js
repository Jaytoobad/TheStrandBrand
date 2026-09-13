/* =======================================================================
   PRODUCTS.JS  —  THIS IS YOUR PRODUCT CATALOG
   -----------------------------------------------------------------------
   Hi! This is the ONE file you need to touch to add, remove, or edit
   products. You don't need to know JavaScript to use it — just follow
   the pattern of the examples below.

   HOW TO ADD A NEW PRODUCT
   -------------------------------------------------------------------
   1. Copy one of the { ... } blocks below (an existing product).
   2. Paste it right before the closing "];" at the bottom of the list.
   3. Change the values. Here's what each field means:

        id          A unique number. No two products can share an id.
                     Easiest rule: always make it one higher than the
                     last product currently in the list.

        name        The product name customers will see.

        type        The category, all lowercase, no spaces.
                     Used by the search bar and the filter chips.
                     Suggested values already in use:
                     "straight", "curly", "wavy", "bob", "closure",
                     "frontal", "bundle", "extension"
                     You can invent new ones — just also add a matching
                     chip in index.html if you want it to show as a
                     filter button (see the comment in index.html).

        price       Price in Naira, as a plain number (no commas, no ₦).
                     Example: 45000  ->  displays as ₦45,000

        oldPrice    Optional. Set this if the item is on sale, so the
                     original price shows with a strike-through.
                     Leave it out (delete the line) if there's no sale.

        stock       How many are currently available.
                     0            -> shows as "Sold out" and can't be bought
                     1 to 5       -> shows as "Limited stock"
                     6 or more    -> shows as "In stock"
                     (change these thresholds in main.js -> getStockInfo)

        image       The path to the product photo. See the image
                     instructions below.

        description A short paragraph shown on the quick-view popup.

        featured    true / false. Featured products can be highlighted
                     on the home page (see the "Featured" filter chip).

   HOW TO ADD PRODUCT PHOTOS
   -------------------------------------------------------------------
   1. Put your image file inside:  images/products/
      e.g. images/products/bone-straight-24in.jpg

   2. Keep file names simple: lowercase, hyphens instead of spaces,
      no special characters. This avoids broken image links.

   3. Point the "image" field at that same path, e.g.:
      image: "images/products/bone-straight-24in.jpg"

   4. Recommended photo size: square photos (1:1), at least 800x800px,
      work best with the product cards on this site.

   5. If you use multiple photos per product later, you can extend this
      file to use an "images: [...]" array instead of a single "image" —
      ask a developer (or Claude!) to help wire that up if you'd like it.

   HOW TO REMOVE A PRODUCT
   -------------------------------------------------------------------
   Just delete its whole { ... } block (and the comma right after it,
   or the comma right before it if it was the last one in the list).

   HOW TO MARK SOMETHING SOLD OUT
   -------------------------------------------------------------------
   Set stock: 0  — that's it. The site handles the rest automatically.
   ======================================================================= */

const PRODUCTS = [
  {
    id: 1,
    name: "Bone Straight 24\" Bundle",
    type: "straight",
    price: 45000,
    stock: 12,
    image: "images/products/placeholder.jpg",
    description: "Silky bone-straight human hair bundle, 24 inches. Soft, tangle-free, and holds a curl if you want to switch up the look.",
    featured: true
  },
  {
    id: 2,
    name: "Deep Wave 20\" Bundle",
    type: "wavy",
    price: 38000,
    stock: 4,
    image: "images/products/placeholder.jpg",
    description: "Bouncy deep wave texture that keeps its pattern wash after wash. A customer favorite for everyday wear.",
    featured: true
  },
  {
    id: 3,
    name: "Kinky Curly Closure 4x4",
    type: "closure",
    price: 27000,
    oldPrice: 32000,
    stock: 0,
    image: "images/products/placeholder.jpg",
    description: "4x4 closure with a natural kinky curl pattern, pre-plucked hairline for a seamless install.",
    featured: false
  },
  {
    id: 4,
    name: "HD Lace Frontal 13x4",
    type: "frontal",
    price: 65000,
    stock: 7,
    image: "images/products/placeholder.jpg",
    description: "Ultra-thin HD lace that melts into most skin tones, pre-plucked and bleached knots for a natural hairline.",
    featured: true
  },
  {
    id: 5,
    name: "Short Bob Wig 12\"",
    type: "bob",
    price: 30000,
    stock: 15,
    image: "images/products/placeholder.jpg",
    description: "A ready-to-wear bob wig, glueless cap, great for a quick everyday switch-up.",
    featured: false
  },
  {
    id: 6,
    name: "Body Wave 26\" Bundle",
    type: "wavy",
    price: 42000,
    stock: 3,
    image: "images/products/placeholder.jpg",
    description: "Loose, natural body wave with a soft drape. Blends easily with relaxed hair.",
    featured: false
  },
  {
    id: 7,
    name: "Clip-In Extensions Set",
    type: "extension",
    price: 22000,
    stock: 20,
    image: "images/products/placeholder.jpg",
    description: "8-piece clip-in set for instant length and volume. No commitment, no glue.",
    featured: false
  },
  {
    id: 8,
    name: "Curly Bundle Deal (x3)",
    type: "bundle",
    price: 95000,
    oldPrice: 110000,
    stock: 6,
    image: "images/products/placeholder.jpg",
    description: "Three bundles of matching curly-textured hair at a bundled price — everything you need for a full sew-in.",
    featured: true
  }
];

/* Don't touch anything below this line unless you know what it does —
   this just makes the list available to the other .js files on the site. */
if (typeof module !== "undefined") {
  module.exports = PRODUCTS;
}
