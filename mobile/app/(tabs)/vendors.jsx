import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { vendorAPI } from '../../api/vendors.js';
import Loading from '../../components/Loading';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const VENDOR_CATEGORIES = [
  'venue',
  'photographer',
  'videographer',
  'caterer',
  'decorator',
  'makeup_artist',
  'mehndi_artist',
  'dj_music',
  'wedding_planner',
  'invitation_cards',
  'bridal_wear',
  'groom_wear',
  'jewelry',
  'transport',
  'florist',
  'cake',
  'other',
];

export default function Vendors() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.q = filters.search;
      if (filters.city) params.city = filters.city;
      if (filters.category) params.category = filters.category;

      const response = filters.search
        ? await vendorAPI.search(params)
        : await vendorAPI.getAll(params);

      setVendors(response.data.vendors || response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchVendors();
  };

  const clearFilters = () => {
    setFilters({ city: '', category: '', search: '' });
    setTimeout(fetchVendors, 100);
  };

  const renderVendor = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/vendors/${item.slug}`)}
      style={styles.vendorCard}
    >
      <Image
        source={{
          uri: item.coverImage?.url || 'https://via.placeholder.com/400x300?text=No+Image',
        }}
        style={styles.vendorImage}
        resizeMode="cover"
      />
      <View style={styles.vendorContent}>
        <Text style={styles.vendorCategory}>
          {item.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </Text>
        <Text style={styles.vendorName}>{item.businessName}</Text>
        <View style={styles.vendorDetails}>
          <View style={styles.vendorDetailRow}>
            <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.vendorDetailText}>{item.city}</Text>
          </View>
          <View style={styles.vendorDetailRow}>
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text style={styles.vendorDetailText}>
              {item.ratingsAverage?.toFixed(1) || '0.0'} ({item.ratingsCount || 0})
            </Text>
          </View>
        </View>
        <Text style={styles.vendorPrice}>
          Starting from Rs. {item.startingPrice?.toLocaleString() || '0'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen message="Loading vendors..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors..."
            value={filters.search}
            onChangeText={(text) => setFilters({ ...filters, search: text })}
            onSubmitEditing={handleSearch}
          />
          {filters.search ? (
            <TouchableOpacity onPress={() => setFilters({ ...filters, search: '' })}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <Card style={styles.filtersCard}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>City</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="e.g. Lahore"
              value={filters.city}
              onChangeText={(text) => setFilters({ ...filters, city: text })}
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryChips}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !filters.category && styles.categoryChipActive,
                  ]}
                  onPress={() => setFilters({ ...filters, category: '' })}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      !filters.category && styles.categoryChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {VENDOR_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      filters.category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        filters.category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterActionButton} onPress={handleSearch}>
              <Text style={styles.filterActionText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterActionButton, styles.filterActionButtonSecondary]}
              onPress={clearFilters}
            >
              <Text style={[styles.filterActionText, styles.filterActionTextSecondary]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {vendors.length > 0 ? (
        <FlatList
          data={vendors}
          renderItem={renderVendor}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          icon={<Ionicons name="storefront-outline" size={48} color={theme.colors.textSecondary} />}
          title="No vendors found"
          message="Try adjusting your search or filters"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  filterButton: {
    padding: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersCard: {
    margin: theme.spacing.md,
  },
  filterRow: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
  },
  categoryChipTextActive: {
    color: theme.colors.white,
  },
  filterActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterActionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  filterActionButtonSecondary: {
    backgroundColor: theme.colors.surface,
  },
  filterActionText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  filterActionTextSecondary: {
    color: theme.colors.text,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  vendorCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  vendorImage: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.border,
  },
  vendorContent: {
    padding: 20,
  },
  vendorCategory: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  vendorName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  vendorDetails: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  vendorDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  vendorDetailText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  vendorPrice: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 12,
    fontSize: 16,
  },
});
