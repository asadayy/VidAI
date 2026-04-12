import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { vendorAPI } from '../../api/vendors.js';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Toast from 'react-native-toast-message';

// -- constants --

const CITIES = ['Islamabad', 'Rawalpindi'];

const CATEGORIES = [
  { value: '',              label: 'All' },
  { value: 'venue',         label: 'Venues' },
  { value: 'photographer',  label: 'Photographers' },
  { value: 'videographer',  label: 'Videographers' },
  { value: 'caterer',       label: 'Caterers' },
  { value: 'decorator',     label: 'Decorators' },
  { value: 'makeup_artist', label: 'Makeup Artists' },
  { value: 'mehndi_artist', label: 'Mehndi Artists' },
  { value: 'dj_music',      label: 'DJ & Music' },
  { value: 'wedding_planner', label: 'Planners' },
  { value: 'bridal_wear',   label: 'Bridal Wear' },
  { value: 'groom_wear',    label: 'Groom Wear' },
  { value: 'jewelry',       label: 'Jewelry' },
  { value: 'transport',     label: 'Transport' },
  { value: 'florist',       label: 'Florists' },
  { value: 'cake',          label: 'Cakes' },
  { value: 'other',         label: 'Other' },
];

const BUDGET_RANGES = [
  { label: 'Under 15,000',      min: 0,      max: 15000  },
  { label: '15k - 40k',         min: 15001,  max: 40000  },
  { label: '40k - 70k',         min: 40001,  max: 70000  },
  { label: '70k - 1 Lac',       min: 70001,  max: 100000 },
  { label: '1 Lac+',            min: 100001, max: null   },
];

