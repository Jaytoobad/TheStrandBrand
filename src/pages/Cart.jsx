import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatMoney, siteConfig } from '../config/siteConfig';

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const deliveryFee = items.length ? siteConfig.defaultDeliveryFee : 0;
  const total = subtotal + deliveryFee;

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
        <div className="summary-row"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
        <div className="summary-row"><span>Delivery Fee</span><span>{formatMoney(deliveryFee)}</span></div>
        <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(total)}</span></div>
        <Link to="/checkout" className="btn btn-primary btn-block">Proceed to Checkout</Link>
        <Link to="/shop" className="btn btn-outline btn-block" style={{ marginTop: 10 }}>Continue Shopping</Link>
      </aside>
    </div>
  );
}
