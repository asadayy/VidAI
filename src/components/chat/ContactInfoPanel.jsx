import { X, Mail, Phone, MapPin, Calendar, User, Star, Cake, Hash, Heart, Users, MapPinned, Utensils, Wallet } from 'lucide-react';
import './ContactInfoPanel.css';

const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(n || 0);

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="cip-detail-row">
      <div className="cip-detail-icon">
        <Icon size={16} />
      </div>
      <div className="cip-detail-content">
        <span className="cip-detail-label">{label}</span>
        <span className="cip-detail-value">{value}</span>
      </div>
    </div>
  );
}

export default function ContactInfoPanel({ conversation, userRole, onClose }) {
  if (!conversation) return null;

  const isVendor = userRole === 'vendor';
  const other = conversation.otherParticipant;
  const vendor = conversation.vendor;

  const name = isVendor
    ? other?.name || 'Customer'
    : vendor?.businessName || 'Vendor';

  const avatar = isVendor ? other?.avatar : vendor?.coverImage;
  const avatarUrl = avatar?.url || avatar;
  const email = other?.email;
  const role = other?.role;

  const memberSince = other?.createdAt
    ? new Date(other.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Customer details (visible to vendors)
  const phone = other?.phone;
  const city = other?.city;
  const area = other?.area;
  const zipCode = other?.zipCode;
  const gender = other?.gender && other.gender !== 'prefer-not-to-say'
    ? other.gender.charAt(0).toUpperCase() + other.gender.slice(1)
    : null;
  const dob = fmtDate(other?.dateOfBirth);
  const bio = other?.bio;

  // Onboarding / event details
  const ob = other?.onboarding;
  const eventTypes = ob?.eventTypes?.length ? ob.eventTypes.join(', ') : null;
  const eventDate = fmtDate(ob?.eventDate);
  const weddingLocation = ob?.weddingLocation;
  const venueType = ob?.venueType;
  const guestCount = ob?.guestCount;
  const foodPref = ob?.foodPreference;
  const totalBudget = ob?.totalBudget ? fmtCurrency(ob.totalBudget) : null;

  // Location string
  const locationParts = [area, city, zipCode].filter(Boolean);
  const location = locationParts.length ? locationParts.join(', ') : null;

  // Vendor-side category
  const category = vendor?.category;

  return (
    <div className="contact-info-panel">
      <div className="cip-header">
        <button className="cip-close-btn" onClick={onClose} title="Close">
          <X size={20} />
        </button>
        <span className="cip-header-title">Contact Info</span>
      </div>

      <div className="cip-profile">
        <div className="cip-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} />
          ) : (
            <span>{getInitials(name)}</span>
          )}
        </div>
        <h3 className="cip-name">{name}</h3>
        {email && <p className="cip-email">{email}</p>}
        {role && (
          <span className="cip-role-badge">
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        )}
      </div>

      {/* Contact details */}
      <div className="cip-section">
        <div className="cip-section-title">Contact</div>
        <div className="cip-details">
          <DetailRow icon={Mail} label="Email" value={email} />
          <DetailRow icon={Phone} label="Phone" value={phone} />
          <DetailRow icon={MapPin} label="Location" value={location} />
        </div>
      </div>

      {/* Personal info */}
      {(gender || dob || bio) && (
        <div className="cip-section">
          <div className="cip-section-title">Personal</div>
          <div className="cip-details">
            <DetailRow icon={User} label="Gender" value={gender} />
            <DetailRow icon={Cake} label="Date of Birth" value={dob} />
            {bio && (
              <div className="cip-bio-section">
                <span className="cip-detail-label">About</span>
                <p className="cip-bio-text">{bio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event / Wedding details (from onboarding) */}
      {isVendor && (eventTypes || eventDate || weddingLocation || venueType || guestCount || foodPref || totalBudget) && (
        <div className="cip-section">
          <div className="cip-section-title">Event Details</div>
          <div className="cip-details">
            <DetailRow icon={Heart} label="Event Type" value={eventTypes} />
            <DetailRow icon={Calendar} label="Event Date" value={eventDate} />
            <DetailRow icon={MapPinned} label="Wedding Location" value={weddingLocation} />
            <DetailRow icon={Star} label="Venue Type" value={venueType} />
            <DetailRow icon={Users} label="Guest Count" value={guestCount} />
            <DetailRow icon={Utensils} label="Food Preference" value={foodPref} />
            <DetailRow icon={Wallet} label="Total Budget" value={totalBudget} />
          </div>
        </div>
      )}

      {/* Vendor category (visible to customers) */}
      {!isVendor && category && (
        <div className="cip-section">
          <div className="cip-section-title">Vendor</div>
          <div className="cip-details">
            <DetailRow icon={Star} label="Category" value={category} />
          </div>
        </div>
      )}

      {/* Member since */}
      {memberSince && (
        <div className="cip-section">
          <div className="cip-details">
            <DetailRow icon={Calendar} label="Member Since" value={memberSince} />
          </div>
        </div>
      )}
    </div>
  );
}
