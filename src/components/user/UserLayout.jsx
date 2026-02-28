import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Store,
  Calculator,
  MessageCircle,
  LayoutDashboard,
  Calendar,
  LogOut,
  Menu,
  X,
  LogIn,
  Mail
} from 'lucide-react';
import { useState } from 'react';
import AuthModal from '../auth/AuthModal';
import './UserLayout.css';

const PUBLIC_NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/user/vendors', icon: Store, label: 'Vendors' },
];

const PRIVATE_NAV_ITEMS = [
  { to: '/user', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/user/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/user/budget', icon: Calculator, label: 'Budget' },
  { to: '/user/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/user/invitations', icon: Mail, label: 'Invitation' },
];

function UserLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const navItems = isAuthenticated
    ? [...PUBLIC_NAV_ITEMS.slice(0, 1), ...PRIVATE_NAV_ITEMS, PUBLIC_NAV_ITEMS[1]]
    : PUBLIC_NAV_ITEMS;

  return (
    <div className="user-layout">
      <header className="user-navbar">
        <div className="user-navbar-container">
          {/* Logo / Brand */}
          <div className="user-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="user-brand-text">VIDAI</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="user-nav-desktop">
            {navItems.map(({ to, icon: NavIcon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `user-nav-link ${isActive ? 'active' : ''}`
                }
              >
                <NavIcon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User & Mobile Toggle */}
          <div className="user-actions">
            {isAuthenticated ? (
              <>
                <div className="user-info">
                  <div className="user-avatar">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">{user?.name || user?.email}</span>
                </div>

                <button onClick={handleLogout} className="user-logout-btn" title="Logout">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <div className="guest-actions">
                <button onClick={() => openAuthModal('login')} className="user-login-btn">
                  <LogIn size={18} />
                  <span>Login</span>
                </button>
              </div>
            )}

            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <nav className="user-nav-mobile">
            {navItems.map(({ to, icon: NavIcon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `user-nav-link-mobile ${isActive ? 'active' : ''}`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <NavIcon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="user-content">
        <Outlet />
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}

export default UserLayout;
