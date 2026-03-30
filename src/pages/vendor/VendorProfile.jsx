import { useState, useEffect, useCallback, useRef } from 'react';
import { vendorAPI } from '../../api/vendors';
import { uploadAPI } from '../../api/upload';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  Save,
  Upload,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Phone,
  Mail,
  Globe,
  Building2,
  Film,
  Instagram,
  Youtube,
  CheckCircle2,
  Clock,
  XCircle,
  Camera,
} from 'lucide-react';
import './VendorProfile.css';

const CATEGORIES = [
  { value: 'venue',        label: 'Venue' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'caterer',      label: 'Caterer' },
  { value: 'decorator',    label: 'Decorator' },
  { value: 'makeup_artist',label: 'Makeup Artist' },
];

const INITIAL_FORM = {
  businessName: '',
  category: '',
  description: '',
  city: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  googleMapLink: '',
  socialMedia: { instagram: '', facebook: '', tiktok: '', youtube: '' },
};

const VERIFICATION_CONFIG = {
  approved: { icon: CheckCircle2, label: 'Verified',            color: '#10B981', bg: 'rgba(16,185,129,.1)' },
  rejected: { icon: XCircle,      label: 'Rejected',            color: '#EF4444', bg: 'rgba(239,68,68,.1)'  },
  pending:  { icon: Clock,        label: 'Pending Verification', color: '#F59E0B', bg: 'rgba(245,158,11,.1)' },
};

