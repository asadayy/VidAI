import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { bookingAPI } from '../../api/bookings.js';
import { budgetAPI } from '../../api/budget.js';
import Loading from '../../components/Loading';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [budget, setBudget] = useState(null);

  const fetchData = async () => {
    try {
      const [bookingsRes, budgetRes] = await Promise.all([
        bookingAPI.getMyBookings({ limit: 3 }).catch(() => ({ data: { data: { bookings: [] } } })),
        budgetAPI.getMine().catch(() => ({ data: null })),
      ]);

      setBookings(bookingsRes.data.data.bookings || []);
      setBudget(budgetRes.data?.data?.budget || budgetRes.data || null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  if (loading) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  const totalBudget = budget?.totalBudget || 0;
  const totalSpent = budget?.items?.reduce((sum, item) => sum + (item.spentAmount || 0), 0) || 0;
  const remaining = totalBudget - totalSpent;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {user?.name}!</Text>
          <Text style={styles.subtitle}>Here's what's happening with your wedding planning.</Text>
        </View>

        {/* Budget Overview Card */}
        <Card style={styles.budgetCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="wallet" size={20} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Budget Overview</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/budget')}>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.budgetStats}>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetLabel}>Total Budget</Text>
              <Text style={styles.budgetValue}>{formatCurrency(totalBudget)}</Text>
            </View>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetLabel}>Spent</Text>
              <Text style={styles.budgetValue}>{formatCurrency(totalSpent)}</Text>
            </View>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetLabel}>Remaining</Text>
              <Text style={[styles.budgetValue, remaining < 0 && styles.budgetValueDanger]}>
                {formatCurrency(remaining)}
              </Text>
            </View>
          </View>

          {totalBudget > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` },
                ]}
              />
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/vendors')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="search" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionText}>Find Vendors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/budget')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="card" size={24} color={theme.colors.warning} />
            </View>
            <Text style={styles.actionText}>Update Budget</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="chatbubbles" size={24} color={theme.colors.info} />
            </View>
            <Text style={styles.actionText}>Chat with AI</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <Card key={booking._id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingVendor}>
                      {booking.vendor?.businessName || 'Unknown Vendor'}
                    </Text>
                    <View style={styles.bookingDateRow}>
                      <Ionicons name="calendar" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.bookingDate}>{formatDate(booking.eventDate)}</Text>
                    </View>
                  </View>
                  <Badge text={booking.status} variant={getStatusVariant(booking.status)} />
                </View>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />}
              title="No bookings yet"
              message="Start exploring vendors to make your first booking!"
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  budgetCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  budgetStat: {
    flex: 1,
  },
  budgetLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  budgetValue: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  budgetValueDanger: {
    color: theme.colors.danger,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    textAlign: 'center',
  },
  section: {
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  sectionLink: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  bookingCard: {
    marginBottom: theme.spacing.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingVendor: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bookingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  bookingDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
});
