import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import { fetchCategories, fetchProducts } from '../services/products';
import { useToast } from '../context/ToastContext';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, arrivals, feat] = await Promise.all([
          fetchCategories(),
          fetchProducts({ isNewArrival: true }),
          fetchProducts({ isFeatured: true }),
        ]);
        if (!active) return;
        setCategories(cats);
        setNewArrivals(arrivals.slice(0, 8));
        setFeatured(feat.slice(0, 8));
      } catch {
        showToast('Could not load the shop right now. Please refresh.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [showToast]);

  return (
    <div>
      <HeroSlider />

      <section className="section container">
        <h2 className="section-title">Shop By Category</h2>
        {loading ? (
          <div className="category-grid">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton category-skeleton" />)}
          </div>
        ) : (
          <div className="category-grid">
            {categories.map((c) => (
              <Link key={c.id} to={`/shop?category=${c.slug}`} className="category-tile">
                <img src={c.image_url || '/assets/placeholder-category.jpg'} alt={c.name} />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {newArrivals.length > 0 && (
        <section className="section container">
          <div className="section-header">
            <h2 className="section-title">New Arrivals</h2>
            <Link to="/shop?filter=new" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="product-grid">
            {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="section container">
          <div className="section-header">
            <h2 className="section-title">Best Sellers</h2>
            <Link to="/shop?filter=bestsellers" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="product-grid">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <section className="promo-banner">
        <div className="container">
          <h2>Find A Style That Feels Like You.</h2>
          <p>Quality strands. Effortless confidence.</p>
          <Link to="/shop" className="btn btn-primary">Shop The Collection</Link>
        </div>
      </section>
    </div>
  );
}
