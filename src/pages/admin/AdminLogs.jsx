import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  ChevronLeft,
  ChevronRight,
  ScrollText,
  UserPlus,
  LogIn,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  CalendarDays,
  ShieldCheck,
  ShieldX,
  Image,
  Star,
  UserCheck,
  UserX,
  Wallet,
  Mail,
  CreditCard,
  Settings,
  Activity,
  Flag,
  XCircle,
  Filter,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminLogs.css';

// ── Action configuration ──────────────────────────────────────────────
const ACTION_CONFIG = {
  // Auth
  register:              { label: 'User Registered',        icon: UserPlus,      color: '#3b82f6', group: 'Auth' },
  login:                 { label: 'User Login',             icon: LogIn,         color: '#8b5cf6', group: 'Auth' },

  // Bookings
  create_booking:        { label: 'Booking Created',        icon: CalendarCheck, color: '#06b6d4', group: 'Bookings' },
  accept_booking:        { label: 'Booking Accepted',       icon: CalendarCheck, color: '#22c55e', group: 'Bookings' },
  approve_booking:       { label: 'Booking Approved',       icon: CalendarCheck, color: '#22c55e', group: 'Bookings' },
  reject_booking:        { label: 'Booking Rejected',       icon: CalendarX,     color: '#ef4444', group: 'Bookings' },
  cancel_booking:        { label: 'Booking Cancelled',      icon: CalendarX,     color: '#f97316', group: 'Bookings' },
  update_booking:        { label: 'Booking Updated',        icon: CalendarClock, color: '#f59e0b', group: 'Bookings' },
  complete_booking:      { label: 'Booking Completed',      icon: CalendarDays,  color: '#10b981', group: 'Bookings' },

  // Vendors
  verify_vendor:         { label: 'Vendor Approved',        icon: ShieldCheck,   color: '#22c55e', group: 'Vendors' },
  reject_vendor:         { label: 'Vendor Rejected',        icon: ShieldX,       color: '#ef4444', group: 'Vendors' },
  add_portfolio_image:   { label: 'Portfolio Image Added',  icon: Image,         color: '#ec4899', group: 'Vendors' },
  upload_portfolio:      { label: 'Portfolio Uploaded',     icon: Image,         color: '#ec4899', group: 'Vendors' },
  update_vendor_profile: { label: 'Vendor Profile Updated', icon: Settings,      color: '#64748b', group: 'Vendors' },

  // Users
  activate_user:         { label: 'User Activated',         icon: UserCheck,     color: '#22c55e', group: 'Users' },
  deactivate_user:       { label: 'User Deactivated',       icon: UserX,         color: '#ef4444', group: 'Users' },

  // Reviews
  leave_review:          { label: 'Review Left',            icon: Star,          color: '#f59e0b', group: 'Reviews' },
  create_review:         { label: 'Review Posted',          icon: Star,          color: '#f59e0b', group: 'Reviews' },
  delete_review:         { label: 'Review Deleted',         icon: Star,          color: '#94a3b8', group: 'Reviews' },

  // Budget
  create_budget:         { label: 'Budget Created',         icon: Wallet,        color: '#10b981', group: 'Budget' },
  update_budget:         { label: 'Budget Updated',         icon: Wallet,        color: '#34d399', group: 'Budget' },

  // Invitations
  create_invitation:     { label: 'Invitation Created',     icon: Mail,          color: '#a78bfa', group: 'Invitations' },
  send_invitation:       { label: 'Invitation Sent',        icon: Mail,          color: '#8b5cf6', group: 'Invitations' },

  // Payments
  create_payment:        { label: 'Payment Made',           icon: CreditCard,    color: '#f59e0b', group: 'Payments' },
  refund_payment:        { label: 'Payment Refunded',       icon: CreditCard,    color: '#94a3b8', group: 'Payments' },

  // System
  create_report:         { label: 'Report Submitted',       icon: Flag,          color: '#be123c', group: 'Reports' },
  admin_update_report:   { label: 'Report Moderated',       icon: ShieldCheck,   color: '#0f766e', group: 'Reports' },
  system:                { label: 'System Event',           icon: Settings,      color: '#6b7280', group: 'System' },
};

const GROUPS = ['Auth', 'Bookings', 'Vendors', 'Users', 'Reviews', 'Reports', 'Budget', 'Invitations', 'Payments', 'System'];

const RESOURCE_TYPES = [
  '', 'User', 'Vendor', 'Booking', 'Review', 'Report', 'Budget', 'Invitation', 'Payment', 'System',
];

