import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { vendorAPI } from '../../api/vendors';
import Loading from '../../components/Loading';
import {
  MapPin, Star, Search, X, SlidersHorizontal,
  ChevronDown, ChevronUp, LayoutList, LayoutGrid,
  Building2,
} from 'lucide-react';
import './VendorSearch.css';

/* ─── Static filter data ───────────────────────────────── */
const CITIES = ['Lahore', 'Islamabad', 'Rawalpindi', 'Karachi'];

const CATEGORIES = [
  { value: 'venue',         label: 'Venues' },
  { value: 'photographer',  label: 'Photographers' },
  { value: 'caterer',       label: 'Caterers' },
  { value: 'decorator',     label: 'Decorators' },
  { value: 'makeup_artist', label: 'Makeup Artists' },
];

const BUDGET_RANGES = [
  { label: '0 - 15,000',        min: 0,      max: 15000  },
  { label: '15,001 - 40,000',   min: 15001,  max: 40000  },
  { label: '40,001 - 70,000',   min: 40001,  max: 70000  },
  { label: '70,001 - 1,00,000', min: 70001,  max: 100000 },
  { label: '1,00,000+',         min: 100001, max: null   },
];

const STAFF_OPTIONS = ['Male', 'Female', 'Transgender'];

const SORT_OPTIONS = [
  { value: '',           label: 'RELEVANCE'       },
  { value: 'rating',     label: 'TOP RATED'       },
  { value: 'price_asc',  label: 'PRICE: LOW→HIGH' },
  { value: 'price_desc', label: 'PRICE: HIGH→LOW' },
];

const rangeKey = (r) => `${r.min}-${r.max ?? 'up'}`;

/* ─── Collapsible sidebar section ─────────────────────── */
const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="vs-filter-section">
      <button className="vs-filter-section-header" onClick={() => setOpen(o => !o)}>
        <span className="vs-filter-label">{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="vs-filter-section-body">{children}</div>}
    </div>
  );
};

