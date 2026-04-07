import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingAPI } from '../../api/bookings';
import { paymentAPI } from '../../api/payments';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  Loader2,
  Sparkles,
  Search,
} from 'lucide-react';
import './UserBookings.css';

/* -- Config ----------------------------------------------- */
const STATUS_CFG = {
  pending:   { label: 'Pending',   cls: 'ub-badge--warn',    Icon: Clock        },
  approved:  { label: 'Awaiting Payment', cls: 'ub-badge--warn', Icon: AlertTriangle },
  booked:    { label: 'Booked',    cls: 'ub-badge--success', Icon: CheckCircle2 },
  completed: { label: 'Completed', cls: 'ub-badge--info',    Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', cls: 'ub-badge--danger',  Icon: XCircle      },
  rejected:  { label: 'Rejected',  cls: 'ub-badge--danger',  Icon: XCircle      },
};

/** Derive display status: approved+paid → 'booked', otherwise raw status */
const getDisplayStatus = (b) => {
  if (b.status === 'approved' && b.paymentStatus === 'paid') return 'booked';
  return b.status;
};

const PAYMENT_CFG = {
  unpaid:   { label: 'Unpaid',    cls: 'ub-pay--warn'    },
  partial:  { label: 'Partial',   cls: 'ub-pay--partial' },
  paid:     { label: 'Paid',      cls: 'ub-pay--success' },
  refunded: { label: 'Refunded',  cls: 'ub-pay--info'    },
};

const FILTERS = ['all', 'pending', 'approved', 'completed', 'cancelled'];

/* -- Helpers ---------------------------------------------- */
const fmtDate = (ds) =>
  new Date(ds).toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0);

