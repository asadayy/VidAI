import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { bookingAPI } from '../../api/bookings.js';
import { paymentAPI } from '../../api/payments.js';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import * as WebBrowser from 'expo-web-browser';
import ProtectedRoute from '../../components/ProtectedRoute';
import Toast from 'react-native-toast-message';

// -- config --

const STATUS_CFG = {
  pending:   { label: 'Pending',   bg: '#fef3c7', text: '#92400e', icon: 'time-outline',            accent: '#f59e0b' },
  approved:  { label: 'Awaiting Payment', bg: '#fef3c7', text: '#92400e', icon: 'alert-circle-outline', accent: '#f59e0b' },
  booked:    { label: 'Booked',    bg: '#d1fae5', text: '#065f46', icon: 'checkmark-circle-outline', accent: '#10b981' },
  completed: { label: 'Completed', bg: '#dbeafe', text: '#1e40af', icon: 'checkmark-done-outline',   accent: '#3b82f6' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline',     accent: '#ef4444' },
  rejected:  { label: 'Rejected',  bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline',     accent: '#ef4444' },
};

/** Derive display status: approved+paid → 'booked', otherwise raw status */
const getDisplayStatus = (b) => {
  if (b.status === 'approved' && b.paymentStatus === 'paid') return 'booked';
  return b.status;
};

const PAYMENT_CFG = {
  unpaid:   { label: 'Unpaid',   bg: '#fef3c7', text: '#92400e' },
  partial:  { label: 'Partial',  bg: '#ede9fe', text: '#5b21b6' },
  paid:     { label: 'Paid',     bg: '#d1fae5', text: '#065f46' },
  refunded: { label: 'Refunded', bg: '#dbeafe', text: '#1e40af' },
};

const AVATAR_COLORS = {
  pending:   { bg: '#fde68a', text: '#92400e' },
  approved:  { bg: '#a7f3d0', text: '#065f46' },
  completed: { bg: '#bfdbfe', text: '#1e40af' },
  cancelled: { bg: '#fecaca', text: '#991b1b' },
  rejected:  { bg: '#fecaca', text: '#991b1b' },
};

const FILTERS = ['all', 'pending', 'approved', 'completed', 'cancelled'];

// -- helpers --

const fmtDate = (ds) =>
  new Date(ds).toLocaleDateString('en-PK', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', maximumFractionDigits: 0,
  }).format(n || 0);

// -- component --

export default function Bookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [cancelModal, setCancelModal] = useState({ open: false, bookingId: null });
  const [payingId, setPayingId] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getMyBookings();
      setBookings(response.data.data.bookings || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load bookings' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  const handleCancel = async () => {
    if (!cancelModal.bookingId) return;
    try {
      await bookingAPI.cancel(cancelModal.bookingId, { reason: 'User cancelled' });
      Toast.show({ type: 'success', text1: 'Booking cancelled successfully' });
      fetchBookings();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to cancel booking' });
    } finally {
      setCancelModal({ open: false, bookingId: null });
    }
  };

  const handlePayNow = async (bookingId) => {
    try {
      setPayingId(bookingId);
      const response = await paymentAPI.createCheckout(bookingId);
      const { url } = response.data.data;
      if (url) {
        const result = await WebBrowser.openBrowserAsync(url);
        if (result.type === 'dismiss') fetchBookings();
      } else {
        Toast.show({ type: 'error', text1: 'Could not create payment session' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to initiate payment' });
    } finally {
      setPayingId(null);
    }
  };

  // counts per filter
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? bookings.length : bookings.filter(b => b.status === f).length;
    return acc;
  }, {});

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (loading) return <Loading fullScreen message="Loading bookings..." />;

  const renderBooking = ({ item: b }) => {
    const displayStatus = getDisplayStatus(b);
    const scfg = STATUS_CFG[displayStatus] || STATUS_CFG.pending;
    const pcfg = PAYMENT_CFG[b.paymentStatus] || PAYMENT_CFG.unpaid;
    const avcfg = AVATAR_COLORS[b.status] || AVATAR_COLORS.pending;
    const initial = (b.vendor?.businessName || '?')[0].toUpperCase();
    const canPay = b.status === 'approved' && b.paymentStatus === 'unpaid';
    const canCancel = b.status === 'pending';

    return (
      <View style={[styles.card, { borderLeftColor: scfg.accent }]}>
        {/* top row: avatar + name/cat + badges */}
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: avcfg.bg }]}>
            <Text style={[styles.avatarText, { color: avcfg.text }]}>{initial}</Text>
          </View>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName} numberOfLines={1}>
              {b.vendor?.businessName || 'Unknown Vendor'}
            </Text>
            {b.vendor?.category && (
              <Text style={styles.vendorCat}>
                {b.vendor.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            )}
          </View>
          <View style={styles.badgesCol}>
            <View style={[styles.badge, { backgroundColor: scfg.bg }]}>
              <Ionicons name={scfg.icon} size={10} color={scfg.text} />
              <Text style={[styles.badgeText, { color: scfg.text }]}>{scfg.label}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: pcfg.bg, marginTop: 4 }]}>
              <Ionicons name="card-outline" size={10} color={pcfg.text} />
              <Text style={[styles.badgeText, { color: pcfg.text }]}>{pcfg.label}</Text>
            </View>
          </View>
        </View>

        {/* detail chips */}
        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{fmtDate(b.eventDate)}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="people-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{b.guestCount || 0} guests</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="cash-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{fmtCurrency(b.agreedPrice || b.totalAmount)}</Text>
          </View>
          {b.vendor?.city && (
            <View style={styles.detailChip}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>{b.vendor.city}</Text>
            </View>
          )}
        </View>

        {/* action row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => router.push(`/vendors/${b.vendor?.slug || b.vendor?._id}`)}
          >
            <Ionicons name="open-outline" size={13} color={theme.colors.text} />
            <Text style={styles.btnGhostText}>View Vendor</Text>
          </TouchableOpacity>

          {canPay && (
            <TouchableOpacity
              style={[styles.btnPay, payingId === b._id && styles.btnDisabled]}
              onPress={() => handlePayNow(b._id)}
              disabled={payingId === b._id}
            >
              {payingId === b._id
                ? <ActivityIndicator size={13} color="#fff" />
                : <Ionicons name="card-outline" size={13} color="#fff" />}
              <Text style={styles.btnPayText}>
                {payingId === b._id ? 'Processing...' : 'Pay Now'}
              </Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setCancelModal({ open: true, bookingId: b._id })}
            >
              <Ionicons name="close-circle-outline" size={13} color="#dc2626" />
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ProtectedRoute roles="user">
      <View style={styles.container}>

        {/* hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.heroTitle}>My Bookings</Text>
              <Text style={styles.heroSub}>Track and manage all your vendor bookings</Text>
            </View>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeNum}>{bookings.length}</Text>
            <Text style={styles.heroBadgeLbl}>Total</Text>
          </View>
        </View>

        {/* filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {counts[f] > 0 && (
                <View style={[styles.filterCount, filter === f && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, filter === f && styles.filterCountTextActive]}>
                    {counts[f]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* list */}
        {filtered.length === 0 ? (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            contentContainerStyle={styles.emptyContainer}
          >
            <EmptyState
              icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />}
              title="No bookings found"
              message={filter === 'all' ? "You haven't made any bookings yet" : `No ${filter} bookings at the moment`}
            />
            {filter === 'all' && (
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/vendors')}>
                <Ionicons name="storefront-outline" size={15} color="#fff" />
                <Text style={styles.browseBtnText}>Browse Vendors</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderBooking}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          />
        )}

        {/* cancel modal */}
        <Modal
          visible={cancelModal.open}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelModal({ open: false, bookingId: null })}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCancelModal({ open: false, bookingId: null })}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="warning" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.modalTitle}>Cancel Booking?</Text>
              <Text style={styles.modalBody}>
                Are you sure you want to cancel this booking request?{'\n'}
                This action{' '}
                <Text style={{ fontWeight: '700', color: theme.colors.text }}>cannot be undone</Text>.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalBtnKeep}
                  onPress={() => setCancelModal({ open: false, bookingId: null })}
                >
                  <Text style={styles.modalBtnKeepText}>Keep Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleCancel}>
                  <Text style={styles.modalBtnConfirmText}>Yes, Cancel It</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ProtectedRoute>
  );
}

// -- styles --

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },

  // hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  heroSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 48,
  },
  heroBadgeNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroBadgeLbl: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // filter bar
  filterBar: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxHeight: 52,
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  filterTabTextActive: { color: '#fff' },
  filterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary },
  filterCountTextActive: { color: '#fff' },

  // list
  listContent: { padding: 14, paddingBottom: 80 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  browseBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // card
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    padding: 14,
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.07)',
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  vendorCat: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  badgesCol: { alignItems: 'flex-end', flexShrink: 0 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  // detail chips
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },

  // action row
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
  },
  btnGhostText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  btnPay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnPayText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  btnCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff5f5',
  },
  btnCancelText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  btnDisabled: { opacity: 0.6 },

  // cancel modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: theme.colors.white,
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtnKeep: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  modalBtnKeepText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalBtnConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

