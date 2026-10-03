// Pricing rules for products whose category is sold by length.
//
// These products have no single real price: each length is a product variant
// carrying its own absolute `price` and its own stock. Products in every other
// category keep the original behaviour — a base price plus a signed
// `price_adjustment` per option.
//
// The rule lives here so the shop grid, the product page, the cart and the cart
// re-pricing cannot drift apart. The server re-prices independently in
// initialize-payment, so this is presentation, not trust.

export function isSoldByLength(product) {
  return Boolean(product?.categories?.sold_by_inches);
}

// The price of one variant, or null when it has no absolute price of its own.
export function variantPrice(variant) {
  if (!variant) return null;
  return variant.price == null ? null : Number(variant.price);
}

// Options that carry a real per-length price, cheapest first.
export function pricedVariants(product) {
  return (product?.product_variants || [])
    .filter((v) => variantPrice(v) != null)
    .sort((a, b) => variantPrice(a) - variantPrice(b));
}

// What a single unit costs for a given chosen variant, for any product.
export function unitPriceFor(product, variant) {
  const absolute = variantPrice(variant);
  if (absolute != null) return absolute;
  const base = Number(product?.sale_price ?? product?.price ?? 0);
  return base + Number(variant?.price_adjustment || 0);
}

// The cheapest length a customer can actually buy, used for "from" prices.
export function cheapestAvailableVariant(product) {
  const candidates = pricedVariants(product).filter((v) => Number(v.stock) > 0);
  return candidates[0] || pricedVariants(product)[0] || null;
}

// The lowest price across the product: its cheapest length for a sold-by-length
// product, otherwise its normal price. Used for grid display and price sorting.
export function displayPrice(product) {
  if (isSoldByLength(product)) {
    const cheapest = pricedVariants(product)[0];
    if (cheapest) return variantPrice(cheapest);
  }
  return Number(product?.sale_price ?? product?.price ?? 0);
}

// True when every length is sold out. The product row's own stock is not used
// for these products, because the real stock lives on each length.
export function isSoldOut(product) {
  if (isSoldByLength(product)) {
    const priced = pricedVariants(product);
    if (priced.length) return priced.every((v) => Number(v.stock) <= 0);
  }
  return Number(product?.stock) <= 0;
}

// Total stock across all lengths, for the grid's stock line.
export function totalStock(product) {
  if (isSoldByLength(product)) {
    const priced = pricedVariants(product);
    if (priced.length) return priced.reduce((sum, v) => sum + Number(v.stock || 0), 0);
  }
  return Number(product?.stock || 0);
}