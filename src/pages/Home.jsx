import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import './Home.css';

import heroHands    from '../assets/Hero-Images/hands-indian-bride-groom-intertwined-together-making-authentic-wedding-ritual.jpg';
import heroMehndi   from '../assets/Hero-Images/mehndi-wedding-ornament-hands-drawn-by-henna.jpg';
import heroCandles  from '../assets/Hero-Images/navratri-decoration-with-candles.jpg';
import heroVenue    from '../assets/Hero-Images/photorealistic-wedding-venue-with-intricate-decor-ornaments.jpg';
import heroRitual   from '../assets/Hero-Images/ritual-with-coconut-leaves-traditional-hindu-wedding-ceremony.jpg';

const SLIDES = [
  {
    img: heroHands,
    headline: ['Two Souls,', 'One Sacred Knot.'],
    sub: 'In the language of touch, your forever begins today.',
  },
  {
    img: heroMehndi,
    headline: ['Written in Henna,', 'Sealed in Love.'],
    sub: 'Every swirl a secret wish — may your union bloom as beautifully as this art.',
  },
  {
    img: heroCandles,
    headline: ['Let Every Flame', 'Bear Witness.'],
    sub: 'A love this radiant needed a thousand lights just to match its glow.',
  },
  {
    img: heroVenue,
    headline: ['A Palace Dressed', 'in Your Dreams.'],
    sub: 'Every petal, every chandelier — orchestrated for the moment you say I do.',
  },
  {
    img: heroRitual,
    headline: ['Rooted in Tradition,', 'Blossoming in Love.'],
    sub: 'Where ancient blessings meet the sweetest promise of tomorrow.',
  },
];

const CATEGORIES = [
  { icon: '🏛️', label: 'Venues' },
  { icon: '🍽️', label: 'Catering' },
  { icon: '💄', label: 'Makeup' },
  { icon: '🌸', label: 'Decor' },
  { icon: '📸', label: 'Photography' },
];

const STEPS = [
  {
    num: '01',
    icon: '👤',
    title: 'Create Your Profile',
    desc: 'Sign up in seconds. Tell us about your event date, guest count, city, and total budget.',
  },
  {
    num: '02',
    icon: '🔍',
    title: 'Discover & Book Vendors',
    desc: 'Browse verified photographers, venues, caterers, and more in Islamabad & Rawalpindi.',
  },
  {
    num: '03',
    icon: '🤖',
    title: 'Plan Smarter with AI',
    desc: 'Let our Gemini-powered assistant manage your budget, generate invitations, and answer every planning question.',
  },
];

const FEATURES = [
  {
    icon: '💝',
    title: 'Verified Vendor Network',
    desc: 'Every vendor on VidAI is reviewed and approved. Browse profiles, view portfolios, and book with confidence.',
    badge: 'Trusted',
  },
  {
    icon: '💰',
    title: 'AI Budget Planner',
    desc: 'Set your total budget once during onboarding. Our AI breaks it down by category and tracks every rupee you spend.',
    badge: 'Powered by Ollama',
  },
  {
    icon: '🤖',
    title: 'AI Wedding Assistant',
    desc: 'Ask anything — vendor recommendations, checklist help, or etiquette tips. Available 24/7, just for your shaadi.',
    badge: 'Always on',
  },
  {
    icon: '💌',
    title: 'Invitation Generator',
    desc: 'Generate beautiful, personalized wedding invitation text and images in seconds using generative AI.',
    badge: 'New',
  },
];

