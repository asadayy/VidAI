import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { vendorAPI } from '../../api/vendors.js';
import { bookingAPI } from '../../api/bookings.js';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/Loading';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function VendorDetails() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    eventDate: '',
    guestCount: '',
    packageId: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: '5', title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

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
      Toast.show({
        type: 'error',
        text1: 'Failed to load vendor details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Please login to book a vendor',
      });
      router.push('/(auth)/login');
      return;
    }

    if (!bookingData.eventDate || !bookingData.guestCount || !bookingData.packageId) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in all required fields',
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
      Toast.show({
        type: 'success',
        text1: 'Booking created successfully!',
      });
      setBookingModal(false);
      router.push('/(tabs)/bookings');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create booking';
      Toast.show({
        type: 'error',
        text1: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Please login to leave a review',
      });
      setReviewModal(false);
      router.push('/(auth)/login');
      return;
    }

    if (!reviewData.rating || !reviewData.title || !reviewData.comment) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in all review fields',
      });
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await vendorAPI.addReview(vendor._id, {
        rating: Number(reviewData.rating),
        title: reviewData.title,
        comment: reviewData.comment
      });
      Toast.show({
        type: 'success',
        text1: 'Review added successfully!',
      });
      setReviewModal(false);
      setReviews(prev => [res.data.data.review, ...prev]);
      setReviewData({ rating: '5', title: '', comment: '' });
      fetchVendor(); // refresh vendor data to update average
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit review';
      Toast.show({
        type: 'error',
        text1: message,
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message="Loading vendor details..." />;
  }

  if (!vendor) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Vendor not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{
          uri: vendor.coverImage?.url || 'https://via.placeholder.com/400x300?text=No+Image',
        }}
        style={styles.coverImage}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <Text style={styles.category}>
          {vendor.category?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </Text>
        <Text style={styles.businessName}>{vendor.businessName}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{vendor.city}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="star" size={18} color="#fbbf24" />
          <Text style={styles.infoText}>
            {vendor.ratingsAverage?.toFixed(1) || '0.0'} ({vendor.ratingsCount || 0} reviews)
          </Text>
        </View>

        {vendor.description && (
          <Card style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{vendor.description}</Text>
          </Card>
        )}

        {vendor.packages && vendor.packages.length > 0 && (
          <Card style={styles.packagesCard}>
            <Text style={styles.sectionTitle}>Packages</Text>
            {vendor.packages.map((pkg) => (
              <TouchableOpacity
                key={pkg._id}
                style={[
                  styles.packageItem,
                  bookingData.packageId === pkg._id && styles.packageItemSelected,
                ]}
                onPress={() => setBookingData({ ...bookingData, packageId: pkg._id })}
              >
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>Rs. {pkg.price?.toLocaleString()}</Text>
                </View>
                {pkg.description && (
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                )}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <Button
          title="Book Now"
          onPress={() => setBookingModal(true)}
          style={styles.bookButton}
        />
      </View>

      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <TouchableOpacity onPress={() => setReviewModal(true)}>
            <Text style={styles.addReviewText}>+ Add Review</Text>
          </TouchableOpacity>
        </View>

        {reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review._id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUsername}>{review.user?.name || 'User'}</Text>
                <View style={styles.reviewRatingBadge}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                </View>
              </View>
              <Text style={styles.reviewTitle}>{review.title}</Text>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </Card>
          ))
        ) : (
          <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
        )}
      </View>

      {/* Booking Modal */}
      <Modal
        visible={bookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBookingModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Booking</Text>
            <TouchableOpacity onPress={() => setBookingModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Event Date *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              value={bookingData.eventDate}
              onChangeText={(text) => setBookingData({ ...bookingData, eventDate: text })}
            />

            <Text style={styles.modalLabel}>Guest Count *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Number of guests"
              keyboardType="numeric"
              value={bookingData.guestCount}
              onChangeText={(text) => setBookingData({ ...bookingData, guestCount: text })}
            />

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Additional notes..."
              multiline
              numberOfLines={4}
              value={bookingData.notes}
              onChangeText={(text) => setBookingData({ ...bookingData, notes: text })}
            />

            <Button
              title="Confirm Booking"
              onPress={handleBooking}
              loading={submitting}
              style={styles.modalButton}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={reviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReviewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <TouchableOpacity onPress={() => setReviewModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Rating (1-5)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5"
              keyboardType="numeric"
              value={reviewData.rating}
              onChangeText={(text) => setReviewData({ ...reviewData, rating: text })}
            />

            <Text style={styles.modalLabel}>Summary Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Summary of experience"
              value={reviewData.title}
              onChangeText={(text) => setReviewData({ ...reviewData, title: text })}
            />

            <Text style={styles.modalLabel}>Comment</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Share details of your experience..."
              multiline
              numberOfLines={4}
              value={reviewData.comment}
              onChangeText={(text) => setReviewData({ ...reviewData, comment: text })}
            />

            <Button
              title="Submit Review"
              onPress={handleReview}
              loading={submittingReview}
              style={styles.modalButton}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  coverImage: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.border,
  },
  content: {
    padding: theme.spacing.md,
  },
  category: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  businessName: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  descriptionCard: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  packagesCard: {
    marginTop: theme.spacing.md,
  },
  packageItem: {
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  packageItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#e0e7ff',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  packageName: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  packagePrice: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  packageDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  bookButton: {
    marginTop: theme.spacing.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  modalLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    backgroundColor: theme.colors.white,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButton: {
    marginTop: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  reviewsContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  addReviewText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  reviewCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  reviewUsername: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  reviewRatingText: {
    ...theme.typography.caption,
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#d97706',
  },
  reviewTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  reviewComment: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  noReviewsText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
});
