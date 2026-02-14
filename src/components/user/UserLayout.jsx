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
  X
} from 'lucide-react';
import { useState } from 'react';
import './UserLayout.css';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vendors', icon: Store, label: 'Vendors' },
  { to: '/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/budget', icon: Calculator, label: 'Budget' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
];

function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="user-layout">
      <header className="user-navbar">
        <div className="user-navbar-container">
          {/* Logo / Brand */}
          <div className="user-brand">
            <span className="user-brand-text">VIDAI</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="user-nav-desktop">
            {/* eslint-disable-next-line no-unused-vars -- NavIcon rendered in JSX */}
            {NAV_ITEMS.map(({ to, icon: NavIcon, label }) => (
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
            <div className="user-info">
              <div className="user-avatar">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user?.name || user?.email}</span>
            </div>
            
            <button onClick={handleLogout} className="user-logout-btn" title="Logout">
              <LogOut size={18} />
            </button>

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
            {/* eslint-disable-next-line no-unused-vars -- NavIcon rendered in JSX */}
            {NAV_ITEMS.map(({ to, icon: NavIcon, label }) => (
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
    </div>
  );
}

export default UserLayout;
