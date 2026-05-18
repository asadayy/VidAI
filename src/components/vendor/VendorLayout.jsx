import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI } from '../../api/vendors';
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
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const { data } = await vendorAPI.getMyProfile();
        setVendor(data.data.vendor);
      } catch (err) {
        console.error("Failed to load vendor profile for sidebar", err);
      }
    };
    fetchVendor();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={`vendor-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="vendor-sidebar">
        <div className="sidebar-brand" style={{ position: 'relative', padding: '0.85rem 0', justifyContent: collapsed ? 'center' : 'flex-end' }}>
          {!collapsed && (
            <div className="sidebar-brand-text" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <img src="/Logos/web app logo with text.png" alt="VidAI Vendor" style={{ height: '32px', width: 'auto', objectFit: 'contain', transform: 'scale(2)', transformOrigin: 'center' }} />
            </div>
          )}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={!collapsed ? { position: 'absolute', right: '0.75rem' } : undefined}
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
            <div className="sidebar-user-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {vendor?.profileImage?.url || vendor?.profileImage || vendor?.coverImage?.url || user?.avatar?.url ? (
                <img 
                  src={vendor?.profileImage?.url || vendor?.profileImage || vendor?.coverImage?.url || user?.avatar?.url} 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                (vendor?.businessName || user?.name || user?.email || 'V').charAt(0).toUpperCase()
              )}
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
