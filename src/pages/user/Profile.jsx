import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, eventAPI } from '../../api';
import { uploadAPI } from '../../api/upload';
import { Camera, Save, User, MapPin, Calendar, Mail, Phone, Heart, Plus, Trash2, Sparkles, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import './Profile.css';

const EVENT_TYPES = ['Baraat', 'Walima', 'Mehndi', 'Nikkah', 'Engagement', 'Other'];
const VENUE_TYPES = ['Banquet Hall', 'Outdoor Garden', 'Farmhouse', 'Marquee'];
const FOOD_OPTIONS = ['Full Buffet', 'Hi-Tea', 'Sit-down Dinner', 'Mixed / Fusion', 'No Preference'];

const EVENT_COLORS = {
  dholki: '#f59e0b', mayun: '#eab308', mehndi: '#10b981', nikkah: '#6366f1',
  baraat: '#D7385E', walima: '#8b5cf6', engagement: '#ec4899', other: '#64748b',
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Wedding events (tab-based)
  const [events, setEvents] = useState([]);
  const [activeEventIdx, setActiveEventIdx] = useState(0);
  const [eventForms, setEventForms] = useState({});
  const [eventSaving, setEventSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    area: '',
    zipCode: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        city: user.city || '',
        area: user.area || '',
        zipCode: user.zipCode || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // Fetch wedding events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await eventAPI.getAll();
      const evts = res.data?.data?.events || [];
      setEvents(evts);
      // Build per-event form state
      const forms = {};
      evts.forEach(evt => {
        forms[evt._id] = {
          eventDate: evt.eventDate ? new Date(evt.eventDate).toISOString().split('T')[0] : '',
          venue: evt.venue || '',
          venueType: evt.venueType || '',
          guestCount: evt.guestCount || '',
          allocatedBudget: evt.allocatedBudget || '',
          notes: evt.notes || '',
        };
      });
      setEventForms(forms);
    } catch {
      // Events are optional
    }
  };

  const handleEventFormChange = (eventId, field, value) => {
    setEventForms(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], [field]: value },
    }));
  };

  const handleSaveEvent = async (eventId) => {
    const ef = eventForms[eventId];
    if (!ef) return;
    setEventSaving(true);
    try {
      const payload = {
        venue: ef.venue,
        venueType: ef.venueType,
        guestCount: ef.guestCount ? Number(ef.guestCount) : 0,
        allocatedBudget: ef.allocatedBudget ? Number(ef.allocatedBudget) : 0,
        notes: ef.notes,
      };
      if (ef.eventDate) payload.eventDate = ef.eventDate;
      await eventAPI.update(eventId, payload);
      toast.success('Event updated!');
      fetchEvents();
    } catch {
      toast.error('Failed to update event');
    } finally {
      setEventSaving(false);
    }
  };

  const handleAddEvent = async (eventType) => {
    try {
      setEventSaving(true);
      await eventAPI.create({ eventType: eventType.toLowerCase(), title: eventType });
      toast.success(`${eventType} event added!`);
      await fetchEvents();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add event';
      toast.error(msg);
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setEventSaving(true);
      await eventAPI.delete(eventId);
      toast.success('Event removed');
      await fetchEvents();
      setActiveEventIdx(0);
    } catch {
      toast.error('Failed to delete event');
    } finally {
      setEventSaving(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const { data: uploadData } = await uploadAPI.uploadImage(file, 'avatars');
      const avatar = {
        url: uploadData.data.url || uploadData.data.secure_url,
        publicId: uploadData.data.publicId || uploadData.data.public_id || '',
      };
      const { data } = await authAPI.updateProfile({ avatar });
      updateUser(data.data.user);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.dateOfBirth) delete payload.dateOfBirth;

      const { data } = await authAPI.updateProfile(payload);
      updateUser(data.data.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="profile-page">
      <div className="profile-header-card">
        <div className="profile-header-banner">
          <div className="profile-banner-deco" />
        </div>
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-ring">
              <div className="profile-avatar-lg">
                {user?.avatar?.url ? (
                  <img src={user.avatar.url} alt="" />
                ) : (
                  <span>{(user?.name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <button
              className="profile-avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change photo"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              hidden
            />
          </div>
          <div className="profile-header-info">
            <h1>{user?.name || 'User'}</h1>
            <div className="profile-header-meta">
              <span className="profile-meta-pill">
                <Mail size={12} />
                {user?.email}
              </span>
              {memberSince && (
                <span className="profile-meta-pill">
                  <Calendar size={12} />
                  {memberSince}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="profile-section">
          <h2 className="profile-section-title">
            <span className="profile-icon-badge pink"><User size={16} /></span>
            Personal Information
          </h2>
          <div className="profile-grid">
            <div className="profile-field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="profile-field">
              <label htmlFor="phone">Phone Number</label>
              <div className="profile-input-icon">
                <Phone size={16} />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. 0300-1234567"
                />
              </div>
            </div>
            <div className="profile-field">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
              />
            </div>
            <div className="profile-field">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2 className="profile-section-title">
            <span className="profile-icon-badge orange"><MapPin size={16} /></span>
            Location
          </h2>
          <div className="profile-grid">
            <div className="profile-field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Islamabad"
              />
            </div>
            <div className="profile-field">
              <label htmlFor="area">Area / Neighborhood</label>
              <input
                id="area"
                name="area"
                type="text"
                value={form.area}
                onChange={handleChange}
                placeholder="e.g. Gulberg III"
              />
            </div>
            <div className="profile-field">
              <label htmlFor="zipCode">Zip / Postal Code</label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                value={form.zipCode}
                onChange={handleChange}
                placeholder="e.g. 54000"
              />
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2 className="profile-section-title">
            <span className="profile-icon-badge purple"><PenLine size={16} /></span>
            About You
          </h2>
          <div className="profile-field full-width">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell vendors a little about yourself or your event..."
              rows={3}
              maxLength={300}
            />
            <span className="profile-char-count">{form.bio.length}/300</span>
          </div>
        </div>

        <div className="profile-section">
          <h2 className="profile-section-title">
            <span className="profile-icon-badge red"><Heart size={16} /></span>
            Event Details
          </h2>

          {/* Event tabs */}
          {events.length > 0 && (
            <div className="profile-event-tabs">
              {events.map((evt, idx) => {
                const evtColor = evt.color || EVENT_COLORS[evt.eventType] || '#64748b';
                return (
                  <button
                    key={evt._id}
                    type="button"
                    className={`profile-event-tab ${idx === activeEventIdx ? 'active' : ''}`}
                    style={idx === activeEventIdx ? { '--evt-color': evtColor } : undefined}
                    onClick={() => setActiveEventIdx(idx)}
                  >
                    <span className="profile-event-tab-dot" style={{ background: evtColor }} />
                    {evt.title || evt.eventType}
                  </button>
                );
              })}
            </div>
          )}

          {/* Per-event form */}
          {events.length > 0 && events[activeEventIdx] && (() => {
            const evt = events[activeEventIdx];
            const ef = eventForms[evt._id] || {};
            const evtColor = evt.color || EVENT_COLORS[evt.eventType] || '#64748b';
            return (
              <div className="profile-event-form" style={{ '--evt-color': evtColor }}>
                <div className="profile-event-form-stripe" style={{ background: evtColor }} />
                <div className="profile-grid">
                  <div className="profile-field">
                    <label>Event Date</label>
                    <input
                      type="date"
                      value={ef.eventDate || ''}
                      onChange={e => handleEventFormChange(evt._id, 'eventDate', e.target.value)}
                    />
                  </div>
                  <div className="profile-field">
                    <label>Venue / Location</label>
                    <input
                      type="text"
                      value={ef.venue || ''}
                      onChange={e => handleEventFormChange(evt._id, 'venue', e.target.value)}
                      placeholder="e.g. Islamabad"
                    />
                  </div>
                  <div className="profile-field">
                    <label>Venue Type</label>
                    <select
                      value={ef.venueType || ''}
                      onChange={e => handleEventFormChange(evt._id, 'venueType', e.target.value)}
                    >
                      <option value="">Select venue type</option>
                      {VENUE_TYPES.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="profile-field">
                    <label>Guest Count</label>
                    <input
                      type="number"
                      value={ef.guestCount || ''}
                      onChange={e => handleEventFormChange(evt._id, 'guestCount', e.target.value)}
                      placeholder="e.g. 200"
                      min="1"
                    />
                  </div>
                  <div className="profile-field">
                    <label>Allocated Budget (PKR)</label>
                    <input
                      type="number"
                      value={ef.allocatedBudget || ''}
                      onChange={e => handleEventFormChange(evt._id, 'allocatedBudget', e.target.value)}
                      placeholder="e.g. 1000000"
                      min="0"
                    />
                  </div>
                  <div className="profile-field">
                    <label>Notes</label>
                    <input
                      type="text"
                      value={ef.notes || ''}
                      onChange={e => handleEventFormChange(evt._id, 'notes', e.target.value)}
                      placeholder="Any extra details..."
                    />
                  </div>
                </div>
                <div className="profile-event-actions">
                  <button
                    type="button"
                    className="profile-event-save-btn"
                    style={{ background: evtColor }}
                    disabled={eventSaving}
                    onClick={() => handleSaveEvent(evt._id)}
                  >
                    <Save size={14} />
                    {eventSaving ? 'Saving...' : 'Save Event'}
                  </button>
                  <button
                    type="button"
                    className="profile-event-delete-btn"
                    disabled={eventSaving}
                    onClick={() => handleDeleteEvent(evt._id)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Add event row */}
          {(() => {
            const usedTypes = events.map(e => e.eventType);
            const available = EVENT_TYPES.filter(t => !usedTypes.includes(t.toLowerCase()));
            if (available.length === 0) return null;
            return (
              <div className="profile-add-event">
                <span className="profile-add-event-label">Add Event:</span>
                <div className="profile-chip-group">
                  {available.map(type => (
                    <button
                      key={type}
                      type="button"
                      className="profile-chip"
                      disabled={eventSaving}
                      onClick={() => handleAddEvent(type)}
                    >
                      <Plus size={12} />
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {events.length === 0 && (
            <div className="profile-event-empty">
              <div className="profile-event-empty-icon">
                <Heart size={28} />
              </div>
              <p className="profile-event-empty-title">No events yet</p>
              <p className="profile-event-empty-desc">Add your first event to start planning your dream wedding.</p>
              <div className="profile-chip-group" style={{ justifyContent: 'center' }}>
                {EVENT_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    className="profile-chip"
                    disabled={eventSaving}
                    onClick={() => handleAddEvent(type)}
                  >
                    <Plus size={12} />
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button type="submit" className="profile-save-btn" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
