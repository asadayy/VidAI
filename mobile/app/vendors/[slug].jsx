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
import Loading from '../../components/Loading';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function VendorDetails() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
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

  useEffect(() => {
    fetchVendor();
  }, [slug]);

  const fetchVendor = async () => {
    try {
      const response = await vendorAPI.getBySlug(slug);
      setVendor(response.data.data.vendor || response.data.vendor || response.data);
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
});
