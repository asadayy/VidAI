import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Star,
  UserCircle,
  LogOut,
  Image as ImageIcon,
  MessageSquareDot,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
} from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown';
import './VendorLayout.css';

const NAV_ITEMS = [
  { to: '/vendor', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/vendor/portfolio', icon: ImageIcon, label: 'Portfolio' },
  { to: '/vendor/services', icon: Package, label: 'Services' },
  { to: '/vendor/bookings', icon: CalendarCheck, label: 'Bookings' },
  { to: '/vendor/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/vendor/messages', icon: MessageSquareDot, label: 'Messages' },
  { to: '/vendor/reviews', icon: Star, label: 'Reviews' },
  { to: '/vendor/profile', icon: UserCircle, label: 'Profile' },
];

function VendorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={`vendor-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="vendor-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-mark">{collapsed ? 'V' : 'VIDAI'}</span>
            {!collapsed && <span className="sidebar-brand-sub">Vendor Portal</span>}
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* eslint-disable-next-line no-unused-vars -- NavIcon rendered in JSX */}
          {NAV_ITEMS.map(({ to, icon: NavIcon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <NavIcon size={18} />
              <span className="sidebar-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(user?.name || user?.email || 'V').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'Vendor'}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
          <NotificationDropdown messagesPath="/vendor/messages" />
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="vendor-main">
        <Outlet />
      </main>
    </div>
  );
}

export default VendorLayout;