/* -- Cancel Modal (portal) -------------------------------- */
function CancelModal({ onConfirm, onClose }) {
  return createPortal(
    <div className="ub-overlay" onClick={onClose}>
      <div className="ub-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ub-modal-icon-wrap">
          <AlertTriangle size={26} />
        </div>
        <h3 className="ub-modal-title">Cancel Booking?</h3>
        <p className="ub-modal-body">
          Are you sure you want to cancel this booking request?
          This action <strong>cannot be undone</strong>.
        </p>
        <div className="ub-modal-actions">
          <button className="ub-btn ub-btn--ghost" onClick={onClose}>Keep Booking</button>
          <button className="ub-btn ub-btn--danger" onClick={onConfirm}>Yes, Cancel It</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* -- Main component --------------------------------------- */
const UserBookings = () => {
  const [bookings, setBookings]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [cancelModal, setCancelModal]   = useState({ open: false, bookingId: null });
  const [payingId, setPayingId]         = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingAPI.getMyBookings();
      setBookings(res.data.data.bookings || []);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    const status = searchParams.get('payment');
    if (status === 'success') {
      toast.success('Payment successful! Your booking is confirmed.', { duration: 5000 });
      fetchBookings();
    } else if (status === 'cancelled') {
      toast.error('Payment was cancelled. You can try again anytime.', { duration: 5000 });
    }
    if (status) {
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCancel = async () => {
    if (!cancelModal.bookingId) return;
    try {
      await bookingAPI.cancel(cancelModal.bookingId, { reason: 'User cancelled' });
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelModal({ open: false, bookingId: null });
    }
  };

  const handlePayNow = async (bookingId) => {
    try {
      setPayingId(bookingId);
      const res = await paymentAPI.createCheckout(bookingId);
      const { url } = res.data.data;
      if (url) window.location.href = url;
      else toast.error('Could not create payment session. Please try again.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <Loading fullScreen message="Loading bookings…" />;

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? bookings.length : bookings.filter((b) => b.status === f).length;
    return acc;
  }, {});

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="ub-page">

      {/* Hero */}
      <div className="ub-hero">
        <div className="ub-hero-glow" />
        <div className="ub-hero-body">
          <div className="ub-hero-icon"><Calendar size={22} /></div>
          <div>
            <h1 className="ub-title">My Bookings</h1>
            <p className="ub-subtitle">Track and manage all your vendor bookings</p>
          </div>
        </div>
        <div className="ub-hero-count">
          <span className="ub-hero-count-num">{bookings.length}</span>
          <span className="ub-hero-count-lbl">Total</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="ub-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`ub-filter ${filter === f ? 'ub-filter--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {counts[f] > 0 && <span className="ub-filter-count">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="ub-list">
        {filtered.length > 0 ? filtered.map((b) => {
          const displayStatus = getDisplayStatus(b);
          const scfg = STATUS_CFG[displayStatus] || STATUS_CFG.pending;
          const pcfg = PAYMENT_CFG[b.paymentStatus] || PAYMENT_CFG.unpaid;
          const { Icon: SIcon } = scfg;
          const initial = (b.vendor?.businessName || '?')[0].toUpperCase();

          return (
            <div key={b._id} className={`ub-card ub-card--${b.status}`}>
              <div className={`ub-card-accent ub-accent--${b.status}`} />

              <div className="ub-card-main">
                {/* Top row */}
                <div className="ub-card-top">
                  <div className="ub-vendor-row">
                    <div className={`ub-vendor-avatar ub-avatar--${b.status}`}>{initial}</div>
                    <div>
                      <span className="ub-vendor-name">{b.vendor?.businessName || 'Unknown Vendor'}</span>
                      {b.vendor?.category && (
                        <span className="ub-vendor-cat">{b.vendor.category.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="ub-badges">
                    <span className={`ub-badge ${scfg.cls}`}><SIcon size={11} />{scfg.label}</span>
                    <span className={`ub-pay-badge ${pcfg.cls}`}><CreditCard size={11} />{pcfg.label}</span>
                  </div>
                </div>

                {/* Detail chips */}
                <div className="ub-details">
                  <span className="ub-detail"><Calendar size={13} />{fmtDate(b.eventDate)}</span>
                  <span className="ub-detail"><Users size={13} />{b.guestCount || 0} guests</span>
                  <span className="ub-detail"><DollarSign size={13} />{fmtCurrency(b.agreedPrice || b.totalAmount)}</span>
                  {b.vendor?.city && <span className="ub-detail"><MapPin size={13} />{b.vendor.city}</span>}
                </div>

                {/* Actions */}
                <div className="ub-actions">
                  <Link
                    to={`/user/vendors/${b.vendor?.slug || b.vendor?._id}`}
                    className="ub-btn ub-btn--ghost"
                  >
                    <ExternalLink size={14} /> View Vendor
                  </Link>

                  {b.status === 'approved' && b.paymentStatus === 'unpaid' && (
                    <button
                      className="ub-btn ub-btn--pay"
                      onClick={() => handlePayNow(b._id)}
                      disabled={payingId === b._id}
                    >
                      {payingId === b._id
                        ? <><Loader2 size={14} className="ub-spin" /> Processing…</>
                        : <><CreditCard size={14} /> Pay Now</>}
                    </button>
                  )}

                  {b.status === 'pending' && (
                    <button
                      className="ub-btn ub-btn--cancel"
                      onClick={() => setCancelModal({ open: true, bookingId: b._id })}
                    >
                      <XCircle size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="ub-empty">
            <div className="ub-empty-icon"><Search size={28} /></div>
            <p className="ub-empty-title">No bookings found</p>
            <p className="ub-empty-sub">
              {filter === 'all'
                ? "You haven't made any bookings yet."
                : `No ${filter} bookings at the moment.`}
            </p>
            <Link to="/user/vendors" className="ub-btn ub-btn--primary">
              <Sparkles size={14} /> Browse Vendors
            </Link>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelModal.open && (
        <CancelModal
          onConfirm={handleCancel}
          onClose={() => setCancelModal({ open: false, bookingId: null })}
        />
      )}
    </div>
  );
};

export default UserBookings;
