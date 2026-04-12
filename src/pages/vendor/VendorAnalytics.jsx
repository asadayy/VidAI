import { useState, useEffect, useMemo } from 'react';
import { vendorAPI } from '../../api/vendors';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, CalendarCheck, CheckCircle2, XCircle,
  Eye, Star, BarChart3, Users,
} from 'lucide-react';
import './VendorAnalytics.css';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_COLORS = {
  pending: '#F59E0B',
  approved: '#10B981',
  completed: '#6366F1',
  rejected: '#EF4444',
  expired: '#9CA3AF',
  cancelled: '#78716C',
};

const PAYMENT_COLORS = {
  unpaid: '#EF4444',
  partial: '#F59E0B',
  paid: '#10B981',
  refunded: '#8B5CF6',
};

const EVENT_COLORS = ['#D7385E', '#6366F1', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6'];

const formatPKR = (v) => `PKR ${Number(v || 0).toLocaleString('en-PK')}`;

const KPI_CONFIG = [
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, color: '#10B981', bg: '#ecfdf5', format: formatPKR, cmpKey: 'revenue' },
  { key: 'pendingRevenue', label: 'Pending Revenue', icon: DollarSign, color: '#F59E0B', bg: '#fffbeb', format: formatPKR },
  { key: 'totalBookings', label: 'Total Bookings', icon: CalendarCheck, color: '#D7385E', bg: '#fdf2f5', cmpKey: 'bookings' },
  { key: 'completedBookings', label: 'Completed', icon: CheckCircle2, color: '#6366F1', bg: '#eef2ff', cmpKey: 'completed' },
  { key: 'cancelledBookings', label: 'Cancelled', icon: XCircle, color: '#EF4444', bg: '#fef2f2', cmpKey: 'cancelled' },
  { key: 'avgDealValue', label: 'Avg Deal Value', icon: BarChart3, color: '#8B5CF6', bg: '#f5f3ff', format: formatPKR },
  { key: 'conversionRate', label: 'Conversion Rate', icon: TrendingUp, color: '#10B981', bg: '#ecfdf5', suffix: '%' },
  { key: 'cancellationRate', label: 'Cancellation Rate', icon: TrendingDown, color: '#EF4444', bg: '#fef2f2', suffix: '%' },
];

