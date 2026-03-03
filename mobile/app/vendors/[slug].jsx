import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { vendorAPI } from '../../api/vendors.js';
import { bookingAPI } from '../../api/bookings.js';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/Loading';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;
const GOLD = '#C9A84C';
const BERRY = '#7B1D3A';
const CREAM = '#f8f5f2';

const TIME_OPTIONS = [
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM',
  '8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM','10:30 PM',
  '11:00 PM','11:30 PM','12:00 AM',
];

const renderStars = (rating, size = 14) =>
  Array.from({ length: 5 }, (_, i) => (
    <Ionicons
      key={i}
      name={i < Math.round(rating) ? 'star' : 'star-outline'}
      size={size}
      color={i < Math.round(rating) ? '#fbbf24' : '#d1d5db'}
      style={{ marginRight: 1 }}
    />
  ));

const formatCategory = (cat) =>
  cat ? cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Vendor';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function VendorDetails() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [selectedPkg, setSelectedPkg] = useState(null);

  // Booking
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    eventDate: '',
    eventTime: '',
    guestCount: '',
    packageId: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState({ visible: false, index: 0 });

  const fmtDisplayDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setPickerDate(selected);
    setBookingData(prev => ({ ...prev, eventDate: selected.toISOString().split('T')[0] }));
  };

  useEffect(() => {
    fetchVendor();
  }, [slug]);

  const fetchVendor = async () => {
    try {
      const response = await vendorAPI.getBySlug(slug);
      const vendorData = response.data.data.vendor || response.data.vendor || response.data;
      setVendor(vendorData);
      if (vendorData && vendorData._id) {
        const reviewRes = await vendorAPI.getReviews(vendorData._id);
        setReviews(reviewRes.data.data?.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
      Toast.show({ type: 'error', text1: 'Failed to load vendor details' });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please login to book a vendor' });
      router.push('/(auth)/login');
      return;
    }
    if (!bookingData.eventDate || !bookingData.guestCount || !bookingData.packageId) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in all required fields',
        text2: !bookingData.packageId ? 'Select a package first' : !bookingData.eventDate ? 'Pick an event date' : 'Enter guest count',
      });
      return;
    }
    setSubmitting(true);
    try {
      await bookingAPI.create({
        vendorId: vendor._id,
        packageId: bookingData.packageId,
        eventDate: bookingData.eventDate,
        guestCount: parseInt(bookingData.guestCount),
        notes: bookingData.notes,
      });
      Toast.show({ type: 'success', text1: 'Booking created successfully!' });
      setBookingModal(false);
      router.push('/(tabs)/bookings');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create booking';
      Toast.show({ type: 'error', text1: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please login to leave a review' });
      setReviewModal(false);
      router.push('/(auth)/login');
      return;
    }
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5 || !reviewData.title || !reviewData.comment) {
      Toast.show({ type: 'error', text1: 'Please fill in all review fields' });
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await vendorAPI.addReview(vendor._id, {
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
      });
      Toast.show({ type: 'success', text1: 'Review added successfully!' });
      setReviewModal(false);
      setReviews(prev => [res.data.data.review, ...prev]);
      setReviewData({ rating: 5, title: '', comment: '' });
      fetchVendor();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit review';
      Toast.show({ type: 'error', text1: message });
    } finally {
      setSubmittingReview(false);
    }
  };

  const openBookingWithPkg = (pkg) => {
    setBookingData(prev => ({ ...prev, packageId: pkg._id }));
    setSelectedPkg(pkg);
    setBookingModal(true);
  };

  if (loading) return <Loading fullScreen message="Loading vendor details..." />;
  if (!vendor) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const portfolio = vendor.portfolio || [];
  const packages = vendor.packages || [];
  const lowestPrice = packages.length > 0
    ? Math.min(...packages.map(p => p.price || 0))
    : null;

  // ── Tab content ──────────────────────────────────
  const renderAboutTab = () => (
    <View style={styles.tabContent}>
      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Us</Text>
        <Text style={styles.aboutText}>{vendor.description || 'No description provided.'}</Text>
        {vendor.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {vendor.tags.map((tag, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Contact Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Details</Text>
        <View style={styles.contactGrid}>
          {vendor.email && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{vendor.email}</Text>
              </View>
            </View>
          )}
          {vendor.phone && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{vendor.phone}</Text>
              </View>
            </View>
          )}
          {vendor.city && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Location</Text>
                <Text style={styles.contactValue}>{vendor.city}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <View style={styles.portfolioGrid}>
            {portfolio.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.portfolioItem}
                activeOpacity={0.85}
                onPress={() => setLightbox({ visible: true, index: idx })}
              >
                <Image
                  source={{ uri: img.url || img }}
                  style={styles.portfolioImage}
                  resizeMode="cover"
                />
                <View style={styles.portfolioOverlay}>
                  <Ionicons name="expand-outline" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderPackagesTab = () => (
    <View style={styles.tabContent}>
      {packages.length > 0 ? (
        packages.map((pkg) => {
          const isSelected = bookingData.packageId === pkg._id;
          return (
            <TouchableOpacity
              key={pkg._id}
              style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
              activeOpacity={0.85}
              onPress={() => setBookingData(prev => ({ ...prev, packageId: pkg._id }))}
            >
              {isSelected && (
                <View style={styles.pkgCheckBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              <View style={styles.pkgHeader}>
                <Text style={styles.pkgName}>{pkg.name}</Text>
                <View style={styles.pkgPricePill}>
                  <Text style={styles.pkgPriceText}>Rs. {pkg.price?.toLocaleString()}</Text>
                </View>
              </View>
              {pkg.description && (
                <Text style={styles.pkgDesc}>{pkg.description}</Text>
              )}
              {pkg.features?.length > 0 && (
                <View style={styles.pkgFeatures}>
                  {pkg.features.map((f, idx) => (
                    <View key={idx} style={styles.pkgFeatureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                      <Text style={styles.pkgFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.pkgBookBtn}
                onPress={() => openBookingWithPkg(pkg)}
              >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.pkgBookBtnText}>Book This Package</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pricetags-outline" size={40} color={theme.colors.border} />
          <Text style={styles.emptyText}>No packages listed yet</Text>
        </View>
      )}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {/* Rating summary */}
      <View style={styles.ratingSummary}>
        <View style={styles.ratingBig}>
          <Text style={styles.ratingBigNumber}>
            {(vendor.ratingsAverage || 0).toFixed(1)}
          </Text>
          <View style={styles.ratingBigStars}>
            {renderStars(vendor.ratingsAverage || 0, 16)}
          </View>
          <Text style={styles.ratingBigCount}>
            {vendor.ratingsCount || 0} review{(vendor.ratingsCount || 0) !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.writeReviewBtn}
          onPress={() => setReviewModal(true)}
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.writeReviewBtnText}>Write a Review</Text>
        </TouchableOpacity>
      </View>

      {/* Reviews list */}
      {reviews.length > 0 ? (
        reviews.map((review) => (
          <View key={review._id} style={styles.reviewCard}>
            <View style={styles.reviewCardHead}>
              <View style={styles.reviewerInfo}>
                <View style={styles.reviewerAvatar}>
                  <Text style={styles.reviewerAvatarText}>
                    {(review.user?.name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.reviewerName}>{review.user?.name || 'Guest'}</Text>
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.reviewRatingBadge}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.reviewRatingNum}>{review.rating}</Text>
              </View>
            </View>
            {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.border} />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share your experience!</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Hero ─────────────────────────────────────── */}
        <View style={styles.hero}>
          <Image
            source={{
              uri: vendor.coverImage?.url || 'https://placehold.co/800x400/1a1a2e/ffffff?text=No+Cover',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)']}
            locations={[0, 0.4, 1]}
            style={styles.heroGradient}
          />

          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Hero content */}
          <View style={styles.heroContent}>
            <View style={styles.heroCatChip}>
              <Text style={styles.heroCatText}>{formatCategory(vendor.category)}</Text>
            </View>
            <Text style={styles.heroTitle}>{vendor.businessName}</Text>
            <View style={styles.heroMeta}>
              {vendor.city && (
                <View style={styles.heroMetaItem}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMetaText}>{vendor.city}</Text>
                </View>
              )}
              <View style={styles.heroMetaItem}>
                {renderStars(vendor.ratingsAverage || 0, 13)}
                <Text style={styles.heroMetaText}>
                  {(vendor.ratingsAverage || 0).toFixed(1)} ({vendor.ratingsCount || 0})
                </Text>
              </View>
              {vendor.isVerified && (
                <View style={styles.heroVerifiedChip}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  <Text style={styles.heroVerifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Stats Strip ──────────────────────────────── */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: GOLD }]}>
              {(vendor.ratingsAverage || 0).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{vendor.ratingsCount || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{packages.length}</Text>
            <Text style={styles.statLabel}>Packages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{portfolio.length}</Text>
            <Text style={styles.statLabel}>Portfolio</Text>
          </View>
        </View>

        {/* ── Tab Bar ──────────────────────────────────── */}
        <View style={styles.tabBar}>
          {['about', 'packages', 'reviews'].map((tab) => {
            const active = activeTab === tab;
            const icons = { about: 'information-circle-outline', packages: 'pricetags-outline', reviews: 'chatbubbles-outline' };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={icons[tab]}
                  size={18}
                  color={active ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content ──────────────────────────────── */}
        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'packages' && renderPackagesTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
      </Animated.ScrollView>

      {/* ── Sticky Bottom Bar ──────────────────────────── */}
      <View style={styles.bottomBar}>
        <View>
          {lowestPrice !== null && (
            <>
              <Text style={styles.bottomBarLabel}>Starting from</Text>
              <Text style={styles.bottomBarPrice}>Rs. {lowestPrice.toLocaleString()}</Text>
            </>
          )}
          {lowestPrice === null && <Text style={styles.bottomBarLabel}>Contact for pricing</Text>}
        </View>
        <TouchableOpacity
          style={styles.bottomBarBtn}
          onPress={() => setBookingModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar" size={18} color="#fff" />
          <Text style={styles.bottomBarBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* ── Booking Modal ──────────────────────────────── */}
      <Modal
        visible={bookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBookingModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Handle */}
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Create Booking</Text>
              {selectedPkg && (
                <Text style={styles.modalSubtitle}>{selectedPkg.name} — Rs. {selectedPkg.price?.toLocaleString()}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setBookingModal(false)}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Package selector (if no pkg already selected) */}
            {!selectedPkg && packages.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Select Package *</Text>
                {packages.map((pkg) => {
                  const sel = bookingData.packageId === pkg._id;
                  return (
                    <TouchableOpacity
                      key={pkg._id}
                      style={[styles.modalPkgOption, sel && styles.modalPkgOptionSel]}
                      onPress={() => setBookingData(prev => ({ ...prev, packageId: pkg._id }))}
                    >
                      <View style={styles.modalPkgRow}>
                        <Text style={[styles.modalPkgName, sel && { color: theme.colors.primary }]}>{pkg.name}</Text>
                        <Text style={styles.modalPkgPrice}>Rs. {pkg.price?.toLocaleString()}</Text>
                      </View>
                      {sel && (
                        <View style={styles.modalPkgCheck}>
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Date & Time */}
            <View style={styles.modalRow}>
              <View style={styles.modalCol}>
                <Text style={styles.modalLabel}>Event Date *</Text>
                <TouchableOpacity
                  style={styles.modalPickerBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={bookingData.eventDate ? theme.colors.primary : '#94a3b8'}
                  />
                  <Text style={[styles.modalPickerText, !bookingData.eventDate && styles.modalPickerPlaceholder]}>
                    {bookingData.eventDate ? fmtDisplayDate(bookingData.eventDate) : 'Pick date'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalCol}>
                <Text style={styles.modalLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.modalPickerBtn}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={bookingData.eventTime ? theme.colors.primary : '#94a3b8'}
                  />
                  <Text style={[styles.modalPickerText, !bookingData.eventTime && styles.modalPickerPlaceholder]}>
                    {bookingData.eventTime || 'Pick time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Guest Count *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 200"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={bookingData.guestCount}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, guestCount: text }))}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Special Requirements / Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Any specific requests or details..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={bookingData.notes}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, notes: text }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, submitting && { opacity: 0.65 }]}
              onPress={handleBooking}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtnGradient}
              >
                {submitting ? (
                  <Text style={styles.confirmBtnText}>Submitting...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Time Picker Bottom Sheet ──────────────────── */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const sel = bookingData.eventTime === item;
                return (
                  <TouchableOpacity
                    style={[styles.timeOption, sel && styles.timeOptionSel]}
                    onPress={() => {
                      setBookingData(prev => ({ ...prev, eventTime: item }));
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.timeOptionText, sel && styles.timeOptionTextSel]}>{item}</Text>
                    {sel && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Review Modal ──────────────────────────────── */}
      <Modal
        visible={reviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReviewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <Text style={styles.modalSubtitle}>{vendor.businessName}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setReviewModal(false)}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Your Rating</Text>
              <View style={styles.starPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewData(prev => ({ ...prev, rating: star }))}
                    style={styles.starPickerBtn}
                  >
                    <Ionicons
                      name={star <= reviewData.rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= reviewData.rating ? '#f59e0b' : '#d1d5db'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Summarise your experience"
                placeholderTextColor="#94a3b8"
                value={reviewData.title}
                onChangeText={(text) => setReviewData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Comment</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Share the details of your experience..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={reviewData.comment}
                onChangeText={(text) => setReviewData(prev => ({ ...prev, comment: text }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, submittingReview && { opacity: 0.65 }]}
              onPress={handleReview}
              disabled={submittingReview}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtnGradient}
              >
                {submittingReview ? (
                  <Text style={styles.confirmBtnText}>Submitting...</Text>
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Submit Review</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Portfolio Lightbox ─────────────────────────── */}
      <Modal
        visible={lightbox.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox({ visible: false, index: 0 })}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightbox({ visible: false, index: 0 })}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Image
            source={{ uri: portfolio[lightbox.index]?.url || portfolio[lightbox.index] }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />

          {portfolio.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.lightboxNav, styles.lightboxNavLeft]}
                onPress={() => setLightbox(lb => ({ ...lb, index: (lb.index - 1 + portfolio.length) % portfolio.length }))}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lightboxNav, styles.lightboxNavRight]}
                onPress={() => setLightbox(lb => ({ ...lb, index: (lb.index + 1) % portfolio.length }))}
              >
                <Ionicons name="chevron-forward" size={28} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.lightboxCaption}>
            <Text style={styles.lightboxCaptionText}>
              {lightbox.index + 1} / {portfolio.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scrollView: {
    flex: 1,
  },

  // ── Hero ──────────────────────────────
  hero: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 44) + 8,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroCatChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  heroCatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  heroVerifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  heroVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // ── Stats Strip ────────────────────────
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },

  // ── Tab Bar ────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },

  // ── Tab Content ────────────────────────
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Section ────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },

  // ── About ──────────────────────────────
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: 'rgba(215,56,94,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // ── Contact ────────────────────────────
  contactGrid: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  contactIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(215,56,94,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },

  // ── Portfolio ──────────────────────────
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioItem: {
    width: (SCREEN_WIDTH - 48) / 3,
    height: (SCREEN_WIDTH - 48) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  portfolioOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },

  // ── Package Cards ──────────────────────
  pkgCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  pkgCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#fef2f4',
  },
  pkgCheckBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pkgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 28,
  },
  pkgName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  pkgPricePill: {
    backgroundColor: 'rgba(215,56,94,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pkgPriceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  pkgDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  pkgFeatures: {
    marginBottom: 14,
    gap: 6,
  },
  pkgFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pkgFeatureText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  pkgBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pkgBookBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ── Reviews ────────────────────────────
  ratingSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  ratingBig: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBigNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: GOLD,
    marginBottom: 4,
  },
  ratingBigStars: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  ratingBigCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  writeReviewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  reviewCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BERRY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviewDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewRatingNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d97706',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },

  // ── Empty State ────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  // ── Sticky Bottom Bar ─────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  bottomBarLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bottomBarPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  bottomBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomBarBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },

  // ── Modals ─────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: CREAM,
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 18,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  modalCol: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: '#fff',
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  modalPickerText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  modalPickerPlaceholder: {
    color: '#94a3b8',
  },
  modalPkgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  modalPkgOptionSel: {
    borderColor: theme.colors.primary,
    backgroundColor: '#fef2f4',
  },
  modalPkgRow: {
    flex: 1,
  },
  modalPkgName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  modalPkgPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalPkgCheck: {
    marginLeft: 12,
  },
  confirmBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 30,
  },
  confirmBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  starPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starPickerBtn: {
    padding: 4,
  },

  // ── Time Sheet ─────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeOptionSel: {
    backgroundColor: '#fef2f4',
  },
  timeOptionText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  timeOptionTextSel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // ── Lightbox ───────────────────────────
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 44) + 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 6,
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    zIndex: 10,
  },
  lightboxNavLeft: {
    left: 12,
  },
  lightboxNavRight: {
    right: 12,
  },
  lightboxCaption: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lightboxCaptionText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },

  // ── Error ──────────────────────────────
  errorContainer: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
