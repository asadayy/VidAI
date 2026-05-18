import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAdminUser, clearAdminAuth } from '../../pages/AdminLogin';
import {
  LayoutDashboard,
  Store,
  Users,
  CalendarCheck,
  ScrollText,
  Activity,
  Flag,
  LogOut,
  Shield,
} from 'lucide-react';
import './AdminLayout.css';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/admin/vendors',   icon: Store,           label: 'Vendors'      },
  { to: '/admin/users',     icon: Users,           label: 'Users'        },
  { to: '/admin/bookings',  icon: CalendarCheck,   label: 'Bookings'     },
  { to: '/admin/logs',      icon: ScrollText,      label: 'Activity Logs'},
  { to: '/admin/reports',   icon: Flag,            label: 'System Reports'},
  { to: '/admin/system',    icon: Activity,        label: 'System Health'},
];

function AdminLayout() {
  const user = getAdminUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminAuth();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <img src="/Logos/web app logo with text.png" alt="VidAI" style={{ height: '32px', width: 'auto', objectFit: 'contain', transform: 'scale(2)', transformOrigin: 'left center', marginLeft: '10px' }} />
          <span className="admin-brand-sub" style={{ paddingLeft: '4px' }}>Admin Panel</span>
        </div>

        <nav className="admin-sidebar-nav">
          {/* eslint-disable-next-line no-unused-vars -- NavIcon rendered in JSX */}
          {NAV_ITEMS.map(({ to, icon: NavIcon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? 'admin-sidebar-link-active' : ''}`
              }
            >
              <NavIcon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="admin-sidebar-info">
              <span className="admin-sidebar-name">{user?.name || 'Admin'}</span>
              <span className="admin-sidebar-role">Administrator</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-sidebar-logout"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
