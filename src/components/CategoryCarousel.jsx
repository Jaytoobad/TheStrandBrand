import { Link } from 'react-router-dom';
import { formatCategoryName } from '../config/siteConfig';
import useScrollRail from '../hooks/useScrollRail';

// Swipeable row of category tiles. Phones show one and a half tiles (so it's
// obvious there's more to swipe); larger screens show three or four with arrow
// buttons. A thin gold bar shows how far along the row you are.
export default function CategoryCarousel({ categories, loading }) {
  const items = loading ? Array.from({ length: 4 }) : categories;
  const { ref, canPrev, canNext, progress, visible, scrollByPage } = useScrollRail(items.length);
  const scrollable = canPrev || canNext;

  function handleKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByPage(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByPage(-1); }
  }

  if (!loading && categories.length === 0) return null;

  return (
    <div className="category-carousel">
      <div
        ref={ref}
        className="category-rail"
        role="region"
        aria-roledescription="carousel"
        aria-label="Shop by category"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {loading
          ? items.map((_, i) => <div key={i} className="skeleton category-skeleton" aria-hidden="true" />)
          : categories.map((c, i) => (
            <Link
              key={c.id}
              to={`/shop?category=${c.slug}`}
              className="category-tile"
              aria-label={`${formatCategoryName(c.name)}, category ${i + 1} of ${categories.length}`}
            >
              <img
                src={c.image_url || '/assets/placeholder-category.jpg'}
                alt=""
                referrerPolicy="no-referrer"
                loading={i < 4 ? 'eager' : 'lazy'}
                decoding="async"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/placeholder-category.jpg'; }}
              />
              <span className="category-tile-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <span className="category-tile-body">
                <span className="category-tile-name">{formatCategoryName(c.name)}</span>
                <span className="category-tile-cta" aria-hidden="true">Shop now →</span>
              </span>
            </Link>
          ))}
      </div>

      {!loading && scrollable && (
        <div className="category-carousel-controls">
          <div className="category-progress" aria-hidden="true">
            <span style={{ width: `${visible * 100}%`, transform: `translateX(${(progress * (1 - visible) / visible) * 100}%)` }} />
          </div>
          <div className="category-arrows">
            <button type="button" className="carousel-arrow" onClick={() => scrollByPage(-1)} disabled={!canPrev} aria-label="Previous categories">←</button>
            <button type="button" className="carousel-arrow" onClick={() => scrollByPage(1)} disabled={!canNext} aria-label="Next categories">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