/* â”€â”€ Section divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="vp-section-header">
      <div className="vp-section-icon"><Icon size={15} /></div>
      <span className="vp-section-label">{label}</span>
    </div>
  );
}

/* â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function VendorProfile() {
  const [vendor, setVendor]                     = useState(null);
  const [isNew, setIsNew]                       = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [form, setForm]                         = useState(INITIAL_FORM);
  const [saving, setSaving]                     = useState(false);
  const [uploadingCover, setUploadingCover]     = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await vendorAPI.getMyProfile();
      const v = data.data.vendor;
      setVendor(v);
      setForm({
        businessName: v.businessName || '',
        category:     v.category     || '',
        description:  v.description  || '',
        city:         v.city         || '',
        address:      v.address      || '',
        phone:        v.phone        || '',
        whatsapp:     v.whatsapp     || '',
        email:        v.email        || '',
        website:      v.website      || '',
        googleMapLink: v.googleMapLink || '',
        socialMedia: {
          instagram: v.socialMedia?.instagram || '',
          facebook:  v.socialMedia?.facebook  || '',
          tiktok:    v.socialMedia?.tiktok    || '',
          youtube:   v.socialMedia?.youtube   || '',
        },
      });
    } catch (err) {
      if (err.response?.status === 404) setIsNew(true);
      else toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateSocial = (platform) => (e) =>
    setForm((prev) => ({
      ...prev,
      socialMedia: { ...prev.socialMedia, [platform]: e.target.value },
    }));

  /* â”€â”€ Save â”€â”€ */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.businessName.trim()) { toast.error('Business name is required'); return; }
    if (!form.category)            { toast.error('Please select a category');  return; }
    if (!form.city.trim())         { toast.error('City is required');           return; }

    setSaving(true);
    try {
      if (isNew) {
        const { data } = await vendorAPI.createProfile(form);
        setVendor(data.data.vendor);
        setIsNew(false);
        toast.success('Vendor profile created! Pending admin verification.');
      } else {
        const { data } = await vendorAPI.updateProfile(form);
        setVendor(data.data.vendor);
        toast.success('Profile updated');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* â”€â”€ Cover upload â”€â”€ */
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Cover image must be under 10 MB'); return; }

    setUploadingCover(true);
    try {
      const { data } = await uploadAPI.uploadVendorCover(file);
      setVendor((prev) => ({ ...prev, coverImage: data.data.coverImage }));
      toast.success('Cover image updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  if (loading) return <Loading fullScreen message="Loading profileâ€¦" />;

  const verStatus  = vendor?.verificationStatus || 'pending';
  const verCfg     = VERIFICATION_CONFIG[verStatus] || VERIFICATION_CONFIG.pending;
  const VerIcon    = verCfg.icon;
  const completeness = vendor?.profileCompleteness ?? 0;

  return (
    <div className="vp-page">

      {/* ── Hero header ── */}
      <div className="vp-hero">
        <div className="vp-hero-glow" />
        <div className="vp-hero-body">
          <div className="vp-hero-icon-wrap">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="vp-title">{isNew ? 'Create Your Profile' : 'Edit Profile'}</h1>
            <p className="vp-subtitle">
              {isNew
                ? 'Set up your vendor profile to start receiving bookings'
                : 'Keep your business information up to date'}
            </p>
          </div>
        </div>
        {!isNew && vendor?.verificationStatus && (
          <div className="vp-verification-badge" style={{ color: verCfg.color, background: verCfg.bg }}>
            <VerIcon size={14} />
            <span>{verCfg.label}</span>
          </div>
        )}
      </div>

      {/* â”€â”€ Cover + completeness â”€â”€ */}
      {!isNew && (
        <div className="vp-cover-wrap">
          <div
            className="vp-cover"
            style={vendor?.coverImage?.url ? { backgroundImage: `url(${vendor.coverImage.url})` } : undefined}
          >
            {!vendor?.coverImage?.url && (
              <div className="vp-cover-placeholder">
                <div className="vp-cover-placeholder-icon"><Camera size={30} /></div>
                <span className="vp-cover-placeholder-title">Add a Cover Image</span>
                <span className="vp-cover-placeholder-hint">Attract more customers with a beautiful photo</span>
              </div>
            )}

            {/* Gradient overlay when image exists */}
            {vendor?.coverImage?.url && <div className="vp-cover-overlay" />}

            {/* Upload button */}
            <label className={`vp-cover-btn${uploadingCover ? ' vp-cover-btn--loading' : ''}`}>
              <Camera size={15} />
              <span>{uploadingCover ? 'Uploadingâ€¦' : 'Change Cover'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={handleCoverUpload}
                disabled={uploadingCover}
              />
            </label>
          </div>

          {/* Profile completeness */}
          {completeness !== undefined && (
            <div className="vp-completeness">
              <div className="vp-completeness-row">
                <span className="vp-completeness-label">Profile Completeness</span>
                <strong
                  className="vp-completeness-pct"
                  style={{ color: completeness >= 80 ? '#10B981' : completeness >= 50 ? '#F59E0B' : '#EF4444' }}
                >
                  {completeness}%
                </strong>
              </div>
              <div className="vp-completeness-track">
                <div
                  className="vp-completeness-fill"
                  style={{
                    width: `${completeness}%`,
                    background: completeness >= 80 ? '#10B981' : completeness >= 50 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* â•â• Profile form â•â• */}
      <form className="vp-form-card" onSubmit={handleSave}>
        <div className="vp-card-stripe" />

        {/* Business Info */}
        <SectionHeader icon={Building2} label="Business Information" />
        <div className="vp-form-row">
          <div className="vp-field">
            <label className="vp-label" htmlFor="businessName">
              Business Name <span className="vp-required">*</span>
            </label>
            <input
              id="businessName"
              className="vp-input"
              type="text"
              placeholder="e.g. Islamabad Royal Events"
              value={form.businessName}
              onChange={updateField('businessName')}
              required
            />
          </div>
          <div className="vp-field">
            <label className="vp-label" htmlFor="category">
              Category <span className="vp-required">*</span>
            </label>
            <select
              id="category"
              className="vp-select"
              value={form.category}
              onChange={updateField('category')}
              required
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="vp-field">
          <label className="vp-label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="vp-textarea"
            rows={4}
            placeholder="Tell customers about your services, experience, and what makes you uniqueâ€¦"
            value={form.description}
            onChange={updateField('description')}
            maxLength={2000}
          />
          <span className="vp-char-count">{form.description.length} / 2000</span>
        </div>

        {/* Location */}
        <SectionHeader icon={MapPin} label="Location" />
        <div className="vp-form-row">
          <div className="vp-field">
            <label className="vp-label" htmlFor="city">City <span className="vp-required">*</span></label>
            <input
              id="city"
              className="vp-input"
              type="text"
              placeholder="e.g. Islamabad"
              value={form.city}
              onChange={updateField('city')}
              required
            />
          </div>
          <div className="vp-field">
            <label className="vp-label" htmlFor="address">Address</label>
            <input
              id="address"
              className="vp-input"
              type="text"
              placeholder="e.g. 123 Main Blvd, DHA Phase 5"
              value={form.address}
              onChange={updateField('address')}
            />
          </div>
        </div>

        <div className="vp-field">
          <label className="vp-label" htmlFor="googleMapLink">Google Map Link</label>
          <div className="vp-input-icon-wrap">
            <MapPin size={15} className="vp-input-icon" />
            <input
              id="googleMapLink"
              className="vp-input vp-input--with-icon"
              type="url"
              placeholder="https://maps.google.com/â€¦"
              value={form.googleMapLink}
              onChange={updateField('googleMapLink')}
            />
          </div>
        </div>

        {/* Contact */}
        <SectionHeader icon={Phone} label="Contact Details" />
        <div className="vp-form-row">
          <div className="vp-field">
            <label className="vp-label" htmlFor="phone">Phone</label>
            <div className="vp-input-icon-wrap">
              <Phone size={15} className="vp-input-icon" />
              <input
                id="phone"
                className="vp-input vp-input--with-icon"
                type="tel"
                placeholder="03xx-xxxxxxx"
                value={form.phone}
                onChange={updateField('phone')}
              />
            </div>
          </div>
          <div className="vp-field">
            <label className="vp-label" htmlFor="whatsapp">WhatsApp</label>
            <div className="vp-input-icon-wrap">
              <Phone size={15} className="vp-input-icon" />
              <input
                id="whatsapp"
                className="vp-input vp-input--with-icon"
                type="tel"
                placeholder="03xx-xxxxxxx"
                value={form.whatsapp}
                onChange={updateField('whatsapp')}
              />
            </div>
          </div>
        </div>

        <div className="vp-form-row">
          <div className="vp-field">
            <label className="vp-label" htmlFor="email">Business Email</label>
            <div className="vp-input-icon-wrap">
              <Mail size={15} className="vp-input-icon" />
              <input
                id="email"
                className="vp-input vp-input--with-icon"
                type="email"
                placeholder="info@yourbusiness.pk"
                value={form.email}
                onChange={updateField('email')}
              />
            </div>
          </div>
          <div className="vp-field">
            <label className="vp-label" htmlFor="website">Website</label>
            <div className="vp-input-icon-wrap">
              <Globe size={15} className="vp-input-icon" />
              <input
                id="website"
                className="vp-input vp-input--with-icon"
                type="url"
                placeholder="https://yourbusiness.pk"
                value={form.website}
                onChange={updateField('website')}
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <SectionHeader icon={Instagram} label="Social Media" />
        <div className="vp-form-row">
          <div className="vp-field">
            <label className="vp-label" htmlFor="instagram">
              <span className="vp-social-tag vp-social-tag--ig">IG</span> Instagram
            </label>
            <input
              id="instagram"
              className="vp-input"
              type="text"
              placeholder="@username"
              value={form.socialMedia.instagram}
              onChange={updateSocial('instagram')}
            />
          </div>
          <div className="vp-field">
            <label className="vp-label" htmlFor="facebook">
              <span className="vp-social-tag vp-social-tag--fb">FB</span> Facebook
            </label>
            <input
              id="facebook"
              className="vp-input"
              type="text"
              placeholder="@page"
              value={form.socialMedia.facebook}
              onChange={updateSocial('facebook')}
            />
          </div>
        </div>
        <div className="vp-form-row">
          <div className="vp-field">
            <label className="vp-label" htmlFor="tiktok">
              <span className="vp-social-tag vp-social-tag--tt">TT</span> TikTok
            </label>
            <input
              id="tiktok"
              className="vp-input"
              type="text"
              placeholder="@username"
              value={form.socialMedia.tiktok}
              onChange={updateSocial('tiktok')}
            />
          </div>
          <div className="vp-field">
            <label className="vp-label" htmlFor="youtube">
              <Youtube size={13} style={{ color: '#EF4444' }} /> YouTube
            </label>
            <input
              id="youtube"
              className="vp-input"
              type="text"
              placeholder="@channel"
              value={form.socialMedia.youtube}
              onChange={updateSocial('youtube')}
            />
          </div>
        </div>

        {/* Save button */}
        <div className="vp-form-footer">
          <button type="submit" className="vp-btn vp-btn--primary" disabled={saving}>
            <Save size={15} />
            {saving
              ? (isNew ? 'Creatingâ€¦' : 'Savingâ€¦')
              : (isNew ? 'Create Profile' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default VendorProfile;
