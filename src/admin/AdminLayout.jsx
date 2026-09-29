import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/auth';
import { siteConfig } from '../config/siteConfig';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">{siteConfig.brandName} <span>Admin</span></div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span>{profile?.email}</span>
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-view-shop">View shop ↗</a>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="admin-main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
