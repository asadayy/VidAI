import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const { isAuthenticated, user } = useAuth();

  const openAuthModal = (mode = 'login') => {
    setModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Searching...");
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Plan your dream wedding with Shadiyana</h1>
        <p className="hero-subtitle">
          Find the best wedding vendors in Pakistan. Connect with photographers, venues, makeup artists, and more for your perfect wedding.
        </p>

        {/* Search Bar */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search vendors (e.g. Photographers)"
            className="search-input"
          />
          <div className="search-divider"></div>
          <input
            type="text"
            placeholder="City (e.g. Lahore, Islamabad)"
            className="search-input"
          />
          <button className="search-button" onClick={handleSearch}>
            Search
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Your Wedding, <span>Simplified.</span></h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="material-icon">💝</span>
            </div>
            <h3 className="feature-title">Verified Vendors</h3>
            <p className="feature-description">
              Access hundreds of trusted and top-rated wedding professionals. We verify our partners so you have an unforgettable, stress-free day.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="material-icon">✨</span>
            </div>
            <h3 className="feature-title">Smart Budgeting</h3>
            <p className="feature-description">
              Keep your finances on track. Our platform helps you intelligently allocate your budget to maximize value across venues and services.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="material-icon">📅</span>
            </div>
            <h3 className="feature-title">End-to-End Planning</h3>
            <p className="feature-description">
              From finding the perfect marquee to booking your dream bridal makeup artist, easily manage every detail of your shaadi.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <h2>Ready to start planning?</h2>
        <p className="cta-text">
          Join thousands of couples creating their perfect day. Discover vendors across Pakistan.
        </p>

        {!isAuthenticated ? (
          <button
            className="cta-button"
            onClick={() => openAuthModal('signup')}
          >
            Get Started Now
          </button>
        ) : (
          <Link
            to={
              user?.role === 'admin'
                ? '/admin/dashboard'
                : user?.role === 'vendor'
                  ? '/vendor'
                  : '/user'
            }
            className="cta-button"
            style={{ textDecoration: 'none' }}
          >
            Go to My Dashboard
          </Link>
        )}

        <Link to="/vendor-landing" className="vendor-link">
          Are you a vendor? Join our network
        </Link>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={modalMode}
      />
    </div>
  );
};

export default Home;
