import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductBySlug, fetchApprovedReviews } from '../services/products';
import { formatMoney } from '../config/siteConfig';
import posthog, { isPostHogConfigured } from '../lib/posthog';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import PageLoader from '../components/PageLoader';
 import usePageMeta from '../hooks/usePageMeta';

export default function ProductDetails() {
  usePageMeta(product?.name, product?.description);
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchProductBySlug(slug)
      .then(async (p) => {
        if (!active) return;
        setProduct(p);
        const r = await fetchApprovedReviews(p.id).catch(() => []);
        if (active) setReviews(r);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const optionGroups = useMemo(() => {
    if (!product?.product_variants?.length) return {};
    return product.product_variants.reduce((acc, v) => {
      acc[v.option_name] = acc[v.option_name] || [];
      acc[v.option_name].push(v);
      return acc;
    }, {});
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.product_variants?.length) return null;
    const names = Object.keys(optionGroups);
    if (names.some((n) => !selectedOptions[n])) return null;
    return product.product_variants.find((v) =>
      names.every((n) => (v.option_name === n ? v.option_value === selectedOptions[n] : true))
    ) || optionGroups[names[0]]?.find((v) => v.option_value === selectedOptions[names[0]]);
  }, [product, optionGroups, selectedOptions]);

  if (loading) return <PageLoader />;
  if (error || !product) {
    return (
      <div className="container empty-state">
        <p>We couldn't find that product.</p>
        <Link to="/shop" className="btn btn-outline">Back to Shop</Link>
      </div>
    );
  }

  const images = product.product_images?.length ? [...product.product_images].sort((a, b) => a.sort_order - b.sort_order) : [{ url: '/assets/placeholder-product.jpg' }];
  const onSale = product.sale_price != null && product.sale_price < product.price;
  const basePrice = onSale ? product.sale_price : product.price;
  const finalPrice = basePrice + (selectedVariant ? Number(selectedVariant.price_adjustment) : 0);
  const requiresVariant = Object.keys(optionGroups).length > 0;
  const stock = selectedVariant ? selectedVariant.stock : product.stock;
  const outOfStock = stock <= 0;

  function handleAddToCart() {
    if (requiresVariant && !selectedVariant) {
      showToast('Please select all options first.', 'error');
      return;
    }
    addItem(product, selectedVariant, quantity);
    if (isPostHogConfigured) {
      posthog.capture('product_added_to_cart', {
        product_id: product.id,
        category: product.categories?.name,
        variant_id: selectedVariant?.id,
        quantity,
        unit_price: finalPrice,
        currency: 'GHS',
      });
    }
    showToast('Added to cart');
  }

  return (
    <div className="container section product-details">
      <div className="product-gallery">
        <div className="product-gallery-main">
          <img src={images[activeImage]?.url} alt={product.name} />
        </div>
        {images.length > 1 && (
          <div className="product-gallery-thumbs">
            {images.map((img, i) => (
              <button key={img.id || i} className={i === activeImage ? 'active' : ''} onClick={() => setActiveImage(i)}>
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        {product.categories?.name && <span className="product-card-category">{product.categories.name}</span>}
        <h1>{product.name}</h1>
        {product.rating_count > 0 && (
          <div className="product-rating">{'★'.repeat(Math.round(product.rating_average))}{'☆'.repeat(5 - Math.round(product.rating_average))} <span>({product.rating_count})</span></div>
        )}

        <div className="product-card-price product-detail-price">
          {onSale && <span className="price-original">{formatMoney(product.price)}</span>}
          <span className="price-current">{formatMoney(finalPrice)}</span>
        </div>

        {product.description && <p className="product-description">{product.description}</p>}

        {Object.entries(optionGroups).map(([name, options]) => (
          <div key={name} className="option-group">
            <h4>{name}</h4>
            <div className="option-pills">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  className={selectedOptions[name] === opt.option_value ? 'option-pill active' : 'option-pill'}
                  onClick={() => setSelectedOptions((s) => ({ ...s, [name]: opt.option_value }))}
                  disabled={opt.stock <= 0}
                >
                  {opt.option_value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="quantity-row">
          <div className="quantity-selector">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))} aria-label="Increase quantity">+</button>
          </div>
          <span className={outOfStock ? 'stock-status stock-out' : 'stock-status'}>
            {outOfStock ? 'Out of stock' : `${stock} in stock`}
          </span>
        </div>

        <div className="product-actions">
          <button className="btn btn-outline btn-block" onClick={handleAddToCart} disabled={outOfStock}>Add to Cart</button>
          <Link
            to="/checkout"
            className={`btn btn-primary btn-block ${outOfStock ? 'btn-disabled-link' : ''}`}
            onClick={(e) => { if (outOfStock) { e.preventDefault(); return; } handleAddToCart(); }}
          >
            Buy Now
          </Link>
        </div>
      </div>

      <div className="product-reviews">
        <h2>Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="empty-state">No reviews yet — be the first to leave one after your order is delivered.</p>
        ) : (
          <div className="reviews-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-header">
                  <strong>{r.profiles?.first_name || 'Verified Customer'}</strong>
                  <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p>{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
