import { useEffect, useState } from 'react';
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
    fetchWishlist(user.id).then(setItems).finally(() => setLoading(false));
  }, [user]);

  return (
    <AccountLayout>
      <h1>My Wishlist</h1>
      {loading ? <PageLoader /> : items.length === 0 ? (
        <p className="empty-state">Your wishlist is empty.</p>
      ) : (
        <div className="product-grid">
          {items.map((w) => <ProductCard key={w.id} product={w.products} isWishlisted />)}
        </div>
      )}
    </AccountLayout>
  );
}
