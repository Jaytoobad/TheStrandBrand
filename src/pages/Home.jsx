import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import CategoryCarousel from '../components/CategoryCarousel';
import collectionImage from '../assets/collection-hair.jpg';
import { fetchCategories, fetchProducts } from '../services/products';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';

export default function Home() {
  usePageMeta('Home', 'Premium wigs for the modern woman. Shop body wave, bone straight, curly and more, delivered across Ghana.');
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

      <section className="brand-story">
        <div className="container brand-story-inner">
          <img
            src={collectionImage}
            alt="TheStrandBrand hair bundles with three finished wigs: straight, deep wave and body wave"
            width="810"
            height="1080"
            loading="lazy"
            decoding="async"
          />
          <div className="brand-story-text">
            <span className="brand-story-label">The Collection</span>
            <h2>Made for the modern woman</h2>
            <p>Every wig is chosen for how it wears, not just how it looks. Expect breathable lace, true-to-life density, and colours that suit real skin tones. Prices are in cedis, with delivery across Ghana.</p>
            <Link to="/shop" className="btn btn-outline">Explore the collection</Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <h2 className="section-title">Shop By Category</h2>
        <CategoryCarousel categories={categories} loading={loading} />
      </section>

      {(loading || newArrivals.length > 0) && (
        <section className="section container">
          <h2 className="section-title">New Arrivals</h2>
          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton product-skeleton" />)}
            </div>
          ) : (
            <div className="product-grid">
              {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          {!loading && (
            <div className="section-cta">
              <Link to="/shop?filter=new" className="btn btn-view-all" aria-label="View all new arrivals">View All</Link>
            </div>
          )}
        </section>
      )}

      {(loading || featured.length > 0) && (
        <section className="section container">
          <h2 className="section-title">Best Sellers</h2>
          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton product-skeleton" />)}
            </div>
          ) : (
            <div className="product-grid">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          {!loading && (
            <div className="section-cta">
              <Link to="/shop?filter=bestsellers" className="btn btn-view-all" aria-label="View all best sellers">View All</Link>
            </div>
          )}
        </section>
      )}

      <section className="promo-banner">
        <div className="container">
          <h2>Find A Style That Feels Like You.</h2>
          <p>Quality strands. Effortless confidence.</p>
          <Link to="/shop" className="btn btn-light-contrast">Shop The Collection</Link>
        </div>
      </section>
    </div>
  );
}