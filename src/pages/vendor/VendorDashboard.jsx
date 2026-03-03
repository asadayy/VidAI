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
  MapPin,
  BadgeCheck,
  Sparkles,
  ChevronRight,
  Ban,
} from 'lucide-react';
import './VendorDashboard.css';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   accent: '#F59E0B', bg: '#FFFBEB', textColor: '#92400E' },
  approved:  { label: 'Approved',  accent: '#10B981', bg: '#ECFDF5', textColor: '#065F46' },
  rejected:  { label: 'Rejected',  accent: '#EF4444', bg: '#FEF2F2', textColor: '#991B1B' },
  completed: { label: 'Completed', accent: '#6366F1', bg: '#EEF2FF', textColor: '#3730A3' },
  cancelled: { label: 'Cancelled', accent: '#9CA3AF', bg: '#F9FAFB', textColor: '#4B5563' },
};

const STAT_CARDS = [
  { key: 'totalBookings',      label: 'Total Bookings',      icon: CalendarCheck, color: '#D7385E', bg: '#fdf2f5' },
  { key: 'pendingCount',       label: 'Pending',             icon: Clock,         color: '#F59E0B', bg: '#fffbeb' },
  { key: 'approvedCount',      label: 'Confirmed',           icon: CheckCircle2,  color: '#10B981', bg: '#ecfdf5' },
  { key: 'profileViews',       label: 'Profile Views',       icon: Eye,           color: '#6366F1', bg: '#eef2ff' },
  { key: 'ratingsAverage',     label: 'Avg. Rating',         icon: Star,          color: '#F97316', bg: '#fff7ed' },
  { key: 'profileCompleteness',label: 'Completeness',        icon: TrendingUp,    color: '#8B5CF6', bg: '#f5f3ff' },
];

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

  // ── No profile yet ──
  if (!hasProfile) {
    return (
      <div className="vd-setup">
        <div className="vd-setup-card">
          <div className="vd-setup-icon">
            <Sparkles size={32} />
          </div>
          <h2>Set Up Your Vendor Profile</h2>
          <p>
            Welcome, {user?.name || 'Vendor'}! Create your vendor profile to start receiving
            bookings and showcasing your services.
          </p>
          <div className="vd-setup-steps">
            {['Add business details', 'Upload portfolio photos', 'Set your packages & pricing'].map((s, i) => (
              <div key={i} className="vd-setup-step">
                <span className="vd-setup-num">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <Link to="/vendor/onboarding" className="btn btn-primary">
            Complete Setup <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount  = bookings.filter((b) => b.status === 'pending').length;
  const approvedCount = bookings.filter((b) => b.status === 'approved').length;
  const completeness  = vendor.profileCompleteness || 0;

  const statValues = {
    totalBookings:       vendor.totalBookings || 0,
    pendingCount,
    approvedCount,
    profileViews:        vendor.profileViews || 0,
    ratingsAverage:      vendor.ratingsAverage > 0 ? `${vendor.ratingsAverage}` : '—',
    profileCompleteness: `${completeness}%`,
  };

  const statSub = {
    ratingsAverage:      vendor.ratingsCount > 0 ? `${vendor.ratingsCount} reviews` : null,
    profileCompleteness: completeness < 100 ? 'Complete your profile' : 'All done!',
  };

  return (
    <div className="vd-page">
      {/* ── Hero header ── */}
      <div className="vd-header">
        <div className="vd-header-left">
          <div className="vd-avatar-wrap">
            {vendor.profileImage
              ? <img src={vendor.profileImage} alt="" className="vd-avatar-img" />
              : <span className="vd-avatar-initials">{(vendor.businessName || 'V')[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <div className="vd-header-name-row">
              <h1 className="vd-title">{vendor.businessName}</h1>
              {vendor.verificationStatus === 'approved' && (
                <span className="vd-verified-badge"><BadgeCheck size={15} /> Verified</span>
              )}
            </div>
            <div className="vd-header-meta">
              {vendor.category && <span className="vd-meta-chip">{vendor.category}</span>}
              {vendor.city && (
                <span className="vd-meta-chip">
                  <MapPin size={11} /> {vendor.city}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="vd-header-actions">
          <Link to="/vendor/profile" className="vd-hdr-btn vd-hdr-btn--outline">
            Edit Profile
          </Link>
          <Link to="/vendor/services" className="vd-hdr-btn vd-hdr-btn--primary">
            <Package size={14} /> Services
          </Link>
        </div>
      </div>

      {/* ── Verification banners ── */}
      {vendor.verificationStatus === 'pending' && (
        <div className="vd-banner vd-banner--warning">
          <Clock size={15} />
          <span>Profile pending admin verification — you won&apos;t appear in public listings until approved.</span>
        </div>
      )}
      {vendor.verificationStatus === 'rejected' && (
        <div className="vd-banner vd-banner--danger">
          <Ban size={15} />
          <span>
            Your profile was rejected.
            {vendor.rejectionReason ? ` Reason: ${vendor.rejectionReason}` : ' Please update your profile and contact support.'}
          </span>
          <Link to="/vendor/profile" className="vd-banner-link">Fix now →</Link>
        </div>
      )}

      {/* ── Profile completeness bar ── */}
      {completeness < 100 && (
        <div className="vd-completeness">
          <div className="vd-completeness-header">
            <span className="vd-completeness-label">
              <TrendingUp size={13} /> Profile completeness — {completeness}%
            </span>
            <Link to="/vendor/profile" className="vd-completeness-link">Complete it →</Link>
          </div>
          <div className="vd-completeness-track">
            <div className="vd-completeness-fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="vd-stat-grid">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="vd-stat-card">
            <div className="vd-stat-icon" style={{ background: bg, color }}>
              <Icon size={20} />
            </div>
            <div className="vd-stat-body">
              <span className="vd-stat-label">{label}</span>
              <span className="vd-stat-value" style={{ color }}>
                {statValues[key]}
              </span>
              {statSub[key] && <span className="vd-stat-sub">{statSub[key]}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content row ── */}
      <div className="vd-content-row">

        {/* Recent bookings */}
        <div className="vd-panel">
          <div className="vd-panel-header">
            <span className="vd-panel-title">
              <CalendarCheck size={16} /> Recent Bookings
            </span>
            <Link to="/vendor/bookings" className="vd-panel-link">
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="vd-empty">
              <div className="vd-empty-icon"><CalendarCheck size={28} /></div>
              <p>No bookings yet. Customers will appear here once they find you.</p>
            </div>
          ) : (
            <div className="vd-booking-list">
              {bookings.map((b) => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                const initials = (b.user?.name || b.user?.email || 'U')
                  .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
                return (
                  <div key={b._id} className="vd-booking-row" style={{ '--row-accent': cfg.accent }}>
                    <div className="vd-booking-avatar">{initials}</div>
                    <div className="vd-booking-info">
                      <span className="vd-booking-name">{b.user?.name || b.user?.email || '—'}</span>
                      <span className="vd-booking-meta capitalize">
                        {b.eventType} &nbsp;·&nbsp; {formatDate(b.eventDate)}
                      </span>
                    </div>
                    <div className="vd-booking-right">
                      {b.agreedPrice > 0 && (
                        <span className="vd-booking-price">{formatPrice(b.agreedPrice)}</span>
                      )}
                      <span className="vd-booking-badge" style={{ background: cfg.bg, color: cfg.textColor }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Packages */}
        <div className="vd-panel vd-panel--narrow">
          <div className="vd-panel-header">
            <span className="vd-panel-title">
              <Package size={16} /> Packages
            </span>
            <Link to="/vendor/services" className="vd-panel-link">
              Manage <ChevronRight size={14} />
            </Link>
          </div>

          {(!vendor.packages || vendor.packages.length === 0) ? (
            <div className="vd-empty">
              <div className="vd-empty-icon"><Package size={28} /></div>
              <p>No packages yet. Add your first to attract bookings.</p>
              <Link to="/vendor/services" className="vd-add-btn">
                + Add Package
              </Link>
            </div>
          ) : (
            <ul className="vd-pkg-list">
              {vendor.packages.slice(0, 5).map((pkg) => (
                <li key={pkg._id} className="vd-pkg-item">
                  <div className="vd-pkg-dot" style={{ background: pkg.isActive ? '#10B981' : '#9CA3AF' }} />
                  <span className="vd-pkg-name">{pkg.name}</span>
                  {!pkg.isActive && <span className="vd-pkg-inactive">Off</span>}
                  <span className="vd-pkg-price">{formatPrice(pkg.price)}</span>
                </li>
              ))}
              {vendor.packages.length > 5 && (
                <li className="vd-pkg-more">
                  +{vendor.packages.length - 5} more
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
