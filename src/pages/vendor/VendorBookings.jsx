import { useState, useEffect, useCallback } from 'react';
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
  Filter,
  User,
  MapPin,
  Users,
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
  pending: { label: 'Pending', className: 'badge-warning' },
  approved: { label: 'Approved', className: 'badge-success' },
  rejected: { label: 'Rejected', className: 'badge-danger' },
  completed: { label: 'Completed', className: 'badge-info' },
  cancelled: { label: 'Cancelled', className: 'badge-neutral' },
};

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
  if (!price && price !== 0) return '—';
  return `PKR ${price.toLocaleString('en-PK')}`;
};

function VendorBookings() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Respond modal
  const [respondTarget, setRespondTarget] = useState(null);
  const [respondAction, setRespondAction] = useState(''); // 'approved' | 'rejected'
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

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  // ── Respond to booking ──
  const openRespond = (booking, action) => {
    setRespondTarget(booking);
    setRespondAction(action);
    setRespondMessage('');
  };

  const closeRespond = () => {
    setRespondTarget(null);
    setRespondAction('');
    setRespondMessage('');
  };

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
      await fetchBookings(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update booking';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel booking ──
  const handleCancel = async (booking) => {
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return;

    try {
      await bookingAPI.cancel(booking._id, { reason: 'Cancelled by vendor' });
      toast.success('Booking cancelled');
      await fetchBookings(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  return (
    <div className="vendor-bookings">
      <div className="page-header">
        <div>
          <h1>Bookings</h1>
          <p className="page-subtitle">{pagination.total} total bookings</p>
        </div>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="filter-tabs">
        <Filter size={14} className="filter-icon" />
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`filter-tab ${statusFilter === tab.value ? 'filter-tab-active' : ''}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <Loading message="Loading bookings..." />
      ) : bookings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CalendarCheck size={48} className="empty-icon" />
            <h3>No bookings found</h3>
            <p>
              {statusFilter
                ? `No ${statusFilter} bookings. Try a different filter.`
                : 'You have no bookings yet. They will appear here when customers book your services.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bookings-list">
            {bookings.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              const isPending = b.status === 'pending';
              const canCancel = ['pending', 'approved'].includes(b.status);

              return (
                <div key={b._id} className="booking-card card">
                  <div className="booking-card-top">
                    <div className="booking-info">
                      <div className="booking-customer">
                        <User size={14} />
                        <strong>{b.user?.name || b.user?.email || 'Customer'}</strong>
                      </div>
                      <span className={`badge ${cfg.className}`}>{cfg.label}</span>
                    </div>

                    <div className="booking-meta">
                      <span className="booking-meta-item capitalize">
                        <CalendarCheck size={14} />
                        {b.eventType} &mdash; {formatDate(b.eventDate)}
                      </span>
                      {b.eventLocation && (
                        <span className="booking-meta-item">
                          <MapPin size={14} /> {b.eventLocation}
                        </span>
                      )}
                      {b.guestCount > 0 && (
                        <span className="booking-meta-item">
                          <Users size={14} /> {b.guestCount} guests
                        </span>
                      )}
                    </div>

                    {b.packageName && (
                      <div className="booking-package">
                        Package: <strong>{b.packageName}</strong>
                        {b.agreedPrice > 0 && <span> &mdash; {formatPrice(b.agreedPrice)}</span>}
                      </div>
                    )}

                    {b.notes && (
                      <div className="booking-notes">
                        <MessageSquare size={13} />
                        <span>{b.notes}</span>
                      </div>
                    )}

                    {b.vendorResponse?.message && (
                      <div className="booking-response">
                        <strong>Your response:</strong> {b.vendorResponse.message}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="booking-actions">
                    <span className="booking-date-label">
                      Received {formatDate(b.createdAt)}
                    </span>
                    <div className="booking-btns">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: 'var(--success)', color: '#fff' }}
                            onClick={() => openRespond(b, 'approved')}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => openRespond(b, 'rejected')}
                          >
                            <X size={14} /> Reject
                          </button>
                        </>
                      )}
                      {canCancel && !isPending && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => handleCancel(b)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchBookings(pagination.page - 1)}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchBookings(pagination.page + 1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Respond modal ── */}
      {respondTarget && (
        <div className="modal-backdrop" onClick={closeRespond}>
          <div className="modal-content respond-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{respondAction === 'approved' ? 'Approve Booking' : 'Reject Booking'}</h2>
              <button type="button" className="modal-close" onClick={closeRespond}>
                <X size={18} />
              </button>
            </div>

            <div className="respond-summary">
              <p>
                <strong>Customer:</strong> {respondTarget.user?.name || respondTarget.user?.email}
              </p>
              <p>
                <strong>Event:</strong> {respondTarget.eventType} on {formatDate(respondTarget.eventDate)}
              </p>
              {respondTarget.agreedPrice > 0 && (
                <p><strong>Price:</strong> {formatPrice(respondTarget.agreedPrice)}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="respondMsg">
                Message to customer {respondAction === 'rejected' ? '(recommended)' : '(optional)'}
              </label>
              <textarea
                id="respondMsg"
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

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={closeRespond}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${respondAction === 'approved' ? '' : 'btn-danger'}`}
                style={respondAction === 'approved' ? { background: 'var(--success)', color: '#fff' } : undefined}
                onClick={handleRespond}
                disabled={submitting}
              >
                {submitting
                  ? 'Processing...'
                  : respondAction === 'approved'
                    ? 'Approve'
                    : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorBookings;
