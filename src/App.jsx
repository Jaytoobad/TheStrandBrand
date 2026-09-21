import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './admin/AdminLayout';

// Customer pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import TrackOrder from './pages/TrackOrder';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

// Account pages
import AccountOverview from './pages/account/AccountOverview';
import AccountOrders from './pages/account/AccountOrders';
import AccountOrderDetails from './pages/account/AccountOrderDetails';
import AccountWishlist from './pages/account/AccountWishlist';
import AccountProfile from './pages/account/AccountProfile';
import AccountAddresses from './pages/account/AccountAddresses';

// Admin pages
import AdminLogin from './admin/pages/AdminLogin';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminProducts from './admin/pages/AdminProducts';
import AdminProductForm from './admin/pages/AdminProductForm';
import AdminCategories from './admin/pages/AdminCategories';
import AdminInventory from './admin/pages/AdminInventory';
import AdminOrders from './admin/pages/AdminOrders';
import AdminOrderDetails from './admin/pages/AdminOrderDetails';
import AdminCustomers from './admin/pages/AdminCustomers';
import AdminReviews from './admin/pages/AdminReviews';
import AdminAnalytics from './admin/pages/AdminAnalytics';
import AdminSettings from './admin/pages/AdminSettings';

export default function App() {
  return (
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
  );
}
