import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapPin, Star, Mail, Phone, Calendar, Users, FileText, Check, X, MessageSquare } from 'lucide-react';
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
      // Assuming the API returns the vendor object directly or nested
      // Adjust based on actual API response structure (usually data.data or just data)
      const vendorData = data.data?.vendor || data.vendor || data;
      setVendor(vendorData);
      setPackages(vendorData.packages || []);

      // Fetch reviews
      if (vendorData._id) {
        const reviewsRes = await client.get(`/vendors/${vendorData._id}/reviews`);
        setReviews(reviewsRes.data.data?.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      toast.error('Failed to load vendor details.');
      navigate('/user/vendors'); // Redirect back to list on error
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (slug) {
      fetchVendorDetails();
    }
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
    setBookingData({
      eventDate: '',
      eventType: 'wedding',
      guestCount: '',
      notes: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!vendor || !selectedPackage) return;

    setSubmitting(true);
    try {
      const payload = {
        vendorId: vendor._id,
        packageId: selectedPackage._id,
        ...bookingData,
        guestCount: Number(bookingData.guestCount)
      };

      await client.post('/bookings', payload);

      toast.success('Booking request sent successfully!');
      handleModalClose();
    } catch (error) {
      console.error('Booking error:', error);
      const message = error.response?.data?.message || 'Failed to submit booking request.';
      toast.error(message);
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
      fetchVendorDetails(); // Refresh vendor ratings average
      setReviews(prev => [res.data.data.review, ...prev]);
      setReviewData({ rating: 5, title: '', comment: '' });
    } catch (error) {
      console.error('Review error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <Loading />;
  if (!vendor) return <div className="error-state">Vendor not found</div>;

  return (
    <div className="vendor-details-container">
      {/* Hero Section */}
      <div className="vendor-hero">
        <img
          src={vendor.coverImage?.url || 'https://via.placeholder.com/1200x400?text=No+Cover+Image'}
          alt={vendor.businessName}
          className="hero-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/1200x400?text=No+Cover+Image';
          }}
        />
        <div className="hero-overlay">
          <h1 className="vendor-name">{vendor.businessName}</h1>
          <div className="vendor-meta">
            <span>
              <MapPin size={20} />
              {vendor.city}
            </span>
            <span>
              <Star size={20} fill="#f1c40f" color="#f1c40f" />
              {vendor.ratingsAverage || 0} ({vendor.ratingsCount || 0} reviews)
            </span>
            <span className="category-tag">
              {vendor.category?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="vendor-profile">
        {/* Main Content */}
        <div className="profile-main">
          <h2>About Us</h2>
          <p className="profile-description">{vendor.description}</p>

          <h3>Portfolio</h3>
          <div className="portfolio-grid">
            {vendor.portfolio?.length > 0 ? (
              vendor.portfolio.map((img, index) => (
                <div key={index} className="portfolio-item">
                  <img
                    src={img.url || img}
                    alt={`Portfolio ${index + 1}`}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/150x150?text=Image';
                    }}
                  />
                </div>
              ))
            ) : (
              <p>No portfolio images available.</p>
            )}
          </div>
        </div>

        {/* Sidebar / Contact Info */}
        <aside className="profile-sidebar">
          <div className="contact-card">
            <h3>Contact Information</h3>
            <div className="contact-info">
              {vendor.email && (
                <div className="info-row">
                  <Mail size={18} />
                  <span>{vendor.email}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="info-row">
                  <Phone size={18} />
                  <span>{vendor.phone}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Packages Section */}
      <div className="packages-section">
        <h2>Available Packages</h2>
        <div className="packages-grid">
          {packages.length > 0 ? (
            packages.map((pkg) => (
              <div key={pkg._id} className="package-card">
                <div className="package-header">
                  <span className="package-name">{pkg.name}</span>
                  <span className="package-price">Rs. {pkg.price.toLocaleString()}</span>
                </div>
                <p className="package-description">{pkg.description}</p>

                {pkg.features && pkg.features.length > 0 && (
                  <ul className="package-features">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                )}

                <button
                  className="book-btn"
                  onClick={() => handleBookClick(pkg)}
                >
                  Book Now
                </button>
              </div>
            ))
          ) : (
            <p className="no-packages">No packages listed yet.</p>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2>Reviews & Ratings</h2>
        <div className="reviews-container">
          <div className="review-form-card">
            <h3>Leave a Review</h3>
            <form onSubmit={handleReviewSubmit} className="review-form">
              <div className="form-group">
                <label>Rating</label>
                <select
                  value={reviewData.rating}
                  onChange={(e) => setReviewData({ ...reviewData, rating: Number(e.target.value) })}
                  className="filter-select"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Terrible</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={reviewData.title}
                  onChange={(e) => setReviewData({ ...reviewData, title: e.target.value })}
                  required
                  className="filter-input"
                  placeholder="Summary of your experience"
                />
              </div>
              <div className="form-group">
                <label>Comment</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  required
                  placeholder="Share details of your experience..."
                  rows="4"
                  className="filter-input"
                />
              </div>
              <button type="submit" className="submit-btn" disabled={submittingReview}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>

          <div className="reviews-list">
            <h3>Recent Reviews</h3>
            {reviews.length > 0 ? (
              reviews.map(review => (
                <div key={review._id} className="review-card">
                  <div className="review-header">
                    <span className="reviewer-name">{review.user?.name || 'User'}</span>
                    <span className="review-rating"><Star size={14} fill="#f1c40f" color="#f1c40f" /> {review.rating}/5</span>
                  </div>
                  <h4 className="review-title">{review.title}</h4>
                  <p className="review-comment">{review.comment}</p>
                </div>
              ))
            ) : (
              <p>No reviews yet. Be the first to review!</p>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="booking-modal">
            <button className="modal-close" onClick={handleModalClose}>
              <X size={24} />
            </button>

            <h2 className="modal-title">Book {selectedPackage?.name}</h2>

            <form onSubmit={handleBookingSubmit} className="booking-form">
              <div className="form-group">
                <label htmlFor="eventDate">Event Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#666' }} />
                  <input
                    type="date"
                    id="eventDate"
                    name="eventDate"
                    value={bookingData.eventDate}
                    onChange={handleInputChange}
                    required
                    style={{ paddingLeft: '2.5rem' }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="eventType">Event Type</label>
                <select
                  id="eventType"
                  name="eventType"
                  value={bookingData.eventType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="wedding">Wedding</option>
                  <option value="engagement">Engagement</option>
                  <option value="mehndi">Mehndi</option>
                  <option value="baraat">Baraat</option>
                  <option value="walima">Walima</option>
                  <option value="nikkah">Nikkah</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="guestCount">Guest Count</label>
                <div style={{ position: 'relative' }}>
                  <Users size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#666' }} />
                  <input
                    type="number"
                    id="guestCount"
                    name="guestCount"
                    value={bookingData.guestCount}
                    onChange={handleInputChange}
                    placeholder="e.g. 200"
                    min="1"
                    required
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Special Requirements / Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={bookingData.notes}
                  onChange={handleInputChange}
                  placeholder="Any specific requests?"
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal for Guests */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
};

export default VendorDetails;
