import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapPin, Mail, Phone, Calendar, Users, Check, X, ZoomIn, ChevronLeft, ChevronRight, ArrowLeft, BadgeCheck } from 'lucide-react';
import { vendorAPI } from '../../api/vendors';
import client from '../../api/client';
import Loading from '../../components/Loading';
import AuthModal from '../../components/auth/AuthModal';
import { useAuth } from '../../context/AuthContext';
import './VendorDetails.css';

const VendorDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const packagesRef = useRef(null);

  const [vendor, setVendor] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Lightbox
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });

  // Booking Form State
  const [bookingData, setBookingData] = useState({
    eventDate: '',
    eventType: 'wedding',
    guestCount: '',
    notes: ''
  });

  const fetchVendorDetails = useCallback(async () => {
    try {
      const { data } = await vendorAPI.getBySlug(slug);
      const vendorData = data.data?.vendor || data.vendor || data;
      setVendor(vendorData);
      setPackages(vendorData.packages || []);

      if (vendorData._id) {
        const reviewsRes = await client.get(`/vendors/${vendorData._id}/reviews`);
        setReviews(reviewsRes.data.data?.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      toast.error('Failed to load vendor details.');
      navigate('/user/vendors');
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (slug) fetchVendorDetails();
  }, [slug, fetchVendorDetails]);

  const handleBookClick = (pkg) => {
    if (!isAuthenticated) {
      toast.error('Please login to book a vendor.');
      setShowAuthModal(true);
      return;
    }
    setSelectedPackage(pkg);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedPackage(null);
    setBookingData({ eventDate: '', eventType: 'wedding', guestCount: '', notes: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!vendor || !selectedPackage) return;
    setSubmitting(true);
    try {
      await client.post('/bookings', {
        vendorId: vendor._id,
        packageId: selectedPackage._id,
        ...bookingData,
        guestCount: Number(bookingData.guestCount)
      });
      toast.success('Booking request sent successfully!');
      handleModalClose();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to leave a review.');
      setShowAuthModal(true);
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await client.post(`/vendors/${vendor._id}/reviews`, reviewData);
      toast.success('Review added successfully!');
      fetchVendorDetails();
      setReviews(prev => [res.data.data.review, ...prev]);
      setReviewData({ rating: 5, title: '', comment: '' });
    } catch (error) {
      console.error('Review error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────
  const renderStars = (rating, size = '1rem') => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ fontSize: size }} className={i < Math.round(rating) ? 'vd-star' : 'vd-star-empty'}>★</span>
    ));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const portfolio = vendor?.portfolio || [];

  // ── Render ────────────────────────────────────────────────────
  if (loading) return <Loading />;
  if (!vendor) return <div className="vd-error">Vendor not found</div>;

  return (
    <div className="vd-root">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <nav className="vd-topbar">
        <button className="vd-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="vd-breadcrumb">Vendors / <b>{vendor.businessName}</b></span>
        <div className="vd-topbar-actions">
          <button className="vd-topbar-btn" onClick={() => packagesRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            View Packages
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="vd-hero">
        <img
          src={vendor.coverImage?.url || 'https://placehold.co/1400x480/1a1a2e/ffffff?text=No+Cover+Image'}
          alt={vendor.businessName}
          className="vd-hero-img"
          onError={(e) => { e.target.src = 'https://placehold.co/1400x480/1a1a2e/ffffff?text=No+Cover+Image'; }}
        />
        <div className="vd-hero-overlay">
          <span className="vd-hero-cat">
            {vendor.category?.replace(/_/g, ' ') || 'Vendor'}
          </span>
          <h1 className="vd-hero-title">{vendor.businessName}</h1>
          <div className="vd-hero-meta">
            {vendor.city && (
              <span className="vd-hero-meta-item">
                <MapPin size={16} /> {vendor.city}
              </span>
            )}
            <span className="vd-hero-meta-item vd-hero-stars">
              {renderStars(vendor.ratingsAverage || 0)}
              <span className="vd-rating-score">{(vendor.ratingsAverage || 0).toFixed(1)}</span>
              <span className="vd-rating-count">({vendor.ratingsCount || 0})</span>
            </span>
            {vendor.isVerified && (
              <span className="vd-hero-verified">
                <BadgeCheck size={14} /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="vd-body">

        {/* ── Main Column ─────────────────────────────────── */}
        <main className="vd-main">

          {/* About */}
          <section className="vd-section">
            <h2 className="vd-section-title">About Us</h2>
            <p className="vd-about-text">{vendor.description || 'No description provided.'}</p>
            {vendor.tags?.length > 0 && (
              <div className="vd-tags">
                {vendor.tags.map((tag, i) => <span key={i} className="vd-tag">{tag}</span>)}
              </div>
            )}
          </section>

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <section className="vd-section">
              <h2 className="vd-section-title">Portfolio</h2>
              <div className="vd-portfolio-grid">
                {portfolio.map((img, index) => (
                  <div key={index} className="vd-portfolio-item" onClick={() => setLightbox({ open: true, index })}>
                    <img
                      src={img.url || img}
                      alt={`Portfolio ${index + 1}`}
                      onError={(e) => { e.target.src = 'https://placehold.co/300x300/f0ecea/999?text=Image'; }}
                    />
                    <div className="vd-portfolio-item-overlay"><ZoomIn size={24} /></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Packages */}
          <section className="vd-section" ref={packagesRef}>
            <h2 className="vd-section-title">Available Packages</h2>
            {packages.length > 0 ? (
              <div className="vd-pkg-grid">
                {packages.map((pkg) => (
                  <div key={pkg._id} className="vd-pkg-card">
                    <div className="vd-pkg-head">
                      <span className="vd-pkg-name">{pkg.name}</span>
                      <span className="vd-pkg-price">Rs. {pkg.price?.toLocaleString()}</span>
                    </div>
                    {pkg.description && <p className="vd-pkg-desc">{pkg.description}</p>}
                    {pkg.features?.length > 0 && (
                      <ul className="vd-pkg-features">
                        {pkg.features.map((f, idx) => (
                          <li key={idx}>
                            <Check size={14} className="vd-pkg-feat-icon" /> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button className="vd-pkg-book-btn" onClick={() => handleBookClick(pkg)}>
                      Book This Package
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="vd-portfolio-empty">No packages listed yet.</p>
            )}
          </section>

          {/* Reviews */}
          <section className="vd-section">
            <h2 className="vd-section-title">Reviews &amp; Ratings</h2>
            <div className="vd-reviews-layout">

              {/* Submit form */}
              <div className="vd-review-form">
                <h3>Leave a Review</h3>
                <form onSubmit={handleReviewSubmit}>

                  {/* Star picker */}
                  <div className="vd-field">
                    <label>Your Rating</label>
                    <div className="vd-star-picker">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`vd-star-pick${(hoverRating || reviewData.rating) >= n ? ' active' : ''}`}
                          onMouseEnter={() => setHoverRating(n)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewData(prev => ({ ...prev, rating: n }))}
                          aria-label={`${n} star`}
                        >★</button>
                      ))}
                    </div>
                  </div>

                  <div className="vd-field">
                    <label>Title</label>
                    <input
                      type="text"
                      value={reviewData.title}
                      onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      placeholder="Summarise your experience"
                    />
                  </div>

                  <div className="vd-field">
                    <label>Comment</label>
                    <textarea
                      value={reviewData.comment}
                      onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                      required
                      placeholder="Share the details of your experience…"
                      rows={4}
                    />
                  </div>

                  <button type="submit" className="vd-submit-btn" disabled={submittingReview}>
                    {submittingReview ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              </div>

              {/* Reviews list */}
              <div>
                <h3 className="vd-review-list-head">Recent Reviews</h3>
                {reviews.length > 0 ? (
                  <div className="vd-review-cards">
                    {reviews.map(review => (
                      <div key={review._id} className="vd-review-card">
                        <div className="vd-review-card-head">
                          <div className="vd-reviewer-info">
                            <div className="vd-reviewer-avatar">
                              {(review.user?.name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="vd-reviewer-name">{review.user?.name || 'Guest'}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="vd-review-stars">
                              {Array.from({ length: 5 }, (_, i) => (
                                <span key={i} className={i < review.rating ? 'vd-review-star-full' : 'vd-review-star-empty'}>★</span>
                              ))}
                            </div>
                            <div className="vd-review-date">{formatDate(review.createdAt)}</div>
                          </div>
                        </div>
                        {review.title && <p className="vd-review-title-text">{review.title}</p>}
                        <p className="vd-review-body">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="vd-no-reviews">No reviews yet — be the first to share your experience!</p>
                )}
              </div>

            </div>
          </section>
        </main>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="vd-sidebar">

          {/* Stats card */}
          <div className="vd-stats-card">
            <p className="vd-stats-card-title">At a Glance</p>
            <div className="vd-stats-grid">
              <div className="vd-stat-item">
                <span className="vd-stat-val vd-stat-gold">{(vendor.ratingsAverage || 0).toFixed(1)}</span>
                <span className="vd-stat-lbl">Rating</span>
              </div>
              <div className="vd-stat-item">
                <span className="vd-stat-val">{vendor.ratingsCount || 0}</span>
                <span className="vd-stat-lbl">Reviews</span>
              </div>
              <div className="vd-stat-item">
                <span className="vd-stat-val">{packages.length}</span>
                <span className="vd-stat-lbl">Packages</span>
              </div>
              <div className="vd-stat-item">
                <span className="vd-stat-val">{portfolio.length}</span>
                <span className="vd-stat-lbl">Portfolio</span>
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className="vd-contact-card">
            <p className="vd-contact-card-title">Contact &amp; Book</p>
            <div className="vd-contact-rows">
              {vendor.email && (
                <div className="vd-contact-row">
                  <span className="vd-contact-icon"><Mail size={15} /></span>
                  {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="vd-contact-row">
                  <span className="vd-contact-icon"><Phone size={15} /></span>
                  {vendor.phone}
                </div>
              )}
              {vendor.city && (
                <div className="vd-contact-row">
                  <span className="vd-contact-icon"><MapPin size={15} /></span>
                  {vendor.city}
                </div>
              )}
            </div>
            <button
              className="vd-cta-btn"
              onClick={() => packagesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              Book a Package
            </button>
            <button
              className="vd-cta-btn-outline"
              onClick={() => navigate('/user/vendors')}
            >
              ← Browse Vendors
            </button>
          </div>

        </aside>
      </div>

      {/* ── Booking Modal ──────────────────────────────────── */}
      {showModal && createPortal(
        <div className="vd-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleModalClose(); }}>
          <div className="vd-modal">
            <div className="vd-modal-header">
              <p className="vd-modal-pkg-label">Booking Request</p>
              <h2 className="vd-modal-title">{selectedPackage?.name}</h2>
              {selectedPackage?.price && (
                <span className="vd-modal-price">Rs. {selectedPackage.price.toLocaleString()}</span>
              )}
              <button className="vd-modal-close" onClick={handleModalClose}><X size={16} /></button>
            </div>

            <div className="vd-modal-body">
              <form onSubmit={handleBookingSubmit} className="vd-modal-form">

                <div className="vd-modal-row">
                  <div className="vd-field">
                    <label><Calendar size={12} style={{ marginRight: 4 }} />Event Date</label>
                    <input
                      type="date"
                      name="eventDate"
                      value={bookingData.eventDate}
                      onChange={handleInputChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="vd-field">
                    <label><Users size={12} style={{ marginRight: 4 }} />Guest Count</label>
                    <input
                      type="number"
                      name="guestCount"
                      value={bookingData.guestCount}
                      onChange={handleInputChange}
                      placeholder="e.g. 200"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="vd-field">
                  <label>Event Type</label>
                  <select name="eventType" value={bookingData.eventType} onChange={handleInputChange} required>
                    <option value="wedding">Wedding</option>
                    <option value="engagement">Engagement</option>
                    <option value="mehndi">Mehndi</option>
                    <option value="baraat">Baraat</option>
                    <option value="walima">Walima</option>
                    <option value="nikkah">Nikkah</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="vd-field">
                  <label>Special Requirements / Notes</label>
                  <textarea
                    name="notes"
                    value={bookingData.notes}
                    onChange={handleInputChange}
                    placeholder="Any specific requests or details…"
                    rows={3}
                  />
                </div>

                <button type="submit" className="vd-form-confirm-btn" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Confirm Booking Request'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Lightbox ───────────────────────────────────────── */}
      {lightbox.open && createPortal(
        <div className="vd-lightbox" onClick={() => setLightbox({ open: false, index: 0 })}>
          {portfolio.length > 1 && (
            <>
              <button
                className="vd-lightbox-nav vd-lightbox-nav-prev"
                onClick={(e) => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index - 1 + portfolio.length) % portfolio.length })); }}
              ><ChevronLeft size={24} /></button>
              <button
                className="vd-lightbox-nav vd-lightbox-nav-next"
                onClick={(e) => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index + 1) % portfolio.length })); }}
              ><ChevronRight size={24} /></button>
            </>
          )}
          <img
            src={portfolio[lightbox.index]?.url || portfolio[lightbox.index]}
            alt={`Portfolio ${lightbox.index + 1}`}
            className="vd-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="vd-lightbox-close" onClick={() => setLightbox({ open: false, index: 0 })}><X size={18} /></button>
          <span className="vd-lightbox-caption">{lightbox.index + 1} / {portfolio.length}</span>
        </div>,
        document.body
      )}

      {/* ── Auth Modal ─────────────────────────────────────── */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
};

export default VendorDetails;
