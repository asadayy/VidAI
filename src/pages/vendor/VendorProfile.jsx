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
  Video,
  MapPin,
  Phone,
  Mail,
  Globe,
  Building2,
  X,
  Film,
} from 'lucide-react';
import './VendorProfile.css';

const CATEGORIES = [
  { value: 'venue', label: 'Venue' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'videographer', label: 'Videographer' },
  { value: 'caterer', label: 'Caterer' },
  { value: 'decorator', label: 'Decorator' },
  { value: 'makeup_artist', label: 'Makeup Artist' },
  { value: 'mehndi_artist', label: 'Mehndi Artist' },
  { value: 'dj_music', label: 'DJ / Music' },
  { value: 'wedding_planner', label: 'Wedding Planner' },
  { value: 'invitation_cards', label: 'Invitation Cards' },
  { value: 'bridal_wear', label: 'Bridal Wear' },
  { value: 'groom_wear', label: 'Groom Wear' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'transport', label: 'Transport' },
  { value: 'florist', label: 'Florist' },
  { value: 'cake', label: 'Cake' },
  { value: 'other', label: 'Other' },
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
};

function VendorProfile() {
  const [vendor, setVendor] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingItemId, setDeletingItemId] = useState(null);

  const portfolioInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await vendorAPI.getMyProfile();
      const v = data.data.vendor;
      setVendor(v);
      setForm({
        businessName: v.businessName || '',
        category: v.category || '',
        description: v.description || '',
        city: v.city || '',
        address: v.address || '',
        phone: v.phone || '',
        whatsapp: v.whatsapp || '',
        email: v.email || '',
        website: v.website || '',
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setIsNew(true);
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Save / Create ──
  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!form.category) {
      toast.error('Please select a category');
      return;
    }
    if (!form.city.trim()) {
      toast.error('City is required');
      return;
    }

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
      const msg = err.response?.data?.message || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Cover image upload (uses dedicated endpoint — saves to DB) ──
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Cover image must be under 10 MB');
      return;
    }

    setUploadingCover(true);
    try {
      const { data } = await uploadAPI.uploadVendorCover(file);
      // The backend saves it to MongoDB and returns the updated coverImage
      setVendor((prev) => ({ ...prev, coverImage: data.data.coverImage }));
      toast.success('Cover image updated');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload cover image';
      toast.error(msg);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  // ── Portfolio upload (images + videos, saves to DB) ──
  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate sizes — images ≤ 10 MB, videos ≤ 100 MB
    for (const f of files) {
      const isVideo = f.type.startsWith('video/');
      const limit = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (f.size > limit) {
        toast.error(`${f.name} exceeds the ${isVideo ? '100 MB (video)' : '10 MB (image)'} limit`);
        return;
      }
    }

    setUploadingPortfolio(true);
    setUploadProgress(0);
    try {
      const { data } = await uploadAPI.uploadVendorPortfolio(
        files,
        '',
        (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        }
      );
      // Backend returns the full updated portfolio array
      setVendor((prev) => ({ ...prev, portfolio: data.data.portfolio }));
      toast.success(`${data.data.added.length} item(s) added to portfolio`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload files';
      toast.error(msg);
    } finally {
      setUploadingPortfolio(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  // ── Delete a portfolio item ──
  const handleDeletePortfolioItem = async (itemId) => {
    setDeletingItemId(itemId);
    try {
      const { data } = await uploadAPI.deleteVendorPortfolioItem(itemId);
      setVendor((prev) => ({ ...prev, portfolio: data.data.portfolio }));
      toast.success('Item removed from portfolio');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove item';
      toast.error(msg);
    } finally {
      setDeletingItemId(null);
    }
  };

  if (loading) return <Loading fullScreen message="Loading profile..." />;

  const verificationBadge = vendor?.verificationStatus && (
    <span className={`badge ${vendor.verificationStatus === 'approved' ? 'badge-success' :
        vendor.verificationStatus === 'rejected' ? 'badge-danger' :
          'badge-warning'
      }`}>
      {vendor.verificationStatus === 'approved' ? 'Verified' :
        vendor.verificationStatus === 'rejected' ? 'Rejected' :
          'Pending Verification'}
    </span>
  );

  const portfolio = vendor?.portfolio || [];

  return (
    <div className="vendor-profile">
      <div className="page-header">
        <div>
          <h1>{isNew ? 'Create Your Profile' : 'Edit Profile'}</h1>
          <p className="page-subtitle">
            {isNew
              ? 'Set up your vendor profile to start receiving bookings'
              : 'Keep your business information up to date'}
          </p>
        </div>
        {verificationBadge}
      </div>

      {/* ── Cover image ── */}
      {!isNew && (
        <div className="profile-cover-section">
          <div
            className="profile-cover"
            style={{
              backgroundImage: vendor?.coverImage?.url
                ? `url(${vendor.coverImage.url})`
                : undefined,
            }}
          >
            {!vendor?.coverImage?.url && (
              <div className="cover-placeholder">
                <ImageIcon size={32} />
                <span>Add a cover image</span>
              </div>
            )}
            <label className={`cover-upload-btn btn btn-outline btn-sm ${uploadingCover ? 'loading' : ''}`}>
              <Upload size={14} />
              {uploadingCover ? 'Uploading...' : 'Change Cover'}
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
          {vendor?.profileCompleteness !== undefined && (
            <div className="completeness-bar">
              <div className="completeness-label">
                <span>Profile Completeness</span>
                <strong>{vendor.profileCompleteness}%</strong>
              </div>
              <div className="completeness-track">
                <div
                  className="completeness-fill"
                  style={{ width: `${vendor.profileCompleteness}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Profile form ── */}
      <form className="profile-form card" onSubmit={handleSave}>
        <h3>
          <Building2 size={18} /> Business Information
        </h3>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="businessName">Business Name *</label>
            <input
              id="businessName"
              type="text"
              placeholder="e.g. Lahore Royal Events"
              value={form.businessName}
              onChange={updateField('businessName')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
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

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Tell customers about your services, experience, and what makes you unique..."
            value={form.description}
            onChange={updateField('description')}
            maxLength={2000}
          />
          <span className="form-help">{form.description.length}/2000 characters</span>
        </div>

        <h3>
          <MapPin size={18} /> Location
        </h3>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City *</label>
            <input
              id="city"
              type="text"
              placeholder="e.g. Lahore"
              value={form.city}
              onChange={updateField('city')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              type="text"
              placeholder="e.g. 123 Main Blvd, DHA Phase 5"
              value={form.address}
              onChange={updateField('address')}
            />
          </div>
        </div>

        <h3>
          <Phone size={18} /> Contact Details
        </h3>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              placeholder="03xx-xxxxxxx"
              value={form.phone}
              onChange={updateField('phone')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="whatsapp">WhatsApp</label>
            <input
              id="whatsapp"
              type="tel"
              placeholder="03xx-xxxxxxx"
              value={form.whatsapp}
              onChange={updateField('whatsapp')}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">
              <Mail size={13} /> Business Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="info@yourbusiness.pk"
              value={form.email}
              onChange={updateField('email')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="website">
              <Globe size={13} /> Website
            </label>
            <input
              id="website"
              type="url"
              placeholder="https://yourbusiness.pk"
              value={form.website}
              onChange={updateField('website')}
            />
          </div>
        </div>

        <div className="profile-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} />
            {saving
              ? (isNew ? 'Creating...' : 'Saving...')
              : (isNew ? 'Create Profile' : 'Save Changes')}
          </button>
        </div>
      </form>

      {/* ── Portfolio section (only when profile already exists) ── */}
      {!isNew && (
        <div className="card portfolio-section">
          <div className="card-header">
            <h3>
              <ImageIcon size={18} /> Portfolio Gallery
            </h3>
            <div className="portfolio-upload-actions">
              <label
                className={`btn btn-outline btn-sm portfolio-upload-btn ${uploadingPortfolio ? 'loading' : ''}`}
              >
                <Upload size={14} />
                {uploadingPortfolio
                  ? `Uploading${uploadProgress > 0 ? ` ${uploadProgress}%` : '...'}`
                  : 'Upload Images / Videos'}
                <input
                  ref={portfolioInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm,video/mpeg"
                  multiple
                  hidden
                  onChange={handlePortfolioUpload}
                  disabled={uploadingPortfolio}
                />
              </label>
            </div>
          </div>

          {/* Upload hint */}
          <p className="portfolio-hint">
            Accepted: JPEG, PNG, WebP, GIF (≤ 10 MB) · MP4, MOV, AVI, WebM (≤ 100 MB)
          </p>

          {/* Upload progress bar */}
          {uploadingPortfolio && uploadProgress > 0 && (
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          {portfolio.length === 0 ? (
            <div className="empty-state">
              <ImageIcon size={40} className="empty-icon" />
              <p>No portfolio items yet. Upload photos or videos of your work to attract customers.</p>
            </div>
          ) : (
            <div className="portfolio-grid">
              {portfolio.map((item, i) => (
                <div key={item._id || item.publicId || i} className="portfolio-item">
                  {item.resourceType === 'video' ? (
                    <video
                      src={item.url}
                      controls
                      preload="metadata"
                      className="portfolio-video"
                    />
                  ) : (
                    <img src={item.url} alt={item.caption || `Portfolio ${i + 1}`} />
                  )}

                  {/* Media type badge */}
                  <span className="portfolio-type-badge">
                    {item.resourceType === 'video' ? (
                      <><Film size={11} /> Video</>
                    ) : (
                      <><ImageIcon size={11} /> Photo</>
                    )}
                  </span>

                  {item.caption && (
                    <span className="portfolio-caption">{item.caption}</span>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    className="portfolio-delete-btn"
                    onClick={() => handleDeletePortfolioItem(item._id)}
                    disabled={deletingItemId === item._id}
                    title="Remove from portfolio"
                  >
                    {deletingItemId === item._id ? (
                      <span className="spinner-xs" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VendorProfile;
