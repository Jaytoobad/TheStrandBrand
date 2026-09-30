import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchCartPrices } from '../services/products';

// Guest carts persist in localStorage (a per-browser convenience, not
// sensitive data). For a logged-in customer this still works the same way;
// a Supabase-backed persistent cart can be layered in later by mirroring
// this same API onto a `cart_items` table.
const STORAGE_KEY = 'tsb_cart_v1';

const CartContext = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const { user } = useAuth();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* storage unavailable, ignore */ }
  }, [items]);

  // Re-check prices whenever a new product enters the cart (and on first load),
  // and drop products that are no longer sold. Keeps the cart and checkout
  // total equal to what Paystack will actually charge.
  const productIdsKey = useMemo(() => [...new Set(items.map((i) => i.productId))].sort().join(','), [items]);
  useEffect(() => {
    if (!productIdsKey) return undefined;
    let active = true;
    fetchCartPrices(productIdsKey.split(','))
      .then((rows) => {
        if (!active) return;
        const byId = new Map(rows.map((p) => [p.id, p]));
        setItems((prev) => {
          let changed = false;
          const next = prev.flatMap((item) => {
            const p = byId.get(item.productId);
            if (!p || !p.is_active) { changed = true; return []; }
            const variant = item.variantId ? p.product_variants?.find((v) => v.id === item.variantId) : null;
            if (item.variantId && !variant) { changed = true; return []; }
            const unitPrice = Number(p.sale_price ?? p.price) + (variant ? Number(variant.price_adjustment || 0) : 0);
            if (unitPrice === item.unitPrice) return [item];
            changed = true;
            return [{ ...item, unitPrice }];
          });
          return changed ? next : prev;
        });
      })
      .catch(() => { /* offline or blocked: keep the saved prices, the server re-prices anyway */ });
    return () => { active = false; };
  }, [productIdsKey]);

  function addItem(product, variant, quantity = 1) {
    setItems((prev) => {
      const key = `${product.id}-${variant?.id ?? 'base'}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          image: product.product_images?.find((im) => im.is_primary)?.url || product.product_images?.[0]?.url,
          unitPrice: (product.sale_price ?? product.price) + (variant?.price_adjustment ? Number(variant.price_adjustment) : 0),
          variantId: variant?.id ?? null,
          variantLabel: variant ? `${variant.option_name}: ${variant.option_value}` : null,
          quantity,
        },
      ];
    });
  }

  function updateQuantity(key, quantity) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i)));
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, subtotal, itemCount, user }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
