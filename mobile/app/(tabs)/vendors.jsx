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
import { useAuth } from '../../contexts/AuthContext';
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
  const { isAuthenticated } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = { page: pageNum };
      if (filters.search) params.q = filters.search;
      if (filters.city) params.city = filters.city;
      if (filters.category) params.category = filters.category;

      const response = filters.search
        ? await vendorAPI.search(params)
        : await vendorAPI.getAll(params);

      const resData = response.data.data?.vendors || response.data.vendors || response.data || [];
      const paginationInfo = response.data.data?.pagination;

      if (pageNum === 1) {
        setVendors(resData);
      } else {
        setVendors(prev => [...prev, ...resData]);
      }

      setPage(pageNum);

      if (paginationInfo) {
        setHasMore(pageNum < paginationInfo.pages);
      } else {
        setHasMore(resData.length >= 10);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    fetchVendors(1);
  };

  const clearFilters = () => {
    setFilters({ city: '', category: '', search: '' });
    setTimeout(() => fetchVendors(1), 100);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchVendors(page + 1);
    }
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
        <Text style={styles.vendorCategory} numberOfLines={1}>
          {item.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </Text>
        <Text style={styles.vendorName} numberOfLines={1}>{item.businessName}</Text>
        <View style={styles.vendorDetails}>
          <View style={styles.vendorDetailRow}>
            <Ionicons name="location" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.vendorDetailText} numberOfLines={1}>{item.city}</Text>
          </View>
          <View style={styles.vendorDetailRow}>
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text style={styles.vendorDetailText}>
              {item.ratingsAverage?.toFixed(1) || '0.0'} ({item.ratingsCount || 0})
            </Text>
          </View>
        </View>
        <Text style={styles.vendorPrice} numberOfLines={1}>
          Rs. {item.startingPrice?.toLocaleString() || '0'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen message="Loading vendors..." />;
  }

  return (
    <View style={styles.container}>
      {/* Guest Banner */}
      {!isAuthenticated && (
        <View style={styles.guestBanner}>
          <Ionicons name="information-circle" size={18} color={theme.colors.white} />
          <Text style={styles.guestBannerText}>Browsing as guest. </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.guestBannerLink}>Sign in</Text>
          </TouchableOpacity>
          <Text style={styles.guestBannerText}> to book vendors.</Text>
        </View>
      )}
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
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            loadingMore ? <Loading message="Loading more..." /> : null
          }
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
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  guestBannerText: {
    color: theme.colors.white,
    fontSize: 13,
  },
  guestBannerLink: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
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
    padding: theme.spacing.sm,
  },
  rowWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  vendorCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    width: '48%', // take up roughly half the row for 2 columns
  },
  vendorImage: {
    width: '100%',
    height: 120, // Smaller image for tiles
    backgroundColor: theme.colors.border,
  },
  vendorContent: {
    padding: 12,
  },
  vendorCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  vendorDetails: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
  },
  vendorDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorDetailText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  vendorPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 4,
  },
});
