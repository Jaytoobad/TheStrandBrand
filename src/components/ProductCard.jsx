import { Link } from 'react-router-dom';
import { formatMoney } from '../config/siteConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addToWishlist, removeFromWishlist } from '../services/wishlist';
import { useState } from 'react';

export default function ProductCard({ product, isWishlisted = false }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [busy, setBusy] = useState(false);

  const image = product.product_images?.find((i) => i.is_primary)?.url || product.product_images?.[0]?.url || '/assets/placeholder-product.jpg';
  const onSale = product.sale_price != null && product.sale_price < product.price;
  const outOfStock = product.stock <= 0;

  async function toggleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { showToast('Log in to save items to your wishlist.', 'info'); return; }
    setBusy(true);
    try {
      if (wishlisted) { await removeFromWishlist(user.id, product.id); setWishlisted(false); }
      else { await addToWishlist(user.id, product.id); setWishlisted(true); showToast('Added to wishlist'); }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="product-card-image">
        <img src={image} alt={product.name} loading="lazy" />
        <div className="product-card-badges">
          {onSale && <span className="badge badge-sale">Sale</span>}
          {product.is_new_arrival && <span className="badge badge-new">New</span>}
          {outOfStock && <span className="badge badge-out">Out of stock</span>}
        </div>
        <button className={`wishlist-btn ${wishlisted ? 'active' : ''}`} onClick={toggleWishlist} disabled={busy} aria-label="Toggle wishlist">
          ♡
        </button>
      </div>
      <div className="product-card-body">
        {product.categories?.name && <span className="product-card-category">{product.categories.name}</span>}
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-price">
          {onSale && <span className="price-original">{formatMoney(product.price)}</span>}
          <span className="price-current">{formatMoney(onSale ? product.sale_price : product.price)}</span>
        </div>
      </div>
    </Link>
  );
}
