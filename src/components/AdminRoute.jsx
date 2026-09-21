import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from './PageLoader';

// Same caveat as ProtectedRoute: this is UX-level gating. Actual admin
// authorization is enforced by the `is_admin()` check inside RLS policies,
// so even if someone bypassed this component, the database would refuse
// writes/reads that require the admin role.
export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}
