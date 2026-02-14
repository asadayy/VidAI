import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import {
  Users,
  Store,
  CalendarCheck,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const STAT_CARDS = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: '#3b82f6' },
  { key: 'totalVendors', label: 'Total Vendors', icon: Store, color: '#8b5cf6' },
  { key: 'approvedVendors', label: 'Approved Vendors', icon: ShieldCheck, color: '#22c55e' },
  { key: 'pendingVendors', label: 'Pending Verification', icon: ShieldAlert, color: '#f59e0b' },
  { key: 'totalBookings', label: 'Total Bookings', icon: CalendarCheck, color: '#ec4899' },
  { key: 'pendingBookings', label: 'Pending Bookings', icon: Clock, color: '#f97316' },
];

function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminAPI.getDashboard();
        setData(res.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <Loading size="lg" fullScreen />;

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="admin-welcome">Welcome back, {user?.name || 'Admin'}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {/* eslint-disable-next-line no-unused-vars -- StatIcon rendered in JSX */}
        {STAT_CARDS.map(({ key, label, icon: StatIcon, color }) => (
          <div className="stat-card" key={key}>
            <div className="admin-stat-header">
              <div className="admin-stat-icon" style={{ backgroundColor: `${color}15`, color }}>
                <StatIcon size={20} />
              </div>
            </div>
            <div className="stat-value">{data?.stats?.[key] ?? 0}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity panels */}
      <div className="admin-panels">
        {/* Recent Users */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Users</h3>
          </div>
          {data?.recentUsers?.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((u) => (
                    <tr key={u._id}>
                      <td className="admin-user-cell">
                        <div className="admin-avatar-sm">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role === 'admin' ? 'info' : u.role === 'vendor' ? 'warning' : 'neutral'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No users yet</p>
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Bookings</h3>
          </div>
          {data?.recentBookings?.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vendor</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings.map((b) => (
                    <tr key={b._id}>
                      <td>{b.user?.name || 'N/A'}</td>
                      <td>{b.vendor?.businessName || 'N/A'}</td>
                      <td className="admin-event-type">{b.eventType?.replace(/_/g, ' ')}</td>
                      <td>{b.eventDate ? new Date(b.eventDate).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`badge badge-${statusBadge(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No bookings yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function statusBadge(status) {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    completed: 'info',
    cancelled: 'neutral',
  };
  return map[status] || 'neutral';
}

export default AdminDashboard;