const SORT_OPTIONS = [
  { value: '',           label: 'Relevance'       },
  { value: 'rating',     label: 'Top Rated'       },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const rangeKey = (r) => `${r.min}-${r.max ?? 'up'}`;


// -- component --

export default function Vendors() {
  const router = useRouter();
  // list state
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  // search / filter / sort state
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedRanges, setSelectedRanges] = useState([]);
  const [sortBy, setSortBy] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // filter modal draft state
  const [filterVisible, setFilterVisible] = useState(false);
  const [draftCities, setDraftCities] = useState([]);
  const [draftRanges, setDraftRanges] = useState([]);
  const [draftSort, setDraftSort] = useState('');
  const [customMinAmount, setCustomMinAmount] = useState('');
  const [draftCustomMin, setDraftCustomMin] = useState('');

  const activeFilterCount = selectedCities.length + selectedRanges.length + (customMinAmount ? 1 : 0) + (sortBy ? 1 : 0);

  // -- data fetching --
  const fetchVendors = useCallback(async (opts = {}) => {
    const {
      pageNum = 1,
      search = appliedSearch,
      category = selectedCategory,
      cities = selectedCities,
      ranges = selectedRanges,
      sort = sortBy,
    } = opts;

    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = { page: pageNum };
      if (search.trim()) params.q = search.trim();
      if (category) params.category = category;
      if (cities.length) params.city = cities[0];
      if (sort) params.sort = sort;
      if (ranges.length) {
        const sorted = [...ranges].sort((a, b) => a.min - b.min);
        params.minPrice = sorted[0].min;
        const last = sorted[sorted.length - 1];
        if (last.max) params.maxPrice = last.max;
      } else if (opts.customMin && Number(opts.customMin) > 0) {
        params.minPrice = Number(opts.customMin);
      }

      const response = search.trim()
        ? await vendorAPI.search(params)
        : await vendorAPI.getAll(params);

      const resData = response.data?.data?.vendors || response.data?.vendors || [];
      const pg = response.data?.data?.pagination;

      if (pageNum === 1) setVendors(resData);
      else setVendors(prev => [...prev, ...resData]);

      setPage(pageNum);
      if (pg) {
        setTotalResults(pg.total ?? resData.length);
        setHasMore(pageNum < pg.pages);
      } else {
        setTotalResults(resData.length);
        setHasMore(resData.length >= 10);
      }
    } catch (error) {
      if (pageNum === 1) {
        Toast.show({
          type: 'error',
          text1: 'Failed to load vendors',
          text2: error.response?.data?.message || 'Check your connection and try again',
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [appliedSearch, selectedCategory, selectedCities, selectedRanges, sortBy]);

  useEffect(() => {
    fetchVendors({ pageNum: 1 });
  }, [selectedCategory]);

  const handleSearch = () => {
    setAppliedSearch(searchText);
    fetchVendors({ pageNum: 1, search: searchText });
  };

  const clearSearch = () => {
    setSearchText('');
    setAppliedSearch('');
    fetchVendors({ pageNum: 1, search: '' });
  };

  const handleCategorySelect = (val) => {
    setSelectedCategory(val);
    fetchVendors({ pageNum: 1, category: val });
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) fetchVendors({ pageNum: page + 1 });
  };

  // -- filter modal helpers --
  const openFilterModal = () => {
    setDraftCities([...selectedCities]);
    setDraftRanges([...selectedRanges]);
    setDraftSort(sortBy);
    setDraftCustomMin(customMinAmount);
    setFilterVisible(true);
  };

  const toggleDraftCity = (city) => {
    setDraftCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const toggleDraftRange = (r) => {
    const key = rangeKey(r);
    setDraftCustomMin('');
    setDraftRanges(prev =>
      prev.some(x => rangeKey(x) === key)
        ? prev.filter(x => rangeKey(x) !== key)
        : [...prev, r]
    );
  };

  const applyFilters = () => {
    setSelectedCities(draftCities);
    setSelectedRanges(draftRanges);
    setCustomMinAmount(draftCustomMin);
    setSortBy(draftSort);
    setFilterVisible(false);
    fetchVendors({
      pageNum: 1,
      cities: draftCities,
      ranges: draftRanges,
      customMin: draftCustomMin,
      sort: draftSort,
    });
  };

  const clearFilters = () => {
    setDraftCities([]);
    setDraftRanges([]);
    setDraftCustomMin('');
    setDraftSort('');
    setSelectedCities([]);
    setSelectedRanges([]);
    setCustomMinAmount('');
    setSortBy('');
    setFilterVisible(false);
    fetchVendors({ pageNum: 1, cities: [], ranges: [], customMin: '', sort: '' });
  };

  // -- card renderers --
  const renderListCard = ({ item: v }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => router.push(`/vendors/${v.slug}`)}
      activeOpacity={0.85}
    >
      {/* cover image */}
      <View style={styles.listCardImgWrap}>
        <Image
          source={{ uri: v.coverImage?.url || 'https://placehold.co/400x300?text=VidAI' }}
          style={styles.listCardImg}
          resizeMode="cover"
        />
        <View style={styles.listCardBadges}>
          {v.discount > 0 && (
            <View style={styles.badgeDeal}>
              <Text style={styles.badgeText}>{v.discount}% Off</Text>
            </View>
          )}
          {v.isFeatured && (
            <View style={styles.badgePick}>
              <Text style={styles.badgeText}>Top Pick</Text>
            </View>
          )}
        </View>
      </View>

      {/* details */}
      <View style={styles.listCardBody}>
        {/* category label */}
        <Text style={styles.cardCategory} numberOfLines={1}>
          {(v.category || 'General').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>

        {/* name + rating row */}
        <View style={styles.nameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{v.businessName}</Text>
          {v.ratingsCount > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color="#f59e0b" />
              <Text style={styles.ratingText}>{(v.ratingsAverage || 0).toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({v.ratingsCount})</Text>
            </View>
          )}
        </View>

        {/* location */}
        {(v.city || v.address) && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {[v.address, v.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* perks */}
        {v.perks?.length > 0 && (
          <View style={styles.perksRow}>
            {v.perks.slice(0, 3).map((p, i) => (
              <View key={i} style={[styles.perkChip, i % 2 === 0 ? styles.perkA : styles.perkB]}>
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {/* description */}
        {v.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{v.description}</Text>
        )}

        {/* footer: avatar + price */}
        <View style={styles.listCardFooter}>
          <View style={styles.vendorAvatar}>
            <Image
              source={{ uri: v.profileImage?.url || v.coverImage?.url || 'https://placehold.co/32x32?text=V' }}
              style={styles.avatarImg}
            />
            <Text style={styles.avatarName} numberOfLines={1}>{v.businessName}</Text>
          </View>
          <View style={styles.priceTag}>
            <Text style={styles.priceLabel}>Starting at</Text>
            <Text style={styles.priceValue}>PKR {(v.startingPrice || 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGridTile = ({ item: v }) => (
    <TouchableOpacity
      style={styles.gridTile}
      onPress={() => router.push(`/vendors/${v.slug}`)}
      activeOpacity={0.85}
    >
      <View style={styles.gridImgWrap}>
        <Image
          source={{ uri: v.coverImage?.url || 'https://placehold.co/400x300?text=VidAI' }}
          style={styles.gridImg}
          resizeMode="cover"
        />
        <View style={styles.gridBadges}>
          {v.discount > 0 && (
            <View style={styles.badgeDeal}>
              <Text style={styles.badgeText}>{v.discount}% Off</Text>
            </View>
          )}
          {v.isFeatured && (
            <View style={styles.badgePick}>
              <Text style={styles.badgeText}>Top Pick</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.gridBody}>
        <Text style={styles.gridCategory} numberOfLines={1}>
          {(v.category || 'General').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
        <Text style={styles.gridName} numberOfLines={2}>{v.businessName}</Text>
        <View style={styles.gridMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={11} color={theme.colors.textSecondary} />
            <Text style={styles.gridMetaText} numberOfLines={1}>{v.city || 'N/A'}</Text>
          </View>
          {v.ratingsCount > 0 && (
            <View style={styles.metaRow}>
              <Ionicons name="star" size={11} color="#f59e0b" />
              <Text style={styles.gridMetaText}>
                {(v.ratingsAverage || 0).toFixed(1)} ({v.ratingsCount})
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.gridPrice} numberOfLines={1}>
          PKR {(v.startingPrice || 0).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // -- render --
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />

      {/* search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors by name or keyword..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.catChip, selectedCategory === cat.value && styles.catChipActive]}
            onPress={() => handleCategorySelect(cat.value)}
          >
            <Text style={[styles.catChipText, selectedCategory === cat.value && styles.catChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* results bar */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultCount}>
          {!loading ? `${vendors.length} of ${totalResults} results` : 'Loading...'}
        </Text>
        <View style={styles.barRight}>
          {/* filter btn */}
          <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
            <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? theme.colors.primary : theme.colors.text} />
            <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>

          {/* view toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list" size={16} color={viewMode === 'list' ? theme.colors.white : theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons name="grid" size={16} color={viewMode === 'grid' ? theme.colors.white : theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* vendor list */}
      {loading ? (
        <Loading fullScreen message="Loading vendors..." />
      ) : vendors.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="storefront-outline" size={48} color={theme.colors.textSecondary} />}
          title="No vendors found"
          message="Try adjusting your search or filters"
        />
      ) : (
        <FlatList
          data={vendors}
          renderItem={viewMode === 'list' ? renderListCard : renderGridTile}
          keyExtractor={(item) => item._id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // force re-mount when numColumns changes
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={() =>
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* filter modal */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={styles.modalSheet}>
          {/* modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* city section */}
            <Text style={styles.modalSectionTitle}>City</Text>
            <View style={styles.chipGrid}>
              {CITIES.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.filterChip, draftCities.includes(city) && styles.filterChipActive]}
                  onPress={() => toggleDraftCity(city)}
                >
                  <Text style={[styles.filterChipText, draftCities.includes(city) && styles.filterChipTextActive]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* budget section */}
            <Text style={styles.modalSectionTitle}>Budget (per event)</Text>
            <View style={styles.budgetList}>
              {BUDGET_RANGES.map(r => {
                const key = rangeKey(r);
                const checked = draftRanges.some(x => rangeKey(x) === key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.checkRow}
                    onPress={() => toggleDraftRange(r)}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Ionicons name="checkmark" size={13} color={theme.colors.white} />}
                    </View>
                    <Text style={styles.checkLabel}>PKR {r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* custom minimum amount */}
            <Text style={[styles.modalSectionTitle, { fontSize: 12, marginTop: 4 }]}>Custom minimum</Text>
            <View style={styles.customAmountRow}>
              <TextInput
                style={styles.customAmountInput}
                placeholder="e.g. 50000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={draftCustomMin}
                onChangeText={(val) => { setDraftCustomMin(val); if (val) setDraftRanges([]); }}
              />
            </View>

            {/* sort section */}
            <Text style={styles.modalSectionTitle}>Sort By</Text>
            <View style={styles.chipGrid}>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filterChip, draftSort === opt.value && styles.filterChipActive]}
                  onPress={() => setDraftSort(opt.value)}
                >
                  <Text style={[styles.filterChipText, draftSort === opt.value && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* modal actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// -- styles --

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },

  // search
  searchWrapper: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  searchBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // categories
  categoryScroll: {
    backgroundColor: theme.colors.white,
    maxHeight: 52,
  },
  categoryContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  catChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catChipText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: '#fff',
  },

  // results bar
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  barRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterBtnText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  filterBtnTextActive: { color: theme.colors.primary },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewBtn: {
    padding: 6,
    backgroundColor: theme.colors.surface,
  },
  viewBtnActive: {
    backgroundColor: theme.colors.primary,
  },

  // list content
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },

  // -- list card --
  listCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.07)',
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  listCardImgWrap: {
    position: 'relative',
  },
  listCardImg: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.border,
  },
  listCardBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  listCardBody: {
    padding: 14,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  ratingCount: { fontSize: 11, color: '#b45309' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    marginTop: 2,
  },
  perkChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  perkA: { backgroundColor: '#fce7f3' },
  perkB: { backgroundColor: '#ede9fe' },
  perkText: { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  cardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  listCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  vendorAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
  },
  avatarName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  priceTag: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  // -- badges --
  badgeDeal: {
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgePick: {
    backgroundColor: '#7c3aed',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // -- grid tile --
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  gridTile: {
    width: '48.5%',
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  gridImgWrap: { position: 'relative' },
  gridImg: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.border,
  },
  gridBadges: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
  },
  gridBody: { padding: 10 },
  gridCategory: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 5,
    lineHeight: 18,
  },
  gridMeta: { gap: 3, marginBottom: 6 },
  gridMetaText: { fontSize: 11, color: theme.colors.textSecondary },
  gridPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  // footer loader
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  // -- filter modal --
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 16,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  filterChipTextActive: { color: '#fff' },
  budgetList: { gap: 10 },
  customAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customAmountInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkLabel: { fontSize: 14, color: theme.colors.text },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  applyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
