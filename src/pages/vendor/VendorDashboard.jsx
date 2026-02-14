import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vendorAPI } from '../../api/vendors';
import { bookingAPI } from '../../api/bookings';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  Package,
  CalendarCheck,
  Eye,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import './VendorDashboard.css';

const STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'badge-warning' },
  approved: { label: 'Approved', className: 'badge-success' },
  rejected: { label: 'Rejected', className: 'badge-danger' },
  completed: { label: 'Completed', className: 'badge-info' },
  cancelled: { label: 'Cancelled', className: 'badge-neutral' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatPrice = (price) => {
  if (!price && price !== 0) return '—';
  return `PKR ${price.toLocaleString('en-PK')}`;
};

function VendorDashboard() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorRes, bookingsRes] = await Promise.all([
          vendorAPI.getMyProfile().catch((err) => {
            if (err.response?.status === 404) return null;
            throw err;
          }),
          bookingAPI.getVendorBookings({ limit: 5 }).catch(() => ({ data: { data: { bookings: [] } } })),
        ]);

        if (vendorRes) {
          setVendor(vendorRes.data.data.vendor);
        } else {
          setHasProfile(false);
        }

        setBookings(bookingsRes?.data?.data?.bookings || []);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loading fullScreen message="Loading dashboard..." />;

  // ── No profile yet — prompt to create one ──
  if (!hasProfile) {
    return (
      <div className="dashboard-setup">
        <div className="setup-card">
          <AlertCircle size={48} className="setup-icon" />
          <h2>Set Up Your Vendor Profile</h2>
          <p>
            Welcome, {user?.name || 'Vendor'}! You need to create your vendor profile
            before you can receive bookings and manage services.
          </p>
          <Link to="/vendor/profile" className="btn btn-primary">
            Create Profile <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const approvedCount = bookings.filter((b) => b.status === 'approved').length;

  const verificationBanner = vendor.verificationStatus === 'pending' && (
    <div className="alert alert-warning dashboard-alert">
      <Clock size={16} />
      <span>Your profile is pending admin verification. You won&apos;t appear in public listings until approved.</span>
    </div>
  );

  const rejectedBanner = vendor.verificationStatus === 'rejected' && (
    <div className="alert alert-danger dashboard-alert">
      <AlertCircle size={16} />
      <span>
        Your profile was rejected.
        {vendor.rejectionReason ? ` Reason: ${vendor.rejectionReason}` : ' Please update your profile and contact support.'}
      </span>
    </div>
  );

  return (
    <div className="vendor-dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Welcome back, {vendor.businessName}</p>
        </div>
        <div className="header-actions">
          <Link to="/vendor/services" className="btn btn-outline btn-sm">
            <Package size={14} /> Manage Services
          </Link>
        </div>
      </div>

      {verificationBanner}
      {rejectedBanner}

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-pink">
            <CalendarCheck size={20} />
          </div>
          <div>
            <span className="stat-label">Total Bookings</span>
            <span className="stat-value">{vendor.totalBookings || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <Clock size={20} />
          </div>
          <div>
            <span className="stat-label">Pending</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="stat-label">Approved</span>
            <span className="stat-value">{approvedCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Eye size={20} />
          </div>
          <div>
            <span className="stat-label">Profile Views</span>
            <span className="stat-value">{vendor.profileViews || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <Star size={20} />
          </div>
          <div>
            <span className="stat-label">Rating</span>
            <span className="stat-value">
              {vendor.ratingsAverage > 0 ? `${vendor.ratingsAverage}/5` : 'N/A'}
            </span>
            {vendor.ratingsCount > 0 && (
              <span className="stat-sub">({vendor.ratingsCount} reviews)</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="stat-label">Profile Completeness</span>
            <span className="stat-value">{vendor.profileCompleteness || 0}%</span>
          </div>
        </div>
      </div>

      {/* ── Quick info row ── */}
      <div className="dashboard-row">
        {/* Recent bookings */}
        <div className="card dashboard-card">
          <div className="card-header">
            <h3>Recent Bookings</h3>
            <Link to="/vendor/bookings" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="empty-state">
              <CalendarCheck size={32} className="empty-icon" />
              <p>No bookings yet. They will appear here once customers find you.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={b._id}>
                        <td>{b.user?.name || b.user?.email || '—'}</td>
                        <td className="capitalize">{b.eventType}</td>
                        <td>{formatDate(b.eventDate)}</td>
                        <td>{formatPrice(b.agreedPrice)}</td>
                        <td>
                          <span className={`badge ${cfg.className}`}>{cfg.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Packages overview */}
        <div className="card dashboard-card dashboard-card-narrow">
          <div className="card-header">
            <h3>Your Packages</h3>
            <Link to="/vendor/services" className="btn btn-ghost btn-sm">
              Manage <ArrowRight size={14} />
            </Link>
          </div>

          {(!vendor.packages || vendor.packages.length === 0) ? (
            <div className="empty-state">
              <Package size={32} className="empty-icon" />
              <p>No packages yet.</p>
              <Link to="/vendor/services" className="btn btn-primary btn-sm">
                Add Package
              </Link>
            </div>
          ) : (
            <ul className="package-list">
              {vendor.packages.slice(0, 4).map((pkg) => (
                <li key={pkg._id} className="package-item">
                  <div>
                    <span className="package-name">{pkg.name}</span>
                    {!pkg.isActive && <span className="badge badge-neutral">Inactive</span>}
                  </div>
                  <span className="package-price">{formatPrice(pkg.price)}</span>
                </li>
              ))}
              {vendor.packages.length > 4 && (
                <li className="package-more">
                  +{vendor.packages.length - 4} more packages
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;
