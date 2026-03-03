import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  CalendarCheck,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Hourglass,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminBookings.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'All Payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
];

const STATUS_META = {
  pending:   { icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Pending'   },
  approved:  { icon: CheckCircle,  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Approved'  },
  rejected:  { icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Rejected'  },
  completed: { icon: CalendarCheck,color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  label: 'Completed' },
  cancelled: { icon: Ban,          color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Cancelled' },
};

const PAYMENT_META = {
  unpaid:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Unpaid'   },
  partial:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Partial'  },
  paid:     { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Paid'     },
  refunded: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Refunded' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span className="ab-badge" style={{ color: m.color, background: m.bg }}>
      <Icon size={11} />
      {m.label}
    </span>
  );
}

function PaymentBadge({ status }) {
  const m = PAYMENT_META[status] || PAYMENT_META.unpaid;
  return (
    <span className="ab-badge" style={{ color: m.color, background: m.bg }}>
      <CreditCard size={11} />
      {m.label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmt(n) {
  if (!n && n !== 0) return '—';
  return `Rs. ${Number(n).toLocaleString('en-PK')}`;
}

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);

  const [counts, setCounts] = useState({});

  const fetchBookings = useCallback(async (opts = {}) => {
    const { silent = false, pg = page } = opts;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = { page: pg, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;

      const { data } = await adminAPI.getBookings(params);
      setBookings(data.data.bookings);
      setPagination(data.data.pagination);
    } catch (err) {
      console.error('Bookings fetch error:', err?.response?.status, err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, paymentFilter, page]);

  // Fetch summary counts once
  useEffect(() => {
    (async () => {
      try {
        const statuses = ['pending', 'approved', 'completed', 'cancelled', 'rejected'];
        const results = await Promise.all(
          statuses.map((s) => adminAPI.getBookings({ status: s, limit: 1 }))
        );
        const c = {};
        statuses.forEach((s, i) => { c[s] = results[i].data.data.pagination.total; });
        setCounts(c);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    fetchBookings({ pg: page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, paymentFilter, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBookings({ pg: 1 });
  };

  const handleRefresh = () => fetchBookings({ silent: true, pg: page });

  if (loading) return <Loading />;

  const SUMMARY = [
    { key: 'pending',   label: 'Pending',   color: '#f59e0b' },
    { key: 'approved',  label: 'Approved',  color: '#22c55e' },
    { key: 'completed', label: 'Completed', color: '#3b82f6' },
    { key: 'cancelled', label: 'Cancelled', color: '#6b7280' },
  ];

  return (
    <div className="ab-page">
      {/* ── Header ── */}
      <div className="ab-header">
        <div className="ab-header-left">
          <div className="ab-header-icon">
            <CalendarCheck size={20} />
          </div>
          <div>
            <h1 className="ab-title">Bookings</h1>
            <p className="ab-subtitle">
              {pagination.total.toLocaleString()} booking{pagination.total !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`ab-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* ── Summary pills ── */}
      <div className="ab-summary">
        {SUMMARY.map(({ key, label, color }) => (
          <button
            key={key}
            type="button"
            className={`ab-summary-pill ${statusFilter === key ? 'active' : ''}`}
            style={{ '--pill-color': color }}
            onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1); }}
          >
            <span className="ab-summary-dot" style={{ background: color }} />
            <span className="ab-summary-label">{label}</span>
            <span className="ab-summary-count">{counts[key] ?? '…'}</span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="ab-filters">
        <form className="ab-search-form" onSubmit={handleSearch}>
          <Search size={15} className="ab-search-icon" />
          <input
            type="text"
            placeholder="Search by event type, location, package…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ab-search-input"
          />
        </form>

        <select
          className="ab-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          className="ab-select"
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
        >
          {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="ab-table-wrap">
        {bookings.length === 0 ? (
          <div className="ab-empty">
            <Hourglass size={36} className="ab-empty-icon" />
            <p>No bookings found</p>
          </div>
        ) : (
          <table className="ab-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vendor</th>
                <th>Event</th>
                <th>Event Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Booked On</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <div className="ab-user-cell">
                      <div className="ab-avatar">{(b.user?.name || 'U').charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="ab-cell-primary">{b.user?.name || '—'}</div>
                        <div className="ab-cell-secondary">{b.user?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="ab-cell-primary">{b.vendor?.businessName || '—'}</div>
                    <div className="ab-cell-secondary ab-category">{b.vendor?.category || ''}</div>
                  </td>
                  <td>
                    <span className="ab-event-type">{b.eventType}</span>
                    {b.eventLocation && <div className="ab-cell-secondary">{b.eventLocation}</div>}
                  </td>
                  <td className="ab-cell-primary">{fmtDate(b.eventDate)}</td>
                  <td className="ab-cell-primary ab-amt">{fmtAmt(b.agreedPrice)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td><PaymentBadge status={b.paymentStatus} /></td>
                  <td className="ab-cell-secondary">{fmtDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination.pages > 1 && (
        <div className="ab-pagination">
          <button
            className="ab-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="ab-page-info">
            Page {page} of {pagination.pages}
          </span>

          <button
            className="ab-page-btn"
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminBookings;
