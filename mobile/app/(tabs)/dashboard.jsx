import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { bookingAPI } from '../../api/bookings.js';
import { budgetAPI } from '../../api/budget.js';
import { eventAPI } from '../../api/events.js';
import Loading from '../../components/Loading';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

// -- helpers --
const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (ds) =>
  new Date(ds).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   bg: '#fef3c7', text: '#92400e', icon: 'time-outline'            },
  approved:  { label: 'Approved',  bg: '#d1fae5', text: '#065f46', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', bg: '#dbeafe', text: '#1e40af', icon: 'checkmark-done-outline'   },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline'     },
  rejected:  { label: 'Rejected',  bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline'     },
};

const QUICK_ACTIONS = [
  {
    route: '/(tabs)/vendors',
    icon: 'search',
    label: 'Find Vendors',
    desc: 'Browse & book top vendors',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
  },
  {
    route: '/(tabs)/budget',
    icon: 'card',
    label: 'Budget Planner',
    desc: 'Track every rupee spent',
    iconBg: '#d1fae5',
    iconColor: '#059669',
  },
  {
    route: '/(tabs)/chat',
    icon: 'sparkles',
    label: 'AI Assistant',
    desc: 'Get personalised advice',
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
  },
  {
    route: '/(tabs)/bookings',
    icon: 'calendar',
    label: 'My Bookings',
    desc: 'View & manage all bookings',
    iconBg: '#ffe4e6',
    iconColor: theme.colors.primary,
  },
];

// component
export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings]     = useState([]);
  const [budget, setBudget]         = useState(null);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const fetchData = async () => {
    try {
      const [bkRes, bdRes, ucRes] = await Promise.all([
        bookingAPI
          .getMyBookings({ limit: 4 })
          .catch(() => ({ data: { data: { bookings: [] } } })),
        budgetAPI.getSummary().catch(() => ({ data: null })),
        eventAPI.getUpcomingCount().catch(() => ({ data: { data: { count: 0 } } })),
      ]);
      setBookings(bkRes.data.data.bookings || []);
      setBudget(bdRes.data?.data?.summary || bdRes.data || null);
      setUpcomingCount(ucRes.data?.data?.count || 0);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <Loading fullScreen message="Loading dashboard…" />;

  /* derived */
  const totalBudget   = budget?.totalBudget || 0;
  const totalSpent    = budget?.totalSpent || 0;
  const remaining     = totalBudget - totalSpent;
  const spentPct      = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const firstName  = user?.name?.split(' ')[0] || 'there';
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const STAT_TILES = [
    { label: 'Total Bookings',  value: bookings.length,          iconName: 'calendar',    iconBg: '#ffe4e6', iconColor: theme.colors.primary },
    { label: 'Upcoming Events', value: upcomingCount,            iconName: 'trending-up', iconBg: '#d1fae5', iconColor: '#059669'            },
    { label: 'Total Budget',    value: fmtCurrency(totalBudget), iconName: 'wallet',      iconBg: '#dbeafe', iconColor: '#2563eb', small: true },
    {
      label: 'Remaining',
      value: fmtCurrency(remaining),
      iconName: 'card',
      iconBg: remaining < 0 ? '#fee2e2' : '#ede9fe',
      iconColor: remaining < 0 ? '#ef4444' : '#7c3aed',
      small: true,
      danger: remaining < 0,
    },
  ];

  return (
    <ProtectedRoute roles="user">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroBody}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </TouchableOpacity>
            <View style={styles.heroText}>
              <Text style={styles.heroGreeting}>{greeting} 👋</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <Text style={styles.heroSub}>Here's your wedding planning overview</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
          <View style={styles.heroDateRow}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroDateText}>{todayLabel}</Text>
          </View>
        </View>

        {/* ── Stat Tiles ────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          {STAT_TILES.map((tile, i) => (
            <View key={i} style={styles.statTile}>
              <View style={[styles.statIconWrap, { backgroundColor: tile.iconBg }]}>
                <Ionicons name={tile.iconName} size={18} color={tile.iconColor} />
              </View>
              <Text
                style={[
                  tile.small ? styles.statValueSm : styles.statValue,
                  tile.danger && styles.statValueDanger,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tile.value}
              </Text>
              <Text style={styles.statLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.mainContent}>

          {/* ── Budget Card ───────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardStripeRose} />
            <View style={styles.cardHead}>
              <View style={styles.cardTitleWrap}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#ffe4e6' }]}>
                  <Ionicons name="wallet" size={15} color={theme.colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Budget Overview</Text>
              </View>
              <TouchableOpacity
                style={styles.detailsLink}
                onPress={() => router.push('/(tabs)/budget')}
              >
                <Text style={styles.detailsLinkText}>Details</Text>
                <Ionicons name="arrow-forward" size={13} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.budgetRow}>
              <View style={styles.budgetCol}>
                <Text style={styles.budgetLbl}>Total Budget</Text>
                <Text style={styles.budgetVal} numberOfLines={1} adjustsFontSizeToFit>
                  {fmtCurrency(totalBudget)}
                </Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetCol}>
                <Text style={styles.budgetLbl}>Spent</Text>
                <Text style={[styles.budgetVal, styles.budgetSpent]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmtCurrency(totalSpent)}
                </Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetCol}>
                <Text style={styles.budgetLbl}>Remaining</Text>
                <Text
                  style={[styles.budgetVal, remaining < 0 ? styles.valRed : styles.valGreen]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmtCurrency(remaining)}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${spentPct}%` },
                  spentPct >= 90 && styles.progressFillDanger,
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{spentPct.toFixed(0)}% spent</Text>
              <Text style={styles.progressLabel}>{(100 - spentPct).toFixed(0)}% remaining</Text>
            </View>
          </View>

          {/* ── Quick Actions ─────────────────────────────────── */}
          <View style={styles.actionsCard}>
            {QUICK_ACTIONS.map((action, idx) => (
              <TouchableOpacity
                key={action.route}
                style={[
                  styles.actionRow,
                  idx < QUICK_ACTIONS.length - 1 && styles.actionRowBorder,
                ]}
                onPress={() => router.push(action.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.iconBg }]}>
                  <Ionicons name={action.icon} size={20} color={action.iconColor} />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDesc}>{action.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Recent Bookings ───────────────────────────────── */}
          <View style={[styles.card, styles.bookingsCard]}>
            <View style={styles.cardStripeIndigo} />
            <View style={styles.cardHead}>
              <View style={styles.cardTitleWrap}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="star" size={15} color="#4f46e5" />
                </View>
                <Text style={styles.cardTitle}>Recent Bookings</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.push('/(tabs)/bookings')}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {bookings.length > 0 ? (
              bookings.map((b, idx) => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                return (
                  <View
                    key={b._id}
                    style={[
                      styles.bookingRow,
                      idx < bookings.length - 1 && styles.bookingRowBorder,
                    ]}
                  >
                    <View style={styles.bookingAvatar}>
                      <Text style={styles.bookingAvatarText}>
                        {(b.vendor?.businessName || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingName} numberOfLines={1}>
                        {b.vendor?.businessName || 'Unknown Vendor'}
                      </Text>
                      <View style={styles.bookingMeta}>
                        <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.bookingMetaText}>{fmtDate(b.eventDate)}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={11} color={cfg.text} />
                      <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="calendar-outline" size={32} color={theme.colors.textSecondary} />
                </View>
                <Text style={styles.emptyText}>No bookings yet — start exploring vendors!</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(tabs)/vendors')}
                >
                  <Ionicons name="search" size={14} color={theme.colors.white} />
                  <Text style={styles.emptyBtnText}>Browse Vendors</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </ProtectedRoute>
  );
}

// -- styles --
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },

  /* hero */
  hero: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  heroText: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  heroName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 32,
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 6,
    marginLeft: 'auto',
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroDateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  /* stat tiles */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statTile: {
    width: '50%',
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 28,
  },
  statValueSm: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 22,
  },
  statValueDanger: {
    color: theme.colors.danger,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  /* main */
  mainContent: {
    padding: 16,
    gap: 14,
  },

  /* shared card */
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  bookingsCard: {
    marginBottom: 4,
  },
  cardStripeRose: {
    height: 4,
    backgroundColor: theme.colors.primary,
  },
  cardStripeIndigo: {
    height: 4,
    backgroundColor: '#6366f1',
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailsLinkText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  /* budget */
  budgetRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  budgetCol: {
    flex: 1,
    alignItems: 'center',
  },
  budgetDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  budgetLbl: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  budgetVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  budgetSpent: {
    color: '#d97706',
  },
  valRed:   { color: theme.colors.danger  },
  valGreen: { color: theme.colors.success },

  /* progress */
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressFillDanger: {
    backgroundColor: theme.colors.danger,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  progressLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },

  /* quick actions */
  actionsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  /* bookings */
  viewAllBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  bookingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bookingAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4338ca',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 3,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingMetaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
