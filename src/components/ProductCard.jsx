import { Link } from 'react-router-dom';
import { formatCategoryName, formatMoney } from '../config/siteConfig';
import { THUMB_WIDTH, imageFallback, thumbUrl } from '../lib/imageUrl';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addToWishlist, removeFromWishlist } from '../services/wishlist';
import { displayPrice, isSoldByLength, isSoldOut, pricedVariants } from '../lib/pricing';
import { useState } from 'react';

export default function ProductCard({ product, isWishlisted = false }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [busy, setBusy] = useState(false);

  const image = product.product_images?.find((i) => i.is_primary)?.url || product.product_images?.[0]?.url || '/assets/placeholder-product.jpg';
  const soldByLength = isSoldByLength(product);
  // A length-priced product has no meaningful sale price: the product row's price
  // is only a placeholder for the cheapest length, so a strikethrough would be
  // meaningless and misleading.
  const onSale = !soldByLength && product.sale_price != null && product.sale_price < product.price;
  const outOfStock = isSoldOut(product) && !product.allow_preorder;
  const lengths = soldByLength ? pricedVariants(product) : [];
  const cheapest = displayPrice(product);

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
        <img
          src={thumbUrl(image)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={THUMB_WIDTH}
          height={Math.round(THUMB_WIDTH * 1.25)}
          onError={imageFallback(image, '/assets/placeholder-product.jpg')}
        />
        <div className="product-card-badges">
          {onSale && <span className="badge badge-sale">Sale</span>}
          {product.is_new_arrival && <span className="badge badge-new">New</span>}
          {product.allow_preorder && <span className="badge badge-preorder">Made to order</span>}
          {outOfStock && <span className="badge badge-out">Out of stock</span>}
        </div>
        <button
          className={`wishlist-btn ${wishlisted ? 'active' : ''}`}
          onClick={toggleWishlist}
          disabled={busy}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          ♡
        </button>
      </div>
      <div className="product-card-body">
        <span className="product-card-category">{formatCategoryName(product.categories?.name)}</span>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-price">
          {onSale && <span className="price-original">{formatMoney(product.price)}</span>}
          <span className="price-current">
            {soldByLength ? <span className="price-from">From {formatMoney(cheapest)}</span> : formatMoney(onSale ? product.sale_price : product.price)}
          </span>
        </div>
        {soldByLength && lengths.length > 0 && (
          <p className="product-card-lengths">
            {lengths.length} length{lengths.length === 1 ? '' : 's'} available
          </p>
        )}
      </div>
    </Link>
  );
}