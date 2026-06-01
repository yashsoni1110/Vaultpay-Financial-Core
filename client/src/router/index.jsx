import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Invoices from '../pages/Invoices';
import InvoiceDetail from '../pages/InvoiceDetail';
import PaymentLinks from '../pages/PaymentLinks';
import Payouts from '../pages/Payouts';
import Forbidden from '../pages/Forbidden';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminWebhooks from '../pages/admin/AdminWebhooks';
import AdminPayouts from '../pages/admin/AdminPayouts';

// Protected route wrapper
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Admin-only route wrapper
// Requirement 1.5: client hitting /admin/* must see a 403 page — NOT a silent redirect
const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Forbidden />;   // ← 403 page, not a redirect
  return children;
};

export default function AppRouter() {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"    element={user ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* Protected routes (all inside AppLayout) */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />} />

        {/* Client routes */}
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="invoices"       element={<Invoices />} />
        <Route path="invoices/:id"   element={<InvoiceDetail />} />
        <Route path="payment-links"  element={<PaymentLinks />} />
        <Route path="payouts"        element={<Payouts />} />

        {/* Admin-only routes — renders 403 for non-admins instead of redirecting */}
        <Route path="admin"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="admin/users"     element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="admin/webhooks"  element={<AdminRoute><AdminWebhooks /></AdminRoute>} />
        <Route path="admin/payouts"   element={<AdminRoute><AdminPayouts /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'} replace />} />
    </Routes>
  );
}
