import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { vendorAPI } from '../../api/vendors';
import Loading from '../../components/Loading';
import './VendorSearch.css';
import { MapPin, Star, DollarSign, Filter } from 'lucide-react';

const VENDOR_CATEGORIES = [
  'venue', 'photographer', 'videographer', 'caterer', 'decorator',
  'makeup_artist', 'mehndi_artist', 'dj_music', 'wedding_planner',
  'invitation_cards', 'bridal_wear', 'groom_wear', 'jewelry',
  'transport', 'florist', 'cake', 'other'
];

const VendorSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    search: searchParams.get('search') || '', // General text search
    page: searchParams.get('page') || 1
  });

  // Fetch vendors on mount and when search params change
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const params = Object.fromEntries([...searchParams]);
        // Remove empty keys
        Object.keys(params).forEach(key => !params[key] && delete params[key]);

        const response = params.search
          ? await vendorAPI.search({ q: params.search, ...params })
          : await vendorAPI.getAll(params);

        // The API returns the array inside response.data.data.vendors
        const vendorsList = response.data?.data?.vendors || response.data?.vendors || [];
        setVendors(vendorsList);
        if (response.data?.data?.pagination) {
          setPagination(response.data.data.pagination);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        toast.error('Failed to load vendors. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [searchParams]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Update URL params to trigger fetch
    const params = {};
    if (filters.city) params.city = filters.city;
    if (filters.category) params.category = filters.category;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.search) params.search = filters.search;
    params.page = 1; // reset to 1 on new search

    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = Object.fromEntries([...searchParams]);
    params.page = newPage;
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      page: 1
    });
    setSearchParams({});
  };

  return (
    <div className="vendor-search-container">
      <div className="search-header">
        <h1>Find Your Perfect Vendor</h1>
        <p>Browse the best wedding professionals in your area</p>
      </div>

      <form className="search-filters" onSubmit={handleSearch}>
        {/* Text Search */}
        <div className="filter-group">
          <label htmlFor="search">Search</label>
          <input
            type="text"
            id="search"
            name="search"
            placeholder="Name or keyword..."
            value={filters.search}
            onChange={handleInputChange}
            className="filter-input"
          />
        </div>

        {/* City Filter */}
        <div className="filter-group">
          <label htmlFor="city">City</label>
          <input
            type="text"
            id="city"
            name="city"
            placeholder="e.g. Lahore"
            value={filters.city}
            onChange={handleInputChange}
            className="filter-input"
          />
        </div>

        {/* Category Filter */}
        <div className="filter-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={filters.category}
            onChange={handleInputChange}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {VENDOR_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="filter-group">
          <label>Price Range (PKR)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              name="minPrice"
              placeholder="Min"
              value={filters.minPrice}
              onChange={handleInputChange}
              className="filter-input"
              style={{ width: '100%' }}
              min="0"
            />
            <input
              type="number"
              name="maxPrice"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={handleInputChange}
              className="filter-input"
              style={{ width: '100%' }}
              min="0"
            />
          </div>
        </div>

        <div className="filter-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="search-button" style={{ flex: 1 }}>
            Search
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="search-button"
            style={{ backgroundColor: '#95a5a6', flex: 0.5 }}
            title="Clear Filters"
          >
            Clear
          </button>
        </div>
      </form>

      {loading ? (
        <Loading />
      ) : (
        <div className="vendor-grid">
          {vendors.length > 0 ? (
            vendors.map((vendor) => (
              <div key={vendor._id} className="vendor-card">
                <div className="card-image-wrapper">
                  <img
                    src={vendor.coverImage?.url || 'https://via.placeholder.com/400x300?text=No+Image'}
                    alt={vendor.businessName}
                    className="card-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                </div>
                <div className="card-content">
                  <span className="card-category">
                    {vendor.category?.replace(/_/g, ' ') || 'General'}
                  </span>
                  <h3 className="card-title">{vendor.businessName}</h3>

                  <div className="card-details">
                    <div className="card-location">
                      <MapPin size={16} />
                      <span>{vendor.city || 'N/A'}</span>
                    </div>
                    <div className="card-rating">
                      <Star size={16} fill="currentColor" />
                      <span>{vendor.ratingsAverage || 0} ({vendor.ratingsCount || 0} reviews)</span>
                    </div>
                  </div>

                  <div className="card-price">
                    Starting from Rs. {(vendor.startingPrice || 0).toLocaleString()}
                  </div>

                  <Link to={`/user/vendors/${vendor.slug}`} className="view-profile-btn">
                    View Profile
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <h3>No vendors found matching your criteria</h3>
              <p>Try adjusting your filters to see more results.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="search-button"
                style={{ width: 'auto' }}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center' }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="search-button"
                style={{ width: 'auto' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorSearch;
