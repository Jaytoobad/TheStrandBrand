import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { fetchCategories, fetchProducts } from '../services/products';
import { useToast } from '../context/ToastContext';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const categorySlug = searchParams.get('category') || '';
  const filter = searchParams.get('filter') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProducts({
      categorySlug: categorySlug || undefined,
      isNewArrival: filter === 'new' ? true : undefined,
      isFeatured: filter === 'bestsellers' ? true : undefined,
      search: search || undefined,
      sort,
    })
      .then((data) => { if (active) setProducts(data); })
      .catch(() => showToast('Could not load products.', 'error'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categorySlug, filter, search, sort, showToast]);

  const title = useMemo(() => {
    if (search) return `Results for "${search}"`;
    if (filter === 'new') return 'New Arrivals';
    if (filter === 'bestsellers') return 'Best Sellers';
    const cat = categories.find((c) => c.slug === categorySlug);
    return cat ? cat.name : 'Shop All';
  }, [search, filter, categorySlug, categories]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  }

  return (
    <div className="container section">
      <h1 className="shop-title">{title}</h1>

      <div className="shop-layout">
        <aside className="shop-filters">
          <div className="filter-group">
            <h4>Category</h4>
            <button className={!categorySlug ? 'filter-active' : ''} onClick={() => updateParam('category', '')}>All</button>
            {categories.map((c) => (
              <button key={c.id} className={categorySlug === c.slug ? 'filter-active' : ''} onClick={() => updateParam('category', c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="shop-main">
          <div className="shop-toolbar">
            <span>{loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`}</span>
            <div className="shop-toolbar-controls">
              <select
                className="mobile-category-select"
                value={categorySlug}
                onChange={(e) => updateParam('category', e.target.value)}
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
              <select value={sort} onChange={(e) => updateParam('sort', e.target.value)} aria-label="Sort products">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton product-skeleton" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <p>No products found. Try a different category or search term.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
