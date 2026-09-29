import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import ProductCard from '../../components/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { fetchWishlist } from '../../services/wishlist';
import PageLoader from '../../components/PageLoader';

export default function AccountWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchWishlist(user.id).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [user]);

  // Skip rows whose product was deleted, so ProductCard never gets null
  const products = items.filter((w) => w.products);

  return (
    <AccountLayout>
      <h1>My Wishlist</h1>
      {loading ? <PageLoader /> : products.length === 0 ? (
        <div className="empty-state">
          <p>Your wishlist is empty. Tap the heart on any wig to save it here.</p>
          <Link to="/shop" className="btn btn-primary btn-sm">Browse the shop</Link>
        </div>
      ) : (
        <div className="product-grid account-product-grid">
          {products.map((w) => <ProductCard key={w.id} product={w.products} isWishlisted />)}
        </div>
      )}
    </AccountLayout>
  );
}