/* ─── Main component ───────────────────────────────────── */
const VendorSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchText, setSearchText]         = useState(searchParams.get('search') || '');
  const [selectedCities, setSelectedCities] = useState(() => {
    const c = searchParams.get('city'); return c ? [c] : [];
  });
  const [subArea, setSubArea]               = useState('');
  const [selectedCats, setSelectedCats]     = useState(() => {
    const c = searchParams.get('category'); return c ? [c] : [];
  });
  const [selectedRanges, setSelectedRanges] = useState([]);
  const [selectedStaff, setSelectedStaff]   = useState([]);
  const [sortBy, setSortBy]                 = useState('');
  const [viewMode, setViewMode]             = useState('list');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [vendors, setVendors]       = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);

  const applyWith = useCallback((overrides = {}) => {
    const text   = overrides.text   !== undefined ? overrides.text   : searchText;
    const cities = overrides.cities !== undefined ? overrides.cities : selectedCities;
    const cats   = overrides.cats   !== undefined ? overrides.cats   : selectedCats;
    const ranges = overrides.ranges !== undefined ? overrides.ranges : selectedRanges;
    const sort   = overrides.sort   !== undefined ? overrides.sort   : sortBy;
    const page   = overrides.page   !== undefined ? overrides.page   : 1;

    const p = {};
    if (text.trim())   p.search   = text.trim();
    if (cities.length) p.city     = cities[0];
    if (cats.length)   p.category = cats[0];
    if (ranges.length) {
      const sorted = [...ranges].sort((a, b) => a.min - b.min);
      p.minPrice = sorted[0].min;
      const last = sorted[sorted.length - 1];
      if (last.max) p.maxPrice = last.max;
    }
    if (sort) p.sort = sort;
    p.page = page;
    setSearchParams(p);
    setMobileSidebarOpen(false);
  }, [searchText, selectedCities, selectedCats, selectedRanges, sortBy, setSearchParams]);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const params = Object.fromEntries([...searchParams]);
        Object.keys(params).forEach(k => !params[k] && delete params[k]);

        const res = params.search
          ? await vendorAPI.search({ q: params.search, ...params })
          : await vendorAPI.getAll(params);

        const list = res.data?.data?.vendors || res.data?.vendors || [];
        setVendors(list);
        const pg = res.data?.data?.pagination;
        if (pg) setPagination({ ...pg, total: pg.total ?? list.length });
        else    setPagination({ page: 1, pages: 1, total: list.length });
      } catch {
        toast.error('Failed to load vendors.');
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, [searchParams]);

  const clearFilters = () => {
    setSearchText('');
    setSelectedCities([]);
    setSubArea('');
    setSelectedCats([]);
    setSelectedRanges([]);
    setSelectedStaff([]);
    setSortBy('');
    setSearchParams({});
  };

  const toggleCity = (city) => {
    const next = selectedCities.includes(city)
      ? selectedCities.filter(c => c !== city)
      : [...selectedCities, city];
    setSelectedCities(next);
    applyWith({ cities: next });
  };

  const toggleCat = (val) => {
    const next = selectedCats.includes(val)
      ? selectedCats.filter(c => c !== val)
      : [...selectedCats, val];
    setSelectedCats(next);
    applyWith({ cats: next });
  };

  const toggleRange = (r) => {
    const key = rangeKey(r);
    const next = selectedRanges.some(x => rangeKey(x) === key)
      ? selectedRanges.filter(x => rangeKey(x) !== key)
      : [...selectedRanges, r];
    setSelectedRanges(next);
    applyWith({ ranges: next });
  };

  const toggleStaff = (s) => {
    setSelectedStaff(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handlePageChange = (p) => {
    applyWith({ page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCount =
    selectedCities.length + selectedCats.length + selectedRanges.length + selectedStaff.length;

  /* ── Sidebar ── */
  const Sidebar = () => (
    <aside className={`vs-sidebar${mobileSidebarOpen ? ' vs-sidebar--open' : ''}`}>
      <div className="vs-sidebar-header">
        <span className="vs-sidebar-title">
          <SlidersHorizontal size={14} /> FILTER
          {activeCount > 0 && <span className="vs-filter-badge">{activeCount}</span>}
        </span>
        {activeCount > 0 && (
          <button className="vs-clear-btn" onClick={clearFilters}>Clear all</button>
        )}
      </div>

      <FilterSection title="City">
        <div className="vs-city-chips">
          {CITIES.map(c => (
            <button
              key={c}
              className={`vs-city-chip${selectedCities.includes(c) ? ' vs-city-chip--active' : ''}`}
              onClick={() => toggleCity(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Sub Area" defaultOpen={false}>
        <input
          className="vs-subarea-input"
          type="text"
          placeholder="e.g. G-10 Markaz"
          value={subArea}
          onChange={e => setSubArea(e.target.value)}
        />
      </FilterSection>

      <FilterSection title="Budget (per event)">
        <div className="vs-budget-grid">
          {BUDGET_RANGES.map(r => {
            const key = rangeKey(r);
            const checked = selectedRanges.some(x => rangeKey(x) === key);
            return (
              <label key={key} className="vs-check-item">
                <input type="checkbox" checked={checked} onChange={() => toggleRange(r)} />
                {r.label}
              </label>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Staff">
        <div className="vs-staff-grid">
          {STAFF_OPTIONS.map(s => (
            <label key={s} className="vs-check-item">
              <input
                type="checkbox"
                checked={selectedStaff.includes(s)}
                onChange={() => toggleStaff(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </FilterSection>
    </aside>
  );

  /* ── List card ── */
  const VendorCard = ({ vendor }) => (
    <Link to={`/user/vendors/${vendor.slug}`} className="vs-card">
      <div className="vs-card-img-wrap">
        <img
          src={vendor.coverImage?.url || 'https://placehold.co/600x400?text=VidAI'}
          alt={vendor.businessName}
          className="vs-card-img"
          onError={e => { e.target.src = 'https://placehold.co/600x400?text=VidAI'; }}
        />
        <div className="vs-card-badges">
          {vendor.discount   && <span className="vs-badge vs-badge--deal">{vendor.discount}% Off</span>}
          {vendor.isFeatured && <span className="vs-badge vs-badge--pick">Top Pick</span>}
        </div>
      </div>

      <div className="vs-card-body">
        <div className="vs-card-top">
          <h3 className="vs-card-name">{vendor.businessName}</h3>

          {vendor.ratingsCount > 0 && (
            <div className="vs-card-rating">
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <span>{(vendor.ratingsAverage || 0).toFixed(1)}</span>
              <span className="vs-card-rev-count">({vendor.ratingsCount})</span>
            </div>
          )}

          {(vendor.address || vendor.city) && (
            <div className="vs-card-loc">
              <Building2 size={13} />
              <span>{[vendor.address, vendor.city].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {vendor.perks?.length > 0 && (
            <div className="vs-card-perks">
              {vendor.perks.slice(0, 3).map((p, i) => (
                <span key={i} className={`vs-perk vs-perk--${i % 2 === 0 ? 'a' : 'b'}`}>{p}</span>
              ))}
            </div>
          )}

          {vendor.description && (
            <p className="vs-card-desc">{vendor.description}</p>
          )}
        </div>

        <div className="vs-card-footer">
          <div className="vs-card-vendor-info">
            <img
              src={vendor.profileImage?.url || vendor.coverImage?.url || 'https://placehold.co/32x32?text=V'}
              alt={vendor.businessName}
              className="vs-card-avatar"
              onError={e => { e.target.src = 'https://placehold.co/32x32?text=V'; }}
            />
            <span className="vs-card-vendor-name">{vendor.businessName}</span>
          </div>
          <span className="vs-card-price">
            Starting at PKR {(vendor.startingPrice || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );

  /* ── Grid tile ── */
  const VendorTile = ({ vendor }) => (
    <Link to={`/user/vendors/${vendor.slug}`} className="vs-tile">
      <div className="vs-tile-img-wrap">
        <img
          src={vendor.coverImage?.url || 'https://placehold.co/400x300?text=VidAI'}
          alt={vendor.businessName}
          className="vs-tile-img"
          onError={e => { e.target.src = 'https://placehold.co/400x300?text=VidAI'; }}
        />
        <div className="vs-tile-badges">
          {vendor.discount   && <span className="vs-badge vs-badge--deal">{vendor.discount}% Off</span>}
          {vendor.isFeatured && <span className="vs-badge vs-badge--pick">Top Pick</span>}
        </div>
      </div>
      <div className="vs-tile-body">
        <span className="vs-tile-cat">{vendor.category?.replace(/_/g, ' ') || 'General'}</span>
        <h3 className="vs-tile-name">{vendor.businessName}</h3>
        <div className="vs-tile-meta">
          <span className="vs-tile-loc"><MapPin size={12} /> {vendor.city || 'N/A'}</span>
          {vendor.ratingsCount > 0 && (
            <span className="vs-tile-rating">
              <Star size={12} fill="currentColor" />
              {(vendor.ratingsAverage || 0).toFixed(1)}
              <span className="vs-tile-rev-count">({vendor.ratingsCount})</span>
            </span>
          )}
        </div>
        {vendor.description && <p className="vs-tile-desc">{vendor.description}</p>}
        <div className="vs-tile-footer">
          <span className="vs-tile-price">Starting at PKR {(vendor.startingPrice || 0).toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );

  /* ── Render ── */
  return (
    <div className="vs-page">

      {/* Top search bar */}
      <div className="vs-topbar">
        <form
          className="vs-search-form"
          onSubmit={e => { e.preventDefault(); applyWith({ text: searchText }); }}
        >
          <Search size={17} className="vs-search-icon" />
          <input
            type="text"
            className="vs-search-input"
            placeholder="Search vendors by name or keyword…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          {searchText && (
            <button type="button" className="vs-search-clear" onClick={() => setSearchText('')}>
              <X size={15} />
            </button>
          )}
          <button type="submit" className="vs-search-btn">Search</button>
        </form>

        <button
          className="vs-mobile-filter-btn"
          onClick={() => setMobileSidebarOpen(s => !s)}
        >
          <SlidersHorizontal size={15} />
          Filters {activeCount > 0 && `(${activeCount})`}
        </button>
      </div>

      <div className="vs-body">
        <Sidebar />

        <main className="vs-main">
          <div className="vs-meta-row">
            <span className="vs-result-count">
              {!loading && `${vendors.length} OF ${pagination.total ?? vendors.length} RESULTS`}
            </span>

            <div className="vs-meta-right">
              <span className="vs-view-label">VIEW</span>
              <div className="vs-view-toggle">
                <button
                  className={`vs-view-btn${viewMode === 'list' ? ' vs-view-btn--active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <LayoutList size={16} />
                </button>
                <button
                  className={`vs-view-btn${viewMode === 'grid' ? ' vs-view-btn--active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              <span className="vs-divider">|</span>
              <span className="vs-sort-label">SORT BY:</span>
              <select
                className="vs-sort-select"
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); applyWith({ sort: e.target.value }); }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <Loading />
          ) : vendors.length === 0 ? (
            <div className="vs-no-results">
              <div className="vs-no-icon">🔍</div>
              <h3>No vendors found</h3>
              <p>Try adjusting your filters or search term.</p>
              <button className="vs-apply-btn" onClick={clearFilters}>Clear Filters</button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="vs-cards">
              {vendors.map(vendor => (
                <VendorCard key={vendor._id} vendor={vendor} />
              ))}
            </div>
          ) : (
            <div className="vs-tiles">
              {vendors.map(vendor => (
                <VendorTile key={vendor._id} vendor={vendor} />
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="vs-pagination">
              <button
                className="vs-page-btn"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                ← Prev
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`vs-page-btn${p === pagination.page ? ' vs-page-btn--active' : ''}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="vs-page-btn"
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      {mobileSidebarOpen && (
        <div className="vs-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
    </div>
  );
};

export default VendorSearch;