const Home = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        setPrevSlide(prev);
        return (prev + 1) % SLIDES.length;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const openAuthModal = (mode = 'login') => {
    setModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const dashboardPath =
    user?.role === 'admin' ? '/admin/dashboard'
    : user?.role === 'vendor' ? '/vendor'
    : '/user';

  const handleCategoryClick = (label) => {
    navigate(`/user/vendors?category=${encodeURIComponent(label.toLowerCase())}`);
  };

  return (
    <div className="home-container">

      {/* ── NAVBAR ── */}
      <nav className="home-nav">
        <div className="home-nav-inner">
          <span className="home-nav-brand">💍 VidAI</span>
          <div className="home-nav-actions">
            {isAuthenticated ? (
              <Link to={dashboardPath} className="nav-btn nav-btn-primary">Dashboard</Link>
            ) : (
              <>
                <button className="nav-btn nav-btn-ghost" onClick={() => openAuthModal('login')}>Login</button>
                <button className="nav-btn nav-btn-primary" onClick={() => openAuthModal('signup')}>Get Started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section">
        {/* previous image — always visible underneath */}
        <div
          className="hero-bg-slide"
          style={{ backgroundImage: `url(${SLIDES[prevSlide].img})`, zIndex: 0 }}
        />
        {/* current image — fades in on top, no black flash */}
        <div
          key={currentSlide}
          className="hero-bg-slide hero-bg-slide--active"
          style={{ backgroundImage: `url(${SLIDES[currentSlide].img})`, zIndex: 1 }}
        />

        {/* fixed-height text block so buttons never shift */}
        <div className="hero-text-block">
          <div className="hero-badge">🇵🇰 Pakistan's AI-Powered Wedding Platform</div>
          <h1 className="hero-title">
            {SLIDES[currentSlide].headline[0]}<br />
            <span className="hero-title-accent">{SLIDES[currentSlide].headline[1]}</span>
          </h1>
          <p className="hero-subtitle">
            {SLIDES[currentSlide].sub}
          </p>
        </div>

        <div className="hero-cta-group">
          {isAuthenticated ? (
            <Link to={dashboardPath} className="btn-rose">Go to Dashboard</Link>
          ) : (
            <button className="btn-rose" onClick={() => openAuthModal('signup')}>Start Planning Free</button>
          )}
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><strong>500+</strong><span>Vendors</span></div>
          <div className="hero-stat-divider" />
          <div className="hero-stat"><strong>2 Cities</strong><span>Islamabad & Rawalpindi</span></div>
          <div className="hero-stat-divider" />
          <div className="hero-stat"><strong>AI</strong><span>Powered by Gemini & Ollama</span></div>
        </div>

        {/* slide dots */}
        <div className="hero-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === currentSlide ? ' hero-dot--active' : ''}`}
              onClick={() => { setPrevSlide(currentSlide); setCurrentSlide(i); }}
            />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="steps-section">
        <p className="section-eyebrow">Simple & Fast</p>
        <h2 className="section-title">How VidAI Works</h2>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div className="step-card" key={s.num}>
              <div className="step-num">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VENDOR CATEGORIES ── */}
      <section className="categories-section">
        <p className="section-eyebrow">Browse by Type</p>
        <h2 className="section-title">Find Every Vendor You Need</h2>
        <div className="categories-grid">
          <div className="categories-row">
            {CATEGORIES.slice(0, 3).map((c) => (
              <button
                key={c.label}
                className="category-pill"
                onClick={() => handleCategoryClick(c.label)}
              >
                <span className="category-pill-icon">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <div className="categories-row">
            {CATEGORIES.slice(3).map((c) => (
              <button
                key={c.label}
                className="category-pill"
                onClick={() => handleCategoryClick(c.label)}
              >
                <span className="category-pill-icon">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Link to="/user/vendors" className="browse-all-link">Browse all vendors →</Link>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section">
        <p className="section-eyebrow">Everything in One Place</p>
        <h2 className="section-title">Your Wedding, <span className="accent">Simplified.</span></h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-badge">{f.badge}</div>
              <div className="feature-icon-wrapper">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-description">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <p className="section-eyebrow cta-eyebrow">Ready?</p>
          <h2 className="cta-heading">Start Planning Your Perfect Day</h2>
          <p className="cta-text">
            Join couples across Islamabad & Rawalpindi who are planning stress-free weddings with VidAI.
          </p>
          {isAuthenticated ? (
            <Link to={dashboardPath} className="btn-rose">Go to Dashboard</Link>
          ) : (
            <button className="btn-rose" onClick={() => openAuthModal('signup')}>Create Free Account</button>
          )}
          <Link to="/vendor-landing" className="vendor-link">Are you a wedding professional? Join as a vendor →</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="home-footer">
        <span>© 2026 VidAI · AI-Powered Wedding Planning · Pakistan</span>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={modalMode} />
    </div>
  );
};

export default Home;
