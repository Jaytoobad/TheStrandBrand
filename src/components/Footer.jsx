import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../config/siteConfig';
import { COOKIE_SETTINGS_EVENT } from '../lib/cookieConsent';
import { fetchApprovedReviewsPage } from '../services/reviews';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand-col">
          <h3 className="footer-brand">{siteConfig.brandName}</h3>
          <p className="footer-desc">Premium wigs for the modern woman. Quality strands, effortless confidence.</p>
          <div className="footer-social">
            <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
            <a href={siteConfig.tiktokUrl} target="_blank" rel="noreferrer">TikTok</a>
            <a href={siteConfig.snapchatUrl} target="_blank" rel="noreferrer">Snapchat</a>
          </div>
        </div>

        <nav aria-label="Shop">
          <h4>Shop</h4>
          <Link to="/shop">Shop All</Link>
          <Link to="/shop?filter=new">New Arrivals</Link>
          <Link to="/shop?filter=categories">Categories</Link>
          <Link to="/shop?filter=bestsellers">Best Sellers</Link>
        </nav>

        <nav aria-label="Help">
          <h4>Help</h4>
          <Link to="/contact">Contact</Link>
          <Link to="/track-order">Track Order</Link>
          <Link to="/reviews">Customer Reviews</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/faq#delivery">Delivery Information</Link>
          <Link to="/refund-policy">Refund &amp; Return Policy</Link>
        </nav>

        <nav aria-label="Company">
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/about#story">Our Story</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/cookie-policy">Cookie Policy</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
          <button className="footer-cookie-settings" type="button" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>Cookie Settings</button>
        </nav>
      </div>

      <FooterReviews />

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {siteConfig.brandName}. All rights reserved.</span>
        <span>Accra, Ghana</span>
      </div>
    </footer>
  );
}

// A short, honest sample of real reviews on every page: the three most recent
// approved ones, plus a way to read them all or leave a new one.
function FooterReviews() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let active = true;
    fetchApprovedReviewsPage(3)
      .then((data) => { if (active) setReviews(data); })
      .catch(() => { if (active) setReviews([]); });
    return () => { active = false; };
  }, []);

  return (
    <section className="footer-reviews" aria-labelledby="footer-reviews-title">
      <div className="container">
        <h4 id="footer-reviews-title" className="footer-reviews-title">What customers say</h4>
        {reviews.length === 0 ? (
          <p className="footer-reviews-empty">
            Delivered orders can be reviewed by their customers. <Link to="/reviews#write">Be the first to review a product</Link>.
          </p>
        ) : (
          <ul className="footer-reviews-list">
            {reviews.map((review) => (
              <li key={review.id} className="footer-review">
                <span className="footer-review-stars" aria-hidden="true">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </span>
                <span className="visually-hidden">{`Rated ${review.rating} out of 5 stars`}</span>
                <p>{review.comment}</p>
                <span className="footer-review-product">
                  {review.products ? (
                    <Link to={`/product/${review.products.slug}`}>{review.products.name}</Link>
                  ) : (
                    'Verified purchase'
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="footer-reviews-links">
          <Link to="/reviews">Read all reviews</Link>
          <span aria-hidden="true">·</span>
          <Link to="/reviews#write">Write a review</Link>
        </p>
      </div>
    </section>
  );
}
