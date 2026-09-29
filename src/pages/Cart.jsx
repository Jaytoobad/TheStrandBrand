import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../config/siteConfig';
import { ACCRA_REGION } from '../config/delivery';
import DeliveryEstimate from '../components/DeliveryEstimate';
import usePageMeta from '../hooks/usePageMeta';
import useDeliveryRates from '../hooks/useDeliveryRates';

export default function Cart() {
  usePageMeta('Cart', 'Review your cart items and proceed to checkout.');
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  // The fee depends on the region, which is chosen at checkout.
  const { feeByRegion, lowestFee } = useDeliveryRates();
  const accraFee = feeByRegion[ACCRA_REGION];

  if (items.length === 0) {
    return (
      <div className="container section empty-state">
        <p>Your cart is empty.</p>
        <Link to="/shop" className="btn btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container section cart-layout">
      <div className="cart-items">
        <h1>Your Cart</h1>
        {items.map((item) => (
          <div key={item.key} className="cart-item">
            <img src={item.image || '/assets/placeholder-product.jpg'} alt={item.name} />
            <div className="cart-item-info">
              <h3>{item.name}</h3>
              {item.variantLabel && <span className="cart-item-variant">{item.variantLabel}</span>}
              <span className="cart-item-price">{formatMoney(item.unitPrice)}</span>
            </div>
            <div className="quantity-selector">
              <button onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Decrease quantity">−</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Increase quantity">+</button>
            </div>
            <span className="cart-item-subtotal">{formatMoney(item.unitPrice * item.quantity)}</span>
            <button className="cart-item-remove" onClick={() => removeItem(item.key)} aria-label="Remove item">×</button>
          </div>
        ))}
      </div>

      <aside className="cart-summary card">
        <h2>Order Summary</h2>
        <DeliveryEstimate compact />
        <div className="summary-row"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
        <div className="summary-row"><span>Delivery Fee</span><span>{lowestFee != null ? `From ${formatMoney(lowestFee)}` : 'At checkout'}</span></div>
        <div className="summary-row summary-total"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
        <p className="form-hint cart-delivery-note">
          {accraFee != null ? `${formatMoney(accraFee)} within Greater Accra. ` : ''}Your delivery fee is added at checkout once you pick your region.
        </p>
        <Link to="/checkout" className="btn btn-primary btn-block">Proceed to Checkout</Link>
        <Link to="/shop" className="btn btn-outline btn-block" style={{ marginTop: 10 }}>Continue Shopping</Link>
      </aside>
    </div>
  );
}
