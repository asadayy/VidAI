import React, { useState, useEffect } from 'react';
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
  MoreVertical,
  XCircle,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  Loader2
} from 'lucide-react';
import './UserBookings.css';

const UserBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cancelModal, setCancelModal] = useState({ open: false, bookingId: null });
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingAPI.getMyBookings();
      setBookings(response.data.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Handle payment success/cancelled query params from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your booking is confirmed.', { duration: 5000 });
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
      fetchBookings(); // Refresh to show updated payment status
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled. You can try again anytime.', { duration: 5000 });
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCancelBooking = async () => {
    if (!cancelModal.bookingId) return;

    try {
      await bookingAPI.cancel(cancelModal.bookingId, { reason: 'User cancelled' });
      toast.success('Booking cancelled successfully');
      fetchBookings(); // Refresh list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelModal({ open: false, bookingId: null });
    }
  };

  const handlePayNow = async (bookingId) => {
    try {
      setPayingBookingId(bookingId);
      const response = await paymentAPI.createCheckout(bookingId);
      const { url } = response.data.data;
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout
      } else {
        toast.error('Could not create payment session. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      const msg = error.response?.data?.message || 'Failed to initiate payment';
      toast.error(msg);
    } finally {
      setPayingBookingId(null);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', icon: Clock, className: 'badge-warning' },
      approved: { label: 'Approved', icon: CheckCircle, className: 'badge-success' },
      rejected: { label: 'Rejected', icon: XCircle, className: 'badge-danger' },
      cancelled: { label: 'Cancelled', icon: XCircle, className: 'badge-danger' },
      completed: { label: 'Completed', icon: CheckCircle, className: 'badge-info' }
    };
    const { label, icon: Icon, className } = config[status] || config.pending;

    return (
      <span className={`status-badge ${className}`}>
        <Icon size={14} />
        {label}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    const config = {
      unpaid: { label: 'Unpaid', className: 'payment-unpaid' },
      partial: { label: 'Partial', className: 'payment-partial' },
      paid: { label: 'Paid', className: 'payment-paid' },
      refunded: { label: 'Refunded', className: 'payment-refunded' },
    };
    const { label, className } = config[paymentStatus] || config.unpaid;

    return (
      <span className={`payment-badge ${className}`}>
        <CreditCard size={13} />
        {label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) return <Loading fullScreen message="Loading bookings..." />;

  return (
    <div className="user-bookings-page">
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>Manage and track all your vendor bookings</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['all', 'pending', 'approved', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            className={`filter-tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="bookings-container">
        {filteredBookings.length > 0 ? (
          filteredBookings.map(booking => (
            <div key={booking._id} className="booking-card">
              <div className="booking-header">
                <div className="vendor-info">
                  <h3>{booking.vendor?.businessName || 'Unknown Vendor'}</h3>
                  <span className="service-type">{booking.vendor?.vendorType}</span>
                </div>
                <div className="booking-badges">
                  {getStatusBadge(booking.status)}
                  {getPaymentBadge(booking.paymentStatus)}
                </div>
              </div>

              <div className="booking-details">
                <div className="detail-item">
                  <Calendar size={18} />
                  <span>{formatDate(booking.eventDate)}</span>
                </div>
                <div className="detail-item">
                  <Users size={18} />
                  <span>{booking.guestCount || 0} Guests</span>
                </div>
                <div className="detail-item">
                  <DollarSign size={18} />
                  <span>{formatCurrency(booking.agreedPrice || booking.totalAmount)}</span>
                </div>
                {booking.vendor?.location && (
                  <div className="detail-item">
                    <MapPin size={18} />
                    <span>{booking.vendor.location.city}</span>
                  </div>
                )}
              </div>

              <div className="booking-actions">
                <Link to={`/vendors/${booking.vendor?._id}`} className="btn-secondary">
                  <ExternalLink size={16} />
                  View Vendor
                </Link>
                
                {/* Pay Now — only for approved bookings that are unpaid */}
                {booking.status === 'approved' && booking.paymentStatus === 'unpaid' && (
                  <button 
                    className="btn-pay-now"
                    onClick={() => handlePayNow(booking._id)}
                    disabled={payingBookingId === booking._id}
                  >
                    {payingBookingId === booking._id ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Pay Now
                      </>
                    )}
                  </button>
                )}

                {booking.status === 'pending' && (
                  <button 
                    className="btn-danger-outline"
                    onClick={() => setCancelModal({ open: true, bookingId: booking._id })}
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Calendar size={48} className="empty-icon" />
            <h3>No bookings found</h3>
            <p>You haven't made any bookings with this status yet.</p>
            <Link to="/vendors" className="btn-primary">
              Browse Vendors
            </Link>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <AlertTriangle className="text-warning" size={32} />
              <h3>Cancel Booking?</h3>
            </div>
            <p>Are you sure you want to cancel this booking request? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setCancelModal({ open: false, bookingId: null })}
              >
                Keep Booking
              </button>
              <button 
                className="btn-danger"
                onClick={handleCancelBooking}
              >
                Yes, Cancel It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBookings;