// ── Component ─────────────────────────────────────────────────────────
function AdminLogs() {
  const [logs, setLogs]             = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [actionFilter, setActionFilter]     = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const isFirstRender = useRef(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (actionFilter)   params.action       = actionFilter;
      if (resourceFilter) params.resourceType = resourceFilter;
      if (dateFrom)       params.dateFrom     = dateFrom;
      if (dateTo)         params.dateTo       = dateTo;

      const res = await adminAPI.getActivityLogs(params);
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, resourceFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPage(1);
  }, [actionFilter, resourceFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setActionFilter('');
    setResourceFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = actionFilter || resourceFilter || dateFrom || dateTo;

  const getActionInfo = (action) =>
    ACTION_CONFIG[action] || { label: action?.replace(/_/g, ' ') || 'Unknown', icon: Activity, color: '#6b7280', group: 'System' };

  const formatTime = (dateStr) => {
    const d   = new Date(dateStr);
    const now = new Date();
    const diffMs  = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr  = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1)  return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr  < 24) return `${diffHr}h ago`;
    if (diffDay <  7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFullTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Group actions by GROUPS for optgroup select
  const groupedActions = GROUPS.map((group) => ({
    group,
    actions: Object.entries(ACTION_CONFIG).filter(([, v]) => v.group === group),
  })).filter(({ actions }) => actions.length > 0);

  const actionOptions = groupedActions.flatMap(({ group, actions }) => ([
    { value: `__group_${group}`, label: `--- ${group} ---`, disabled: true },
    ...actions.map(([key, { label }]) => ({ value: key, label, disabled: false })),
  ]));

  return (
    <div className="al-page">
      {/* Header */}
      <div className="al-header">
        <div className="al-header-left">
          <div className="al-header-icon"><ScrollText size={18} /></div>
          <div>
            <h1 className="al-title">Activity Logs</h1>
            <p className="al-subtitle">A full audit trail of every action across the platform</p>
          </div>
        </div>
        <span className="al-count-badge">{pagination.total.toLocaleString()} event{pagination.total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="al-filters-card">
        <div className="al-filters-row">
          {/* Action type */}
          <div className="al-filter-field">
            <label className="al-filter-label">Event Type</label>
            <div className="al-select-wrap">
              <Filter size={13} className="al-select-icon" />
              <select
                className="al-select"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">All Events</option>
                {actionOptions.map(({ value, label, disabled }) => (
                  <option key={value} value={value} disabled={disabled}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Resource type */}
          <div className="al-filter-field">
            <label className="al-filter-label">Resource</label>
            <div className="al-select-wrap">
              <Filter size={13} className="al-select-icon" />
              <select
                className="al-select"
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
              >
                <option value="">All Resources</option>
                {RESOURCE_TYPES.filter(Boolean).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date from */}
          <div className="al-filter-field">
            <label className="al-filter-label">From</label>
            <div className="al-date-wrap">
              <Calendar size={13} className="al-select-icon" />
              <input
                type="date"
                className="al-date-input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          {/* Date to */}
          <div className="al-filter-field">
            <label className="al-filter-label">To</label>
            <div className="al-date-wrap">
              <Calendar size={13} className="al-select-icon" />
              <input
                type="date"
                className="al-date-input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button className="al-clear-btn" onClick={clearFilters} type="button">
              <XCircle size={14} /> Clear
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="al-active-pills">
            {actionFilter && (
              <span className="al-pill">
                {getActionInfo(actionFilter).label}
                <button onClick={() => setActionFilter('')}><XCircle size={11} /></button>
              </span>
            )}
            {resourceFilter && (
              <span className="al-pill">
                Resource: {resourceFilter}
                <button onClick={() => setResourceFilter('')}><XCircle size={11} /></button>
              </span>
            )}
            {dateFrom && (
              <span className="al-pill">
                From: {new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                <button onClick={() => setDateFrom('')}><XCircle size={11} /></button>
              </span>
            )}
            {dateTo && (
              <span className="al-pill">
                To: {new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                <button onClick={() => setDateTo('')}><XCircle size={11} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Log list */}
      {loading ? (
        <Loading size="md" />
      ) : logs.length === 0 ? (
        <div className="al-empty">
          <ScrollText size={40} strokeWidth={1.2} />
          <h3>No activity logs found</h3>
          <p>{hasActiveFilters ? 'Try clearing your filters.' : 'Activity will appear here as actions are performed.'}</p>
          {hasActiveFilters && (
            <button className="al-clear-btn-center" onClick={clearFilters}>Clear Filters</button>
          )}
        </div>
      ) : (
        <>
          <div className="al-list">
            {logs.map((log, idx) => {
              const info = getActionInfo(log.action);
              const IconComp = info.icon;
              return (
                <div className="al-item" key={log._id}>
                  {/* Timeline connector */}
                  <div className="al-timeline">
                    <div className="al-icon-wrap" style={{ background: `${info.color}18`, color: info.color }}>
                      <IconComp size={14} />
                    </div>
                    {idx < logs.length - 1 && <div className="al-line" />}
                  </div>

                  {/* Content */}
                  <div className="al-content">
                    <div className="al-content-header">
                      <div className="al-content-left">
                        <span className="al-action-label" style={{ color: info.color }}>
                          {info.label}
                        </span>
                        <span className="al-resource-pill">{log.resourceType || 'System'}</span>
                      </div>
                      <span className="al-time" title={formatFullTime(log.createdAt)}>
                        {formatTime(log.createdAt)}
                      </span>
                    </div>

                    {log.details && (
                      <p className="al-details">{log.details}</p>
                    )}

                    <div className="al-meta">
                      {log.user && (
                        <div className="al-user-chip">
                          <div
                            className="al-user-dot"
                            style={{ background: stringToColor(log.user.name || log.user.email) }}
                          >
                            {(log.user.name || log.user.email || 'S').charAt(0).toUpperCase()}
                          </div>
                          <span>{log.user.name || log.user.email || 'System'}</span>
                          <span className="al-user-role">{log.user.role}</span>
                        </div>
                      )}
                      {!log.user && (
                        <div className="al-user-chip al-system-chip">
                          <Settings size={11} />
                          <span>System</span>
                        </div>
                      )}
                      <span className="al-full-date">{formatFullTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="al-pagination">
              <button
                type="button"
                className="al-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} /> Prev
              </button>

              <div className="al-page-numbers">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pagination.pages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '...' ? (
                      <span key={`e${i}`} className="al-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={`al-page-num ${page === n ? 'active' : ''}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                className="al-page-btn"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function stringToColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360},50%,42%)`;
}

export default AdminLogs;