function ChangeIndicator({ value }) {
  if (value === undefined || value === null) return null;
  const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span className={`va-kpi-change ${cls}`}>
      <Icon size={12} />
      {Math.abs(value)}% vs prev
    </span>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.82rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: {p.dataKey === 'revenue' ? formatPKR(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function VendorAnalytics() {
  const now = new Date();
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const list = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) list.push(y);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await vendorAPI.getAnalytics({ period, year, month });
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { cancelled = true; };
  }, [period, year, month]);

  if (loading) return <Loading text="Loading analytics..." />;
  if (!data) return <div className="va-empty"><BarChart3 size={40} /><p>No analytics data available</p></div>;

  const { summary, comparison, trend, statusDistribution, paymentBreakdown, eventBreakdown, profile } = data;

  // Pie data
  const statusData = Object.entries(statusDistribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), value, fill: STATUS_COLORS[key] }));

  const paymentData = Object.entries(paymentBreakdown)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), value, fill: PAYMENT_COLORS[key] }));

  const eventData = eventBreakdown.map((e, i) => ({
    name: (e.eventType || 'Other').charAt(0).toUpperCase() + (e.eventType || 'other').slice(1),
    bookings: e.count,
    revenue: e.revenue,
    fill: EVENT_COLORS[i % EVENT_COLORS.length],
  }));

  return (
    <div className="va-page">
      {/* Header */}
      <div className="va-header">
        <h1>Sales Analytics</h1>
        <div className="va-header-controls">
          <select className="va-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
          <select className="va-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {period === 'monthly' && (
            <select className="va-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="va-kpi-grid">
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, bg, format, suffix, cmpKey }) => (
          <div key={key} className="va-kpi-card" style={{ '--kpi-accent': color }}>
            <style>{`.va-kpi-card[style*="${color}"]::before { background: ${color}; }`}</style>
            <div className="va-kpi-header">
              <span className="va-kpi-label">{label}</span>
              <div className="va-kpi-icon" style={{ background: bg, color }}>
                <Icon size={16} />
              </div>
            </div>
            <span className="va-kpi-value">
              {format ? format(summary[key]) : `${summary[key] ?? 0}${suffix || ''}`}
            </span>
            {cmpKey && <ChangeIndicator value={comparison[cmpKey]} />}
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <div className="va-section">
        <h2 className="va-section-title">Revenue & Bookings Trend</h2>
        <div className="va-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <YAxis yAxisId="bookings" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#colorRevenue)" strokeWidth={2} />
              <Area yAxisId="bookings" type="monotone" dataKey="bookings" name="Bookings" stroke="#6366F1" fill="url(#colorBookings)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Charts Row */}
      <div className="va-pie-row">
        {/* Status Distribution */}
        <div className="va-section">
          <h2 className="va-section-title">Booking Status</h2>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="va-legend">
                {statusData.map((d) => (
                  <span key={d.name} className="va-legend-item">
                    <span className="va-legend-dot" style={{ background: d.fill }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          ) : <p className="va-empty">No bookings yet</p>}
        </div>

        {/* Payment Breakdown */}
        <div className="va-section">
          <h2 className="va-section-title">Payment Status</h2>
          {paymentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {paymentData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="va-legend">
                {paymentData.map((d) => (
                  <span key={d.name} className="va-legend-item">
                    <span className="va-legend-dot" style={{ background: d.fill }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          ) : <p className="va-empty">No payment data</p>}
        </div>

        {/* Event Types */}
        <div className="va-section">
          <h2 className="va-section-title">Event Types</h2>
          {eventData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eventData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="bookings" name="Bookings" radius={[6, 6, 0, 0]}>
                    {eventData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="va-legend">
                {eventData.map((d) => (
                  <span key={d.name} className="va-legend-item">
                    <span className="va-legend-dot" style={{ background: d.fill }} />
                    {d.name} ({d.bookings})
                  </span>
                ))}
              </div>
            </>
          ) : <p className="va-empty">No event data</p>}
        </div>
      </div>

      {/* Profile Stats */}
      <div className="va-section">
        <h2 className="va-section-title">Profile Overview</h2>
        <div className="va-profile-grid">
          <div className="va-profile-card">
            <div className="va-profile-card-icon" style={{ background: '#eef2ff', color: '#6366F1' }}>
              <Eye size={18} />
            </div>
            <div>
              <div className="va-profile-card-value">{profile.profileViews}</div>
              <div className="va-profile-card-label">Profile Views</div>
            </div>
          </div>
          <div className="va-profile-card">
            <div className="va-profile-card-icon" style={{ background: '#fff7ed', color: '#F97316' }}>
              <Star size={18} />
            </div>
            <div>
              <div className="va-profile-card-value">{profile.ratingsAverage.toFixed(1)}</div>
              <div className="va-profile-card-label">Avg Rating ({profile.ratingsCount} reviews)</div>
            </div>
          </div>
          <div className="va-profile-card">
            <div className="va-profile-card-icon" style={{ background: '#fdf2f5', color: '#D7385E' }}>
              <Users size={18} />
            </div>
            <div>
              <div className="va-profile-card-value">{profile.totalBookingsAllTime}</div>
              <div className="va-profile-card-label">All-Time Bookings</div>
            </div>
          </div>
          <div className="va-profile-card">
            <div className="va-profile-card-icon" style={{ background: '#ecfdf5', color: '#10B981' }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="va-profile-card-value">
                {profile.profileViews > 0
                  ? ((profile.totalBookingsAllTime / profile.profileViews) * 100).toFixed(1)
                  : '0'}%
              </div>
              <div className="va-profile-card-label">View → Booking Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
