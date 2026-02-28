import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { bookingAPI } from '../../api/bookings.js';
import { paymentAPI } from '../../api/payments.js';
import Loading from '../../components/Loading';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import * as WebBrowser from 'expo-web-browser';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function Bookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [cancelModal, setCancelModal] = useState({ open: false, bookingId: null });
  const [payingBookingId, setPayingBookingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getMyBookings();
      setBookings(response.data.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load bookings',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleCancelBooking = async () => {
    if (!cancelModal.bookingId) return;

    try {
      await bookingAPI.cancel(cancelModal.bookingId, { reason: 'User cancelled' });
      Toast.show({
        type: 'success',
        text1: 'Booking cancelled successfully',
      });
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to cancel booking';
      Toast.show({
        type: 'error',
        text1: message,
      });
    } finally {
      setCancelModal({ open: false, bookingId: null });
    }
  };

  const handlePayNow = async (bookingId) => {
    try {
      setPayingBookingId(bookingId);
      const response = await paymentAPI.createCheckout(bookingId);
      const { url } = response.data.data;
      if (url) {
        // Open Stripe checkout in browser
        const result = await WebBrowser.openBrowserAsync(url);
        if (result.type === 'dismiss') {
          // Refresh bookings after payment
          fetchBookings();
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Could not create payment session',
        });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to initiate payment';
      Toast.show({
        type: 'error',
        text1: message,
      });
    } finally {
      setPayingBookingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      cancelled: 'danger',
      completed: 'info',
      rejected: 'danger',
    };
    return variants[status] || 'default';
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  if (loading) {
    return <Loading fullScreen message="Loading bookings..." />;
  }

  return (
    <ProtectedRoute roles="user">
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {['all', 'pending', 'approved', 'completed', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterTab, filter === status && styles.filterTabActive]}
                onPress={() => setFilter(status)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === status && styles.filterTabTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bookings List */}
          <View style={styles.bookingsList}>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <Card key={booking._id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingVendor}>
                        {booking.vendor?.businessName || 'Unknown Vendor'}
                      </Text>
                      <View style={styles.bookingDetails}>
                        <View style={styles.bookingDetailRow}>
                          <Ionicons name="calendar" size={14} color={theme.colors.textSecondary} />
                          <Text style={styles.bookingDetailText}>
                            {formatDate(booking.eventDate)}
                          </Text>
                        </View>
                        <View style={styles.bookingDetailRow}>
                          <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
                          <Text style={styles.bookingDetailText}>
                            {booking.guestCount} guests
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Badge text={booking.status} variant={getStatusVariant(booking.status)} />
                  </View>

                  {booking.amount && (
                    <Text style={styles.bookingAmount}>{formatCurrency(booking.amount)}</Text>
                  )}

                  <View style={styles.bookingActions}>
                    {booking.status === 'pending' && (
                      <>
                        <Button
                          title="Pay Now"
                          onPress={() => handlePayNow(booking._id)}
                          loading={payingBookingId === booking._id}
                          variant="primary"
                          style={styles.actionButton}
                        />
                        <Button
                          title="Cancel"
                          onPress={() => setCancelModal({ open: true, bookingId: booking._id })}
                          variant="outline"
                          style={styles.actionButton}
                        />
                      </>
                    )}
                    {booking.status === 'approved' && (
                      <Button
                        title="Pay Now"
                        onPress={() => handlePayNow(booking._id)}
                        loading={payingBookingId === booking._id}
                        variant="primary"
                        style={styles.actionButton}
                      />
                    )}
                  </View>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={
                  <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                }
                title="No bookings found"
                message={
                  filter === 'all'
                    ? "You haven't made any bookings yet"
                    : `No ${filter} bookings found`
                }
              />
            )}
          </View>
        </ScrollView>

        {/* Cancel Confirmation Modal */}
        <Modal
          visible={cancelModal.open}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelModal({ open: false, bookingId: null })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <Button
                  title="No"
                  onPress={() => setCancelModal({ open: false, bookingId: null })}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Yes, Cancel"
                  onPress={handleCancelBooking}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: theme.colors.white,
  },
  bookingsList: {
    padding: theme.spacing.md,
  },
  bookingCard: {
    marginBottom: theme.spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingVendor: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bookingDetails: {
    gap: theme.spacing.xs,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  bookingDetailText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  bookingAmount: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalMessage: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
