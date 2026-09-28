import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PageLoader from './components/PageLoader';

// Home is the most common landing page, so it ships in the main bundle.
// Every other page is split into its own chunk and loaded on first visit.
import Home from './pages/Home';

// Customer pages
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const About = lazy(() => import('./pages/About'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Account pages
const AccountOverview = lazy(() => import('./pages/account/AccountOverview'));
const AccountOrders = lazy(() => import('./pages/account/AccountOrders'));
const AccountOrderDetails = lazy(() => import('./pages/account/AccountOrderDetails'));
const AccountWishlist = lazy(() => import('./pages/account/AccountWishlist'));
const AccountProfile = lazy(() => import('./pages/account/AccountProfile'));
const AccountAddresses = lazy(() => import('./pages/account/AccountAddresses'));

// Admin pages — never downloaded by shoppers
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const AdminProducts = lazy(() => import('./admin/pages/AdminProducts'));
const AdminProductForm = lazy(() => import('./admin/pages/AdminProductForm'));
const AdminCategories = lazy(() => import('./admin/pages/AdminCategories'));
const AdminInventory = lazy(() => import('./admin/pages/AdminInventory'));
const AdminOrders = lazy(() => import('./admin/pages/AdminOrders'));
const AdminOrderDetails = lazy(() => import('./admin/pages/AdminOrderDetails'));
const AdminCustomers = lazy(() => import('./admin/pages/AdminCustomers'));
const AdminReviews = lazy(() => import('./admin/pages/AdminReviews'));
const AdminAnalytics = lazy(() => import('./admin/pages/AdminAnalytics'));
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings'));

export default function App() {
  return (
    // Layout and AdminLayout have their own Suspense around <Outlet />, so the
    // navbar/sidebar stay on screen while a page chunk loads. This outer one
    // covers the admin shell and admin login.
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Customer-facing site */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/account" element={<ProtectedRoute><AccountOverview /></ProtectedRoute>} />
          <Route path="/account/orders" element={<ProtectedRoute><AccountOrders /></ProtectedRoute>} />
          <Route path="/account/orders/:id" element={<ProtectedRoute><AccountOrderDetails /></ProtectedRoute>} />
          <Route path="/account/wishlist" element={<ProtectedRoute><AccountWishlist /></ProtectedRoute>} />
          <Route path="/account/profile" element={<ProtectedRoute><AccountProfile /></ProtectedRoute>} />
          <Route path="/account/addresses" element={<ProtectedRoute><AccountAddresses /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetails />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
