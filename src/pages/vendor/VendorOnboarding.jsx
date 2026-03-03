import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI } from '../../api/vendors';
import toast from 'react-hot-toast';
import './VendorOnboarding.css';

const CATEGORIES = [
  { value: 'venue', label: 'Wedding Venue', icon: '🏛️' },
  { value: 'photographer', label: 'Photographer', icon: '📸' },
  { value: 'makeup_artist', label: 'Makeup Artist', icon: '💄' },
  { value: 'decorator', label: 'Decor', icon: '🎨' },
  { value: 'caterer', label: 'Catering', icon: '🍽️' },
];

const CITIES = ['Islamabad', 'Rawalpindi'];

const TOTAL_STEPS = 3;

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1 – Business Category
    category: '',
    // Step 2 – Personal Details
    firstName: '',
    lastName: '',
    phone: '',
    // Step 3 – Business Details
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    city: '',
    address: '',
    googleMapLink: '',
    // Social media (optional)
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const updateForm = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleFinish = async () => {
    setLoading(true);
    try {
      const payload = {
        businessName: formData.businessName,
        category: formData.category,
        city: formData.city,
        address: formData.address,
        phone: formData.businessPhone,
        email: formData.businessEmail,
        googleMapLink: formData.googleMapLink,
        socialMedia: {
          instagram: formData.instagram,
          facebook: formData.facebook,
          tiktok: formData.tiktok,
          youtube: formData.youtube,
        },
        // Personal details sent for user record update
        personalDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        },
      };

      const { data } = await vendorAPI.createProfile(payload);
      if (data.success) {
        // Update local user context to mark onboarding complete
        updateUser({ ...user, onboarding: { ...user?.onboarding, isComplete: true } });
        toast.success('Profile created! Pending admin verification.');
        navigate('/vendor');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save profile. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vonboarding-page">
      <div className="vonboarding-container">
        {/* Logo / Brand */}
        <div className="vonboarding-brand">
          <span className="vonboarding-brand-mark">VIDAI</span>
          <span className="vonboarding-brand-sub">Vendor Setup</span>
        </div>

        {/* Step indicator */}
        <div className="vonboarding-stepper">
          {[1, 2, 3].map((n, i) => (
            <React.Fragment key={n}>
              <span
                className={`vdot ${step >= n ? 'active' : ''} ${step === n ? 'current' : ''}`}
              >
                {n}
              </span>
              {i < 2 && <span className={`vline ${step > n ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Business Category ── */}
        {step === 1 && (
          <div className="vonboarding-step">
            <h2>What do you do?</h2>
            <p>Select the category that best describes your business.</p>

            <div className="category-grid">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  className={`category-card ${formData.category === cat.value ? 'selected' : ''}`}
                  onClick={() => updateForm('category', cat.value)}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-label">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="vonboarding-actions">
              <button
                className="vbtn-primary"
                onClick={nextStep}
                disabled={!formData.category}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Personal Details ── */}
        {step === 2 && (
          <div className="vonboarding-step">
            <h2>👤 Your Personal Details</h2>
            <p>Tell us about yourself — the person behind the business.</p>

            <div className="vform-group-row">
              <div className="vform-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  placeholder="e.g. Ahmed"
                />
              </div>
              <div className="vform-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  placeholder="e.g. Khan"
                />
              </div>
            </div>

            <div className="vform-group">
              <label>Personal Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="e.g. 0300-1234567"
              />
            </div>

            <div className="vonboarding-actions">
              <button className="vbtn-secondary" onClick={prevStep}>
                Back
              </button>
              <button
                className="vbtn-primary"
                onClick={nextStep}
                disabled={!formData.firstName || !formData.lastName || !formData.phone}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Business Details ── */}
        {step === 3 && (
          <div className="vonboarding-step">
            <h2>🏢 Business Details</h2>
            <p>Let potential clients know how to find and reach your business.</p>

            <div className="vform-group">
              <label>Business Name *</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => updateForm('businessName', e.target.value)}
                placeholder="e.g. Royal Events"
              />
            </div>

            <div className="vform-group-row">
              <div className="vform-group">
                <label>Business Email *</label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => updateForm('businessEmail', e.target.value)}
                  placeholder="contact@business.com"
                />
              </div>
              <div className="vform-group">
                <label>Business Contact No. *</label>
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) => updateForm('businessPhone', e.target.value)}
                  placeholder="051-1234567"
                />
              </div>
            </div>

            <div className="vform-group">
              <label>City *</label>
              <div className="vchip-grid">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    className={`vchip ${formData.city === c ? 'active' : ''}`}
                    onClick={() => updateForm('city', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="vform-group">
              <label>Business Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateForm('address', e.target.value)}
                placeholder="e.g. F-8 Markaz, Islamabad"
              />
            </div>

            <div className="vform-group">
              <label>Google Map Link</label>
              <input
                type="url"
                value={formData.googleMapLink}
                onChange={(e) => updateForm('googleMapLink', e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>

            {/* Social Media (optional) */}
            <div className="vsocial-section">
              <h3>📱 Social Media <span className="voptional-tag">Optional</span></h3>
              <div className="vform-group-row">
                <div className="vform-group">
                  <label>Instagram</label>
                  <div className="vsocial-input">
                    <span className="vsocial-prefix">@</span>
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => updateForm('instagram', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>
                <div className="vform-group">
                  <label>Facebook</label>
                  <div className="vsocial-input">
                    <span className="vsocial-prefix">@</span>
                    <input
                      type="text"
                      value={formData.facebook}
                      onChange={(e) => updateForm('facebook', e.target.value)}
                      placeholder="page name"
                    />
                  </div>
                </div>
              </div>
              <div className="vform-group-row">
                <div className="vform-group">
                  <label>TikTok</label>
                  <div className="vsocial-input">
                    <span className="vsocial-prefix">@</span>
                    <input
                      type="text"
                      value={formData.tiktok}
                      onChange={(e) => updateForm('tiktok', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>
                <div className="vform-group">
                  <label>YouTube</label>
                  <div className="vsocial-input">
                    <span className="vsocial-prefix">@</span>
                    <input
                      type="text"
                      value={formData.youtube}
                      onChange={(e) => updateForm('youtube', e.target.value)}
                      placeholder="channel"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="vonboarding-actions">
              <button className="vbtn-secondary" onClick={prevStep}>
                Back
              </button>
              <button
                className="vbtn-primary"
                onClick={handleFinish}
                disabled={
                  loading ||
                  !formData.businessName ||
                  !formData.businessEmail ||
                  !formData.businessPhone ||
                  !formData.city ||
                  !formData.address
                }
              >
                {loading ? 'Saving...' : 'Create Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorOnboarding;
