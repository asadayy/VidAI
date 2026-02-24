import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapPin, Star, Mail, Phone, Calendar, Users, FileText, Check, X } from 'lucide-react';
import { vendorAPI } from '../../api/vendors';
import client from '../../api/client';
import Loading from '../../components/Loading';
import './VendorDetails.css';

const VendorDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Booking Form State
  const [bookingData, setBookingData] = useState({
    eventDate: '',
    eventType: 'wedding',
    guestCount: '',
    notes: ''
  });

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        const { data } = await vendorAPI.getBySlug(slug);
        // Assuming the API returns the vendor object directly or nested
        // Adjust based on actual API response structure (usually data.data or just data)
        const vendorData = data.vendor || data;
        setVendor(vendorData);
        setPackages(vendorData.packages || []);
      } catch (error) {
        console.error('Error fetching vendor details:', error);
        toast.error('Failed to load vendor details.');
        navigate('/user/vendors'); // Redirect back to list on error
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchVendorDetails();
    }
  }, [slug, navigate]);

  const handleBookClick = (pkg) => {
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
    </div>
  );
};

export default VendorDetails;
