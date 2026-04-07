import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/auth';
import { eventAPI } from '../api/events';
import { theme } from '../constants/theme';
import ProtectedRoute from '../components/ProtectedRoute';

const GENDER_OPTIONS = [
  { label: 'Select gender', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

const EVENT_TYPES = ['Baraat', 'Walima', 'Mehndi', 'Nikkah', 'Engagement', 'Other'];
const VENUE_TYPES = ['Banquet Hall', 'Outdoor Garden', 'Farmhouse', 'Marquee'];

const EVENT_COLORS = {
  dholki: '#f59e0b', mayun: '#eab308', mehndi: '#10b981', nikkah: '#6366f1',
  baraat: '#D7385E', walima: '#8b5cf6', engagement: '#ec4899', other: '#64748b',
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  // Wedding events (tab-based, like web)
  const [events, setEvents] = useState([]);
  const [activeEventIdx, setActiveEventIdx] = useState(0);
  const [eventForms, setEventForms] = useState({});
  const [eventSaving, setEventSaving] = useState(false);
  const [showVenueTypePicker, setShowVenueTypePicker] = useState(false);

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
        dateOfBirth: user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split('T')[0]
          : '',
        gender: user.gender || '',
        city: user.city || '',
        area: user.area || '',
        zipCode: user.zipCode || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // Fetch wedding events
  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await eventAPI.getAll();
      const evts = res.data?.data?.events || [];
      setEvents(evts);
      const forms = {};
      evts.forEach(evt => {
        forms[evt._id] = {
          eventDate: evt.eventDate ? new Date(evt.eventDate).toISOString().split('T')[0] : '',
          venue: evt.venue || '',
          venueType: evt.venueType || '',
          guestCount: evt.guestCount ? String(evt.guestCount) : '',
          allocatedBudget: evt.allocatedBudget ? String(evt.allocatedBudget) : '',
          notes: evt.notes || '',
        };
      });
      setEventForms(forms);
    } catch { /* Events are optional */ }
  }, []);

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
      Toast.show({ type: 'success', text1: 'Event updated!' });
      fetchEvents();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update event' });
    } finally {
      setEventSaving(false);
    }
  };

  const handleAddEvent = async (eventType) => {
    try {
      setEventSaving(true);
      await eventAPI.create({ eventType: eventType.toLowerCase(), title: eventType });
      Toast.show({ type: 'success', text1: `${eventType} event added!` });
      await fetchEvents();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add event';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setEventSaving(true);
      await eventAPI.delete(eventId);
      Toast.show({ type: 'success', text1: 'Event removed' });
      await fetchEvents();
      setActiveEventIdx(0);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete event' });
    } finally {
      setEventSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission needed to access photos' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'Image must be under 5MB' });
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'avatar.jpg',
      });
      formData.append('folder', 'avatars');

      const { data: uploadData } = await authAPI.uploadImage(formData);
      const avatar = {
        url: uploadData.data?.url || uploadData.data?.secure_url,
        publicId: uploadData.data?.publicId || uploadData.data?.public_id || '',
      };

      const { data } = await authAPI.updateProfile({ avatar });
      const updatedUser = data.data.user;
      updateUser(updatedUser);
      Toast.show({ type: 'success', text1: 'Profile picture updated' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Name is required' });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.dateOfBirth) delete payload.dateOfBirth;

      const { data } = await authAPI.updateProfile(payload);
      const updatedUser = data.data.user;
      updateUser(updatedUser);
      Toast.show({ type: 'success', text1: 'Profile updated successfully' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const genderLabel =
    GENDER_OPTIONS.find((g) => g.value === form.gender)?.label || 'Select gender';

  // Derive active event + its form
  const activeEvent = events[activeEventIdx] || null;
  const activeEf = activeEvent ? (eventForms[activeEvent._id] || {}) : {};
  const usedTypes = events.map(e => e.eventType);
  const availableTypes = EVENT_TYPES.filter(t => !usedTypes.includes(t.toLowerCase()));

  return (
    <ProtectedRoute roles="user">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Gradient Banner + Avatar ── */}
          <View style={styles.headerCard}>
            <LinearGradient
              colors={['#ec4899', '#f97316', '#a855f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.banner}
            >
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.bannerTitle}>My Profile</Text>
              <View style={{ width: 36 }} />
            </LinearGradient>

            <View style={styles.avatarSection}>
              <View style={styles.avatarRing}>
                <LinearGradient
                  colors={['#ec4899', '#a855f6']}
                  style={styles.avatarRingGradient}
                >
                  <View style={styles.avatarInner}>
                    {user?.avatar?.url ? (
                      <Image source={{ uri: user.avatar.url }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
                    )}
                  </View>
                </LinearGradient>
                <TouchableOpacity
                  style={styles.avatarUploadBtn}
                  onPress={handleAvatarUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size={12} color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={13} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.avatarName}>{user?.name || 'User'}</Text>
              <View style={styles.metaPills}>
                <View style={styles.metaPill}>
                  <Ionicons name="mail-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.metaPillText}>{user?.email}</Text>
                </View>
                {memberSince ? (
                  <View style={styles.metaPill}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.metaPillText}>{memberSince}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── Personal Information ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#fce4ec' }]}>
                <Ionicons name="person-outline" size={15} color="#D7385E" />
              </View>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => handleChange('name', v)}
                  placeholder="Your full name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                    style={styles.inputIconLeft}
                  />
                  <TextInput
                    style={[styles.input, { paddingLeft: 36 }]}
                    value={form.phone}
                    onChangeText={(v) => handleChange('phone', v)}
                    placeholder="e.g. 0300-1234567"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={form.dateOfBirth}
                  onChangeText={(v) => handleChange('dateOfBirth', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Gender</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setShowGenderPicker(!showGenderPicker)}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !form.gender && { color: theme.colors.textSecondary },
                    ]}
                  >
                    {genderLabel}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                {showGenderPicker && (
                  <View style={styles.pickerDropdown}>
                    {GENDER_OPTIONS.filter((g) => g.value).map((g) => (
                      <TouchableOpacity
                        key={g.value}
                        style={[
                          styles.pickerOption,
                          form.gender === g.value && styles.pickerOptionActive,
                        ]}
                        onPress={() => {
                          handleChange('gender', g.value);
                          setShowGenderPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            form.gender === g.value &&
                              styles.pickerOptionTextActive,
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Location ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="location-outline" size={15} color="#f97316" />
              </View>
              <Text style={styles.sectionTitle}>Location</Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={form.city}
                  onChangeText={(v) => handleChange('city', v)}
                  placeholder="e.g. Islamabad"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Area / Neighborhood</Text>
                <TextInput
                  style={styles.input}
                  value={form.area}
                  onChangeText={(v) => handleChange('area', v)}
                  placeholder="e.g. Gulberg III"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.fieldFull}>
              <Text style={styles.label}>Zip / Postal Code</Text>
              <TextInput
                style={styles.input}
                value={form.zipCode}
                onChangeText={(v) => handleChange('zipCode', v)}
                placeholder="e.g. 54000"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* ── About You ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="create-outline" size={15} color="#8b5cf6" />
              </View>
              <Text style={styles.sectionTitle}>About You</Text>
            </View>

            <View style={styles.fieldFull}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.bio}
                onChangeText={(v) => handleChange('bio', v.slice(0, 300))}
                placeholder="Tell vendors a little about yourself or your event..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={styles.charCount}>{form.bio.length}/300</Text>
            </View>
          </View>

          {/* ── Event Details ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="heart-outline" size={15} color="#ef4444" />
              </View>
              <Text style={styles.sectionTitle}>Event Details</Text>
            </View>

            {/* Event Tabs */}
            {events.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.eventTabsScroll}
                contentContainerStyle={styles.eventTabsContent}
              >
                {events.map((evt, idx) => {
                  const evtColor = evt.color || EVENT_COLORS[evt.eventType] || '#64748b';
                  const isActive = idx === activeEventIdx;
                  return (
                    <TouchableOpacity
                      key={evt._id}
                      style={[
                        styles.eventTab,
                        isActive && { backgroundColor: evtColor, borderColor: evtColor },
                      ]}
                      onPress={() => { setActiveEventIdx(idx); setShowVenueTypePicker(false); }}
                    >
                      <View style={[styles.eventTabDot, { backgroundColor: isActive ? '#fff' : evtColor }]} />
                      <Text style={[styles.eventTabText, isActive && { color: '#fff' }]}>
                        {evt.title || evt.eventType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Per-event form */}
            {activeEvent && (() => {
              const evtColor = activeEvent.color || EVENT_COLORS[activeEvent.eventType] || '#64748b';
              return (
                <View style={styles.eventFormCard}>
                  <View style={[styles.eventFormStripe, { backgroundColor: evtColor }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Event Date</Text>
                      <TextInput
                        style={styles.input}
                        value={activeEf.eventDate || ''}
                        onChangeText={v => handleEventFormChange(activeEvent._id, 'eventDate', v)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Venue / Location</Text>
                      <TextInput
                        style={styles.input}
                        value={activeEf.venue || ''}
                        onChangeText={v => handleEventFormChange(activeEvent._id, 'venue', v)}
                        placeholder="e.g. Islamabad"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Venue Type</Text>
                      <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => setShowVenueTypePicker(!showVenueTypePicker)}
                      >
                        <Text style={[styles.selectText, !activeEf.venueType && { color: theme.colors.textSecondary }]}>
                          {activeEf.venueType || 'Select venue'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      {showVenueTypePicker && (
                        <View style={styles.pickerDropdown}>
                          {VENUE_TYPES.map(v => (
                            <TouchableOpacity
                              key={v}
                              style={[styles.pickerOption, activeEf.venueType === v && styles.pickerOptionActive]}
                              onPress={() => {
                                handleEventFormChange(activeEvent._id, 'venueType', v);
                                setShowVenueTypePicker(false);
                              }}
                            >
                              <Text style={[styles.pickerOptionText, activeEf.venueType === v && styles.pickerOptionTextActive]}>
                                {v}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Guest Count</Text>
                      <TextInput
                        style={styles.input}
                        value={activeEf.guestCount || ''}
                        onChangeText={v => handleEventFormChange(activeEvent._id, 'guestCount', v)}
                        placeholder="e.g. 200"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Budget (PKR)</Text>
                      <TextInput
                        style={styles.input}
                        value={activeEf.allocatedBudget || ''}
                        onChangeText={v => handleEventFormChange(activeEvent._id, 'allocatedBudget', v)}
                        placeholder="e.g. 1000000"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>Notes</Text>
                      <TextInput
                        style={styles.input}
                        value={activeEf.notes || ''}
                        onChangeText={v => handleEventFormChange(activeEvent._id, 'notes', v)}
                        placeholder="Any extra details..."
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.eventFormActions}>
                    <TouchableOpacity
                      style={[styles.eventSaveBtn, { backgroundColor: evtColor }]}
                      onPress={() => handleSaveEvent(activeEvent._id)}
                      disabled={eventSaving}
                    >
                      {eventSaving ? (
                        <ActivityIndicator size={13} color="#fff" />
                      ) : (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                      <Text style={styles.eventSaveBtnText}>
                        {eventSaving ? 'Saving...' : 'Save Event'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.eventDeleteBtn}
                      onPress={() => handleDeleteEvent(activeEvent._id)}
                      disabled={eventSaving}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      <Text style={styles.eventDeleteBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* Add event row */}
            {availableTypes.length > 0 && events.length > 0 && (
              <View style={styles.addEventRow}>
                <Text style={styles.addEventLabel}>Add Event:</Text>
                <View style={styles.chipGroup}>
                  {availableTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={styles.addChip}
                      onPress={() => handleAddEvent(type)}
                      disabled={eventSaving}
                    >
                      <Ionicons name="add" size={13} color={theme.colors.primary} />
                      <Text style={styles.addChipText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Empty state */}
            {events.length === 0 && (
              <View style={styles.eventEmpty}>
                <View style={styles.eventEmptyIcon}>
                  <Ionicons name="heart" size={28} color="#D7385E" />
                </View>
                <Text style={styles.eventEmptyTitle}>No events yet</Text>
                <Text style={styles.eventEmptyDesc}>
                  Add your first event to start planning your dream wedding.
                </Text>
                <View style={styles.chipGroup}>
                  {EVENT_TYPES.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={styles.addChip}
                      onPress={() => handleAddEvent(type)}
                      disabled={eventSaving}
                    >
                      <Ionicons name="add" size={13} color={theme.colors.primary} />
                      <Text style={styles.addChipText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* ── Save Profile Button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ec4899', '#D7385E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              {saving ? (
                <ActivityIndicator size={16} color="#fff" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              )}
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },

  /* ── Header / Banner ── */
  headerCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  banner: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 14,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  /* ── Avatar ── */
  avatarSection: {
    alignItems: 'center',
    marginTop: -40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  avatarRing: {
    marginBottom: 10,
  },
  avatarRingGradient: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatarInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  avatarUploadBtn: {
    position: 'absolute',
    bottom: 12,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  metaPillText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  /* ── Sections ── */
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    ...theme.shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },

  /* ── Fields ── */
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldFull: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  inputIcon: {
    position: 'relative',
  },
  inputIconLeft: {
    position: 'absolute',
    left: 10,
    top: 12,
    zIndex: 1,
  },
  charCount: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },

  /* ── Select / Dropdown ── */
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  pickerDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerOptionActive: {
    backgroundColor: '#fce4ec',
  },
  pickerOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  pickerOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  /* ── Event Tabs ── */
  eventTabsScroll: {
    marginBottom: 12,
  },
  eventTabsContent: {
    gap: 8,
  },
  eventTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  eventTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },

  /* ── Event Form Card ── */
  eventFormCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  eventFormStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  eventFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  eventSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  eventSaveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  eventDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  eventDeleteBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
  },

  /* ── Add Event ── */
  addEventRow: {
    marginTop: 4,
  },
  addEventLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fce4ec',
    borderWidth: 1,
    borderColor: '#f9a8c9',
  },
  addChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  /* ── Event Empty ── */
  eventEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  eventEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fce4ec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  eventEmptyDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  /* ── Save Button ── */
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
