import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  UserPlus,
  CalendarDays,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const STAT_CARDS = [
  {
    key: 'totalUsers',
    label: 'Total Users',
    icon: Users,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: '#3b82f6',
  },
  {
    key: 'totalVendors',
    label: 'Total Vendors',
    icon: Store,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: '#8b5cf6',
  },
  {
    key: 'approvedVendors',
    label: 'Approved Vendors',
    icon: ShieldCheck,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: '#22c55e',
  },
  {
    key: 'pendingVendors',
    label: 'Pending Verification',
    icon: ShieldAlert,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: '#f59e0b',
  },
  {
    key: 'totalBookings',
    label: 'Total Bookings',
    icon: CalendarCheck,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.08)',
    border: '#ec4899',
  },
  {
    key: 'pendingBookings',
    label: 'Pending Bookings',
    icon: Clock,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: '#f97316',
  },
];

function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await adminAPI.getDashboard();
      setData(res.data.data);
      if (silent) toast.success('Dashboard refreshed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <Loading size="lg" fullScreen />;

  return (
    <div className="admin-dashboard">
      {/* ── Header ── */}
      <div className="ad-header">
        <div className="ad-header-left">
          <div className="ad-header-icon">
            <TrendingUp size={18} />
          </div>
          <div>
            <h1 className="ad-title">Dashboard</h1>
            <p className="ad-subtitle">
              {greeting}, <strong>{user?.name || 'Admin'}</strong> —{' '}
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          className={`ad-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="ad-stat-grid">
        {STAT_CARDS.map(({ key, label, icon: StatIcon, color, bg, border }) => (
          <div
            className="ad-stat-card"
            key={key}
            style={{ '--card-accent': border }}
          >
            <div className="ad-stat-icon-wrap" style={{ background: bg, color }}>
              <StatIcon size={20} />
            </div>
            <div className="ad-stat-value">{data?.stats?.[key] ?? 0}</div>
            <div className="ad-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Panels ── */}
      <div className="ad-panels">
        {/* Recent Users */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div className="ad-panel-title">
              <UserPlus size={16} />
              <span>Recent Users</span>
            </div>
            <a href="/admin/users" className="ad-panel-link">
              View all <ArrowRight size={13} />
            </a>
          </div>

          {data?.recentUsers?.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="ad-user-cell">
                          <div
                            className="ad-avatar"
                            style={{ background: stringToColor(u.name || u.email) }}
                          >
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="ad-user-name">{u.name || '—'}</span>
                        </div>
                      </td>
                      <td className="ad-muted">{u.email}</td>
                      <td>
                        <span className={`badge badge-${roleBadge(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="ad-muted">
                        {new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ad-empty">
              <Users size={32} strokeWidth={1.2} />
              <p>No users registered yet</p>
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="ad-panel">
          <div className="ad-panel-header">
            <div className="ad-panel-title">
              <CalendarDays size={16} />
              <span>Recent Bookings</span>
            </div>
            <a href="/admin/bookings" className="ad-panel-link">
              View all <ArrowRight size={13} />
            </a>
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
                      <td className="ad-user-name">{b.user?.name || 'N/A'}</td>
                      <td className="ad-muted">{b.vendor?.businessName || 'N/A'}</td>
                      <td className="ad-event-type">{b.eventType?.replace(/_/g, ' ') || '—'}</td>
                      <td className="ad-muted">
                        {b.eventDate
                          ? new Date(b.eventDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
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
            <div className="ad-empty">
              <CalendarCheck size={32} strokeWidth={1.2} />
              <p>No bookings yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function statusBadge(status) {
  return { pending: 'warning', approved: 'success', rejected: 'danger', completed: 'info', cancelled: 'neutral' }[status] || 'neutral';
}

function roleBadge(role) {
  return { admin: 'info', vendor: 'warning', user: 'neutral' }[role] || 'neutral';
}

function stringToColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue},50%,45%)`;
}

export default AdminDashboard;
