import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const { isAuthenticated } = useAuth();

  const openAuthModal = (mode = 'login') => {
    setModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Placeholder for search functionality
    console.log("Searching...");
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Plan your dream wedding in Pakistan with AI</h1>
        <p className="hero-subtitle">
          Find the perfect vendors, manage your budget, and create unforgettable memories.
        </p>

        {/* Search Bar */}
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Select City (e.g., Lahore, Karachi)" 
            className="search-input"
          />
          <input 
            type="text" 
            placeholder="Vendor Type (e.g., Photographer, Venue)" 
            className="search-input"
          />
          <button className="search-button" onClick={handleSearch}>
            Search
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why Choose Us?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">💰</span>
            <h3 className="feature-title">Smart Budget Planning</h3>
            <p className="feature-description">
              Our AI helps you allocate your budget effectively across different categories.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🤖</span>
            <h3 className="feature-title">AI Assistant</h3>
            <p className="feature-description">
              Get personalized recommendations and instant answers to your planning questions.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">✅</span>
            <h3 className="feature-title">Verified Vendors</h3>
            <p className="feature-description">
              Connect with trusted and top-rated wedding professionals in your city.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <h2>Ready to start planning?</h2>
        <p style={{ margin: '1rem 0 2rem', color: '#666' }}>
          Join thousands of couples creating their perfect day.
        </p>
        
        {!isAuthenticated ? (
          <button 
            className="cta-button" 
            onClick={() => openAuthModal('signup')}
          >
            Get Started
          </button>
        ) : (
          <Link to="/dashboard" className="cta-button" style={{ textDecoration: 'none' }}>
            Go to Dashboard
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
