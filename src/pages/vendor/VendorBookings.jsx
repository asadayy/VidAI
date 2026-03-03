import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { bookingAPI } from '../../api/bookings';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  CalendarCheck,
  Check,
  X,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Clock,
  PackageCheck,
  BadgeCheck,
  Ban,
  CircleCheck,
  CircleDot,
  DollarSign,
} from 'lucide-react';
import './VendorBookings.css';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   accent: '#F59E0B', bg: '#FFFBEB', textColor: '#92400E' },
  approved:  { label: 'Approved',  accent: '#10B981', bg: '#ECFDF5', textColor: '#065F46' },
  rejected:  { label: 'Rejected',  accent: '#EF4444', bg: '#FEF2F2', textColor: '#991B1B' },
  completed: { label: 'Completed', accent: '#6366F1', bg: '#EEF2FF', textColor: '#3730A3' },
  cancelled: { label: 'Cancelled', accent: '#9CA3AF', bg: '#F9FAFB', textColor: '#4B5563' },
};

const STATUS_ICON = {
  pending:   <CircleDot   size={13} />,
  approved:  <BadgeCheck  size={13} />,
  rejected:  <Ban         size={13} />,
  completed: <CircleCheck size={13} />,
  cancelled: <X           size={13} />,
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

function StatCard({ label, value, accent }) {
  return (
    <div className="vb-stat" style={{ '--accent': accent }}>
      <span className="vb-stat-value">{value}</span>
      <span className="vb-stat-label">{label}</span>
    </div>
  );
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatPrice = (price) => {
  if (!price && price !== 0) return null;
  return `PKR ${price.toLocaleString('en-PK')}`;
};

function BookingCard({ booking: b, onApprove, onReject, onCancel }) {
  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
  const isPending = b.status === 'pending';
  const canCancel = ['pending', 'approved'].includes(b.status);
  const initials = (b.user?.name || b.user?.email || 'U')
    .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
  const price = formatPrice(b.agreedPrice);

  return (
    <div className="vb-card" style={{ '--card-accent': cfg.accent }}>
      <div className="vb-card-strip" />
      <div className="vb-card-body">
        <div className="vb-card-head">
          <div className="vb-customer">
            <div className="vb-avatar">{initials}</div>
            <div className="vb-customer-info">
              <span className="vb-customer-name">
                {b.user?.name || b.user?.email || 'Customer'}
              </span>
              {b.user?.email && b.user?.name && (
                <span className="vb-customer-email">{b.user.email}</span>
              )}
            </div>
          </div>
          <span className="vb-badge" style={{ background: cfg.bg, color: cfg.textColor }}>
            {STATUS_ICON[b.status]}
            {cfg.label}
          </span>
        </div>

        <div className="vb-meta-row">
          <span className="vb-meta-item capitalize">
            <CalendarCheck size={13} />
            {b.eventType} &mdash; {formatDate(b.eventDate)}
          </span>
          {b.eventLocation && (
            <span className="vb-meta-item">
              <MapPin size={13} /> {b.eventLocation}
            </span>
          )}
          {b.guestCount > 0 && (
            <span className="vb-meta-item">
              <Users size={13} /> {b.guestCount} guests
            </span>
          )}
          {price && (
            <span className="vb-meta-item vb-price">
              <DollarSign size={13} /> {price}
            </span>
          )}
        </div>

        {b.packageName && (
          <div className="vb-package">
            <PackageCheck size={13} />
            <span><strong>{b.packageName}</strong></span>
          </div>
        )}

        {b.notes && (
          <div className="vb-notes">
            <MessageSquare size={12} />
            <span>{b.notes}</span>
          </div>
        )}

        {b.vendorResponse?.message && (
          <div className="vb-response">
            <strong>Your reply:</strong> {b.vendorResponse.message}
          </div>
        )}

        <div className="vb-card-footer">
          <span className="vb-received">
            <Clock size={12} />
            Received {formatDate(b.createdAt)}
          </span>
          <div className="vb-actions">
            {isPending && (
              <>
                <button type="button" className="vb-btn vb-btn-approve" onClick={() => onApprove(b)}>
                  <Check size={13} /> Approve
                </button>
                <button type="button" className="vb-btn vb-btn-reject" onClick={() => onReject(b)}>
                  <X size={13} /> Reject
                </button>
              </>
            )}
            {canCancel && !isPending && (
              <button type="button" className="vb-btn vb-btn-cancel" onClick={() => onCancel(b)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorBookings() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [allStats, setAllStats] = useState({});

  const [respondTarget, setRespondTarget] = useState(null);
  const [respondAction, setRespondAction] = useState('');
  const [respondMessage, setRespondMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await bookingAPI.getVendorBookings(params);
      setBookings(data.data.bookings);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const counts = {};
      await Promise.all(
        ['pending', 'approved', 'completed'].map(async (s) => {
          const { data } = await bookingAPI.getVendorBookings({ page: 1, limit: 1, status: s });
          counts[s] = data.data.pagination.total;
        })
      );
      setAllStats(counts);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchBookings(1); }, [fetchBookings]);

  const openApprove  = (b) => { setRespondTarget(b); setRespondAction('approved'); setRespondMessage(''); };
  const openReject   = (b) => { setRespondTarget(b); setRespondAction('rejected'); setRespondMessage(''); };
  const closeRespond = () => { setRespondTarget(null); setRespondAction(''); setRespondMessage(''); };

  const handleRespond = async () => {
    if (!respondTarget || !respondAction) return;
    setSubmitting(true);
    try {
      await bookingAPI.updateStatus(respondTarget._id, {
        status: respondAction,
        message: respondMessage.trim(),
      });
      toast.success(`Booking ${respondAction === 'approved' ? 'approved' : 'rejected'}`);
      closeRespond();
      fetchStats();
      await fetchBookings(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return;
    try {
      await bookingAPI.cancel(booking._id, { reason: 'Cancelled by vendor' });
      toast.success('Booking cancelled');
      fetchStats();
      await fetchBookings(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  return (
    <div className="vb-page">
      {/* Page header with stats */}
      <div className="vb-page-header">
        <div className="vb-header-text">
          <h1 className="vb-title">Bookings</h1>
          <p className="vb-subtitle">{pagination.total} total booking{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        <div className="vb-stats">
          <StatCard label="Pending"   value={allStats.pending   ?? '—'} accent="#F59E0B" />
          <StatCard label="Approved"  value={allStats.approved  ?? '—'} accent="#10B981" />
          <StatCard label="Completed" value={allStats.completed ?? '—'} accent="#6366F1" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="vb-filter-bar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`vb-tab ${statusFilter === tab.value ? 'vb-tab--active' : ''}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.value && STATUS_ICON[tab.value]}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading message="Loading bookings..." />
      ) : bookings.length === 0 ? (
        <div className="vb-empty">
          <div className="vb-empty-icon"><CalendarCheck size={40} /></div>
          <h3>No bookings found</h3>
          <p>
            {statusFilter
              ? `No ${statusFilter} bookings yet. Try a different filter.`
              : 'Bookings will appear here once customers reserve your services.'}
          </p>
        </div>
      ) : (
        <>
          <div className="vb-list">
            {bookings.map((b) => (
              <BookingCard
                key={b._id}
                booking={b}
                onApprove={openApprove}
                onReject={openReject}
                onCancel={handleCancel}
              />
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="vb-pagination">
              <button
                type="button"
                className="vb-page-btn"
                disabled={pagination.page <= 1}
                onClick={() => fetchBookings(pagination.page - 1)}
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <span className="vb-page-info">Page {pagination.page} of {pagination.pages}</span>
              <button
                type="button"
                className="vb-page-btn"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchBookings(pagination.page + 1)}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Respond modal via portal */}
      {respondTarget && createPortal(
        <div className="vb-modal-backdrop" onClick={closeRespond}>
          <div
            className={`vb-modal ${respondAction === 'approved' ? 'vb-modal--approve' : 'vb-modal--reject'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vb-modal-header">
              <div className={`vb-modal-icon ${respondAction === 'approved' ? 'vb-modal-icon--approve' : 'vb-modal-icon--reject'}`}>
                {respondAction === 'approved' ? <Check size={18} /> : <X size={18} />}
              </div>
              <div>
                <h2 className="vb-modal-title">
                  {respondAction === 'approved' ? 'Approve Booking' : 'Reject Booking'}
                </h2>
                <p className="vb-modal-sub">Review the details before responding</p>
              </div>
              <button type="button" className="vb-modal-close" onClick={closeRespond}>
                <X size={17} />
              </button>
            </div>

            <div className="vb-modal-summary">
              <div className="vb-summary-row">
                <span className="vb-summary-label">Customer</span>
                <span className="vb-summary-val">{respondTarget.user?.name || respondTarget.user?.email}</span>
              </div>
              <div className="vb-summary-row">
                <span className="vb-summary-label">Event</span>
                <span className="vb-summary-val capitalize">{respondTarget.eventType} &mdash; {formatDate(respondTarget.eventDate)}</span>
              </div>
              {respondTarget.eventLocation && (
                <div className="vb-summary-row">
                  <span className="vb-summary-label">Location</span>
                  <span className="vb-summary-val">{respondTarget.eventLocation}</span>
                </div>
              )}
              {respondTarget.agreedPrice > 0 && (
                <div className="vb-summary-row">
                  <span className="vb-summary-label">Price</span>
                  <span className="vb-summary-val">{formatPrice(respondTarget.agreedPrice)}</span>
                </div>
              )}
            </div>

            <div className="vb-modal-field">
              <label htmlFor="respondMsg" className="vb-modal-label">
                Message to customer
                <span className="vb-modal-label-hint">
                  {respondAction === 'rejected' ? '(recommended)' : '(optional)'}
                </span>
              </label>
              <textarea
                id="respondMsg"
                className="vb-modal-textarea"
                rows={3}
                placeholder={
                  respondAction === 'approved'
                    ? 'e.g. Looking forward to working with you!'
                    : 'e.g. Sorry, we are fully booked on that date.'
                }
                value={respondMessage}
                onChange={(e) => setRespondMessage(e.target.value)}
              />
            </div>

            <div className="vb-modal-actions">
              <button type="button" className="vb-modal-btn vb-modal-btn--cancel" onClick={closeRespond}>
                Cancel
              </button>
              <button
                type="button"
                className={`vb-modal-btn ${respondAction === 'approved' ? 'vb-modal-btn--approve' : 'vb-modal-btn--reject'}`}
                onClick={handleRespond}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : respondAction === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default VendorBookings;
