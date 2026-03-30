import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/auth';
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
const FOOD_OPTIONS = ['Full Buffet', 'Hi-Tea', 'Sit-down Dinner', 'Mixed / Fusion', 'No Preference'];

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
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    area: '',
    zipCode: '',
    bio: '',
    eventTypes: [],
    eventDate: '',
    weddingLocation: '',
    venueType: '',
    guestCount: '',
    foodPreference: '',
    totalBudget: '',
  });

  useEffect(() => {
    if (user) {
      const ob = user.onboarding || {};
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
        eventTypes: ob.eventTypes || [],
        eventDate: ob.eventDate
          ? new Date(ob.eventDate).toISOString().split('T')[0]
          : '',
        weddingLocation: ob.weddingLocation || '',
        venueType: ob.venueType || '',
        guestCount: ob.guestCount ? String(ob.guestCount) : '',
        foodPreference: ob.foodPreference || '',
        totalBudget: ob.totalBudget ? String(ob.totalBudget) : '',
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEventType = (type) => {
    setForm((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(type)
        ? prev.eventTypes.filter((t) => t !== type)
        : [...prev.eventTypes, type],
    }));
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
      const { eventTypes, eventDate, weddingLocation, venueType, guestCount, foodPreference, totalBudget, ...profileFields } = form;
      const payload = { ...profileFields };
      if (!payload.dateOfBirth) delete payload.dateOfBirth;

      const onboarding = {};
      if (eventTypes.length) onboarding.eventTypes = eventTypes;
      if (eventDate) onboarding.eventDate = eventDate;
      if (weddingLocation) onboarding.weddingLocation = weddingLocation;
      if (venueType) onboarding.venueType = venueType;
      if (guestCount) onboarding.guestCount = Number(guestCount);
      if (foodPreference) onboarding.foodPreference = foodPreference;
      if (totalBudget) onboarding.totalBudget = Number(totalBudget);
      if (Object.keys(onboarding).length) payload.onboarding = onboarding;

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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarLg}>
                {user?.avatar?.url ? (
                  <Image
                    source={{ uri: user.avatar.url }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {getInitials(user?.name)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.avatarUploadBtn}
                onPress={handleAvatarUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size={12} color={theme.colors.primary} />
                ) : (
                  <Ionicons
                    name="camera"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarName}>{user?.name || 'User'}</Text>
            <View style={styles.avatarMeta}>
              <Ionicons
                name="mail-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.avatarMetaText}>{user?.email}</Text>
            </View>
            {memberSince ? (
              <View style={styles.avatarMeta}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.avatarMetaText}>
                  Member since {memberSince}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="person-outline"
                size={18}
                color={theme.colors.text}
              />
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

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="location-outline"
                size={18}
                color={theme.colors.text}
              />
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

          {/* About */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={theme.colors.text}
              />
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

          {/* Event Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="heart-outline"
                size={18}
                color={theme.colors.text}
              />
              <Text style={styles.sectionTitle}>Event Details</Text>
            </View>

            <View style={styles.fieldFull}>
              <Text style={styles.label}>Event Types</Text>
              <View style={styles.chipGroup}>
                {EVENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      form.eventTypes.includes(type) && styles.chipActive,
                    ]}
                    onPress={() => toggleEventType(type)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.eventTypes.includes(type) && styles.chipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Event Date</Text>
                <TextInput
                  style={styles.input}
                  value={form.eventDate}
                  onChangeText={(v) => handleChange('eventDate', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Wedding Location</Text>
                <TextInput
                  style={styles.input}
                  value={form.weddingLocation}
                  onChangeText={(v) => handleChange('weddingLocation', v)}
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
                  onPress={() => setShowVenuePicker(!showVenuePicker)}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !form.venueType && { color: theme.colors.textSecondary },
                    ]}
                  >
                    {form.venueType || 'Select venue'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                {showVenuePicker && (
                  <View style={styles.pickerDropdown}>
                    {VENUE_TYPES.map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.pickerOption,
                          form.venueType === v && styles.pickerOptionActive,
                        ]}
                        onPress={() => {
                          handleChange('venueType', v);
                          setShowVenuePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            form.venueType === v && styles.pickerOptionTextActive,
                          ]}
                        >
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
                  value={form.guestCount}
                  onChangeText={(v) => handleChange('guestCount', v)}
                  placeholder="e.g. 200"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Food Preference</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setShowFoodPicker(!showFoodPicker)}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !form.foodPreference && { color: theme.colors.textSecondary },
                    ]}
                  >
                    {form.foodPreference || 'Select preference'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                {showFoodPicker && (
                  <View style={styles.pickerDropdown}>
                    {FOOD_OPTIONS.map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[
                          styles.pickerOption,
                          form.foodPreference === f && styles.pickerOptionActive,
                        ]}
                        onPress={() => {
                          handleChange('foodPreference', f);
                          setShowFoodPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            form.foodPreference === f && styles.pickerOptionTextActive,
                          ]}
                        >
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Total Budget (PKR)</Text>
                <TextInput
                  style={styles.input}
                  value={form.totalBudget}
                  onChangeText={(v) => handleChange('totalBudget', v)}
                  placeholder="e.g. 500000"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size={16} color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
            )}
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
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

  /* Header */
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  /* Avatar Section */
  avatarSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLg: {
    width: 88,
    height: 88,
    borderRadius: 44,
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
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  avatarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  avatarMetaText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  /* Sections */
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
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },

  /* Fields */
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
    borderRadius: 8,
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

  /* Select / Dropdown */
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
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

  /* Save Button */
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  /* Event Type Chips */
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
});
