import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/auth';
import { useNavigate } from 'react-router-dom';

export default function AccountLayout({ children }) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  const links = [
    { to: '/account', label: 'Overview', end: true },
    { to: '/account/orders', label: 'Orders' },
    { to: '/account/wishlist', label: 'Wishlist' },
    { to: '/account/profile', label: 'Profile' },
    { to: '/account/addresses', label: 'Addresses' },
  ];

  return (
    <div className="container section account-layout">
      <aside className="account-sidebar">
        <h3>Hi, {profile?.first_name || 'there'}</h3>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
          <button onClick={handleLogout} className="account-logout">Logout</button>
        </nav>
      </aside>
      <div className="account-content">{children}</div>
    </div>
  );
}
