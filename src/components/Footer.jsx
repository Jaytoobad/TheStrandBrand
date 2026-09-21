import { Link } from 'react-router-dom';
import { siteConfig } from '../config/siteConfig';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3 className="footer-brand">{siteConfig.brandName}</h3>
          <p className="footer-desc">Premium wigs for the modern woman — quality strands, effortless confidence.</p>
          <div className="footer-social">
            <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
            <a href={siteConfig.tiktokUrl} target="_blank" rel="noreferrer">TikTok</a>
            <a href={siteConfig.snapchatUrl} target="_blank" rel="noreferrer">Snapchat</a>
          </div>
        </div>

        <div>
          <h4>Shop</h4>
          <Link to="/shop">Shop All</Link>
          <Link to="/shop?filter=new">New Arrivals</Link>
          <Link to="/shop?filter=categories">Categories</Link>
          <Link to="/shop?filter=bestsellers">Best Sellers</Link>
        </div>

        <div>
          <h4>Help</h4>
          <Link to="/contact">Contact</Link>
          <Link to="/track-order">Track Order</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/faq#delivery">Delivery Information</Link>
          <Link to="/faq#returns">Returns / Refunds</Link>
        </div>

        <div>
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/about#story">Our Story</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {siteConfig.brandName}. All rights reserved.</span>
        <span>Accra, Ghana</span>
      </div>
    </footer>
  );
}
