import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, FileText, Link2, Wallet, Users,
  Webhook, LogOut, Shield, TrendingUp
} from 'lucide-react';

const clientNav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices',      icon: FileText,         label: 'Invoices' },
  { to: '/payment-links', icon: Link2,            label: 'Payment Links' },
  { to: '/payouts',       icon: Wallet,           label: 'Payouts' },
];

const adminNav = [
  { to: '/admin',          icon: TrendingUp, label: 'Overview' },
  { to: '/admin/users',    icon: Users,      label: 'Users' },
  { to: '/invoices',       icon: FileText,   label: 'Invoices' },
  { to: '/admin/payouts',  icon: Wallet,     label: 'Payouts' },
  { to: '/admin/webhooks', icon: Webhook,    label: 'Webhooks' },
];

export default function Sidebar({ isOpen, closeSidebar }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={20} color="white" />
        </div>
        <span className="sidebar-logo-text">VaultPay</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {isAdmin ? (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Admin Panel</div>
            {adminNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon className="link-icon" size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Menu</div>
            {clientNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon className="link-icon" size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            id="sidebar-logout-btn"
            className="logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
