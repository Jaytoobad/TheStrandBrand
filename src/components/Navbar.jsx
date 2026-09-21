import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { siteConfig } from '../config/siteConfig';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { user } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  function submitSearch(e) {
    e.preventDefault();
    if (searchValue.trim()) navigate(`/shop?search=${encodeURIComponent(searchValue.trim())}`);
    setSearchOpen(false);
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/shop?filter=collections', label: 'Collections' },
    { to: '/about', label: 'About' },
    { to: '/track-order', label: 'Track Order' },
  ];

  return (
    <>
      <div className="announcement-bar">{siteConfig.announcementBar}</div>

      <header className="navbar">
        <div className="container navbar-inner">
          <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>

          <Link to="/" className="navbar-brand">{siteConfig.brandName}</Link>

          <nav className="navbar-links" aria-label="Main navigation">
            {navLinks.map((l) => (
              <NavLink key={l.label} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="navbar-actions">
            <button aria-label="Search" onClick={() => setSearchOpen((s) => !s)}>
              <IconSearch />
            </button>
            <Link to="/account/wishlist" aria-label="Wishlist"><IconHeart /></Link>
            <Link to="/cart" aria-label="Cart" className="cart-icon-wrap">
              <IconBag />
              {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
            </Link>
            <Link to={user ? '/account' : '/login'} aria-label="Account"><IconUser /></Link>
          </div>
        </div>

        {searchOpen && (
          <form className="search-bar container" onSubmit={submitSearch}>
            <input
              autoFocus
              type="search"
              placeholder="Search for wigs, styles, categories..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
        )}
      </header>

      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`mobile-drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
        <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">×</button>
        <nav className="drawer-links">
          {navLinks.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setDrawerOpen(false)}>{l.label}</Link>
          ))}
          <Link to={user ? '/account' : '/login'} onClick={() => setDrawerOpen(false)}>{user ? 'My Account' : 'Login / Register'}</Link>
        </nav>
      </aside>
    </>
  );
}

function IconSearch() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
}
function IconHeart() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6Z"/></svg>;
}
function IconBag() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>;
}
function IconUser() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>;
}
