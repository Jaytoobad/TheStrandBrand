import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductBySlug, fetchApprovedReviews } from '../services/products';
import { formatCategoryName, formatMoney } from '../config/siteConfig';
import posthog, { canCapturePostHog } from '../lib/posthog';
import { useCart } from '../context/CartContext';
import { isSoldByLength, unitPriceFor, displayPrice, lengthLabel, variantPrice } from '../lib/pricing';
import DeliveryEstimate from '../components/DeliveryEstimate';
import { useToast } from '../context/ToastContext';
import PageLoader from '../components/PageLoader';
 import usePageMeta from '../hooks/usePageMeta';

export default function ProductDetails() {
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
  usePageMeta(product?.name, product?.description);

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

  // Lengths must appear shortest-first, and other options in the order the
  // merchant set. Without this the order came back however Postgres felt like
  // returning it. Fall back to sorting numeric-looking values (10 before 22) for
  // rows created before sort_order existed.
  const orderedOptionGroups = useMemo(() => {
    const entries = Object.entries(optionGroups).map(([name, options]) => {
      const sorted = [...options].sort((a, b) => {
        const order = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
        if (order !== 0) return order;
        const aNum = Number.parseFloat(String(a.option_value).replace(/[^0-9.]/g, ''));
        const bNum = Number.parseFloat(String(b.option_value).replace(/[^0-9.]/g, ''));
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(a.option_value).localeCompare(String(b.option_value));
      });
      return [name, sorted];
    });
    return Object.fromEntries(entries);
  }, [optionGroups]);

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
  const soldByLength = isSoldByLength(product);
  // A length-priced product's own price is only a placeholder for the cheapest
  // length, so a "Sale" strike-through would compare a placeholder against a
  // placeholder and say nothing useful about what the customer pays.
  const onSale = !soldByLength && product.sale_price != null && product.sale_price < product.price;
  const finalPrice = unitPriceFor(product, selectedVariant);
  const requiresVariant = Object.keys(orderedOptionGroups).length > 0;
  const stock = selectedVariant ? selectedVariant.stock : product.stock;
  const outOfStock = stock <= 0 && !product.allow_preorder;
  // Until a length is chosen, show the cheapest one rather than a bare number.
  const showsFromPrice = soldByLength && !selectedVariant;

  function handleAddToCart() {
    if (requiresVariant && !selectedVariant) {
      showToast('Please select all options first.', 'error');
      return;
    }
    addItem(product, selectedVariant, quantity);
    if (canCapturePostHog()) {
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
              <button
                key={img.id || i}
                className={i === activeImage ? 'active' : ''}
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                aria-pressed={i === activeImage}
              >
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        {product.categories?.name && <span className="product-card-category">{formatCategoryName(product.categories.name)}</span>}
        <h1>{product.name}</h1>
        {product.rating_count > 0 && (
          <div className="product-rating">
            <span aria-hidden="true">{'★'.repeat(Math.round(product.rating_average))}{'☆'.repeat(5 - Math.round(product.rating_average))}</span>
            <span className="visually-hidden">{`Rated ${product.rating_average} out of 5 stars`}</span>
            <span aria-hidden="true"> ({product.rating_count})</span>
          </div>
        )}

        <div className="product-card-price product-detail-price">
          {onSale && <span className="price-original">{formatMoney(product.price)}</span>}
          <span className="price-current">
            {showsFromPrice ? <span className="price-from">From {formatMoney(displayPrice(product))}</span> : formatMoney(finalPrice)}
          </span>
        </div>
        {soldByLength && !selectedVariant && (
          <p className="product-length-hint">Price and stock depend on the length. Choose one to see the exact price.</p>
        )}

        <DeliveryEstimate />

        {product.description && <p className="product-description">{product.description}</p>}

        {Object.entries(orderedOptionGroups).map(([name, options]) =>
          // Rows are the length picker. Any other option group (a category that
          // is not sold by length) keeps pills, and a length label is never
          // invented for a value like "1B" that is not a measurement.
          soldByLength && /length/i.test(name) ? (
            <div key={name} className="option-group length-group">
              <h4 id={`length-group-${name}`}>{name}</h4>
              <div className="length-list" role="radiogroup" aria-labelledby={`length-group-${name}`}>
                {options.map((opt) => {
                  const price = variantPrice(opt);
                  const soldOut = opt.stock <= 0 && !product.allow_preorder;
                  const isActive = selectedOptions[name] === opt.option_value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={isActive ? 'length-row active' : 'length-row'}
                      onClick={() => setSelectedOptions((s) => ({ ...s, [name]: opt.option_value }))}
                      disabled={soldOut}
                    >
                      <span className="length-row-name">{lengthLabel(opt)}</span>
                      {price != null && <span className="length-row-price">{formatMoney(price)}</span>}
                      <span className={soldOut ? 'length-row-stock out' : 'length-row-stock'}>
                        {soldOut ? 'Sold out' : product.allow_preorder ? 'Preorder' : `${opt.stock} in stock`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div key={name} className="option-group">
              <h4>{name}</h4>
              <div className="option-pills">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    className={selectedOptions[name] === opt.option_value ? 'option-pill active' : 'option-pill'}
                    onClick={() => setSelectedOptions((s) => ({ ...s, [name]: opt.option_value }))}
                    disabled={opt.stock <= 0 && !product.allow_preorder}
                    aria-pressed={selectedOptions[name] === opt.option_value}
                  >
                    {opt.option_value}
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        <div className="quantity-row">
          <div className="quantity-selector">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))} aria-label="Increase quantity">+</button>
          </div>
          <span className={outOfStock ? 'stock-status stock-out' : 'stock-status'}>
            {outOfStock ? 'Out of stock' : product.allow_preorder ? 'Available to preorder' : `${stock} in stock`}
          </span>
        </div>

        <div className="product-actions">
          <button className="btn btn-outline btn-block" onClick={handleAddToCart} disabled={outOfStock}>Add to Cart</button>
          <Link
            to="/checkout"
            className={`btn btn-primary btn-block ${outOfStock ? 'btn-disabled-link' : ''}`}
            onClick={(e) => { if (outOfStock) { e.preventDefault(); return; } handleAddToCart(); }}
            aria-disabled={outOfStock}
            tabIndex={outOfStock ? -1 : undefined}
          >
            Buy Now
          </Link>
        </div>
      </div>

      <div className="product-reviews">
        <h2>Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="empty-state">No reviews yet. Be the first to leave a review after your order is delivered.</p>
        ) : (
          <div className="reviews-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-header">
                  <strong>{r.profiles?.first_name || 'Verified Customer'}</strong>
                  <span>
                    <span aria-hidden="true">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="visually-hidden">{`Rated ${r.rating} out of 5 stars`}</span>
                  </span>
                </div>
                <p>{r.comment}</p>
              </div>
            ))}
          </div>
        )}
        <p className="product-reviews-actions">
          <Link className="btn btn-outline btn-sm" to={`/reviews?product=${product.slug}#write`}>Review this product</Link>
          <Link className="btn btn-outline btn-sm" to="/reviews">All reviews ({reviews.length})</Link>
        </p>
      </div>
    </div>
  );
}