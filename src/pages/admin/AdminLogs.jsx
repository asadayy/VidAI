import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminLogs.css';

const RESOURCE_TYPES = [
  '', 'User', 'Vendor', 'Booking', 'Review', 'Budget', 'Invitation', 'Payment', 'System',
];

const ACTION_LABELS = {
  verify_vendor: { label: 'Verify Vendor', color: '#22c55e' },
  reject_vendor: { label: 'Reject Vendor', color: '#ef4444' },
  activate_user: { label: 'Activate User', color: '#22c55e' },
  deactivate_user: { label: 'Deactivate User', color: '#ef4444' },
  create_booking: { label: 'Create Booking', color: '#3b82f6' },
  update_booking: { label: 'Update Booking', color: '#f59e0b' },
  cancel_booking: { label: 'Cancel Booking', color: '#ef4444' },
  login: { label: 'Login', color: '#8b5cf6' },
  register: { label: 'Register', color: '#3b82f6' },
};

function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (resourceFilter) params.resourceType = resourceFilter;
      if (actionFilter) params.action = actionFilter;

      const res = await adminAPI.getActivityLogs(params);
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [page, resourceFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [resourceFilter, actionFilter]);

  const getActionInfo = (action) => {
    return ACTION_LABELS[action] || { label: action?.replace(/_/g, ' '), color: '#6b7280' };
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="admin-logs">
      <div className="page-header">
        <h1>Activity Logs</h1>
        <span className="admin-total-badge">{pagination.total} log{pagination.total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="admin-log-filters">
        <div className="admin-filter-group">
          <Filter size={15} />
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          >
            <option value="">All Resources</option>
            {RESOURCE_TYPES.filter(Boolean).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="admin-filter-group">
          <input
            type="text"
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="admin-action-input"
          />
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <Loading size="md" />
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <h3>No activity logs</h3>
          <p>Activity will appear here as actions are performed.</p>
        </div>
      ) : (
        <>
          <div className="admin-log-list">
            {logs.map((log) => {
              const actionInfo = getActionInfo(log.action);
              return (
                <div className="admin-log-item" key={log._id}>
                  <div
                    className="admin-log-dot"
                    style={{ backgroundColor: actionInfo.color }}
                  />
                  <div className="admin-log-content">
                    <div className="admin-log-top">
                      <span
                        className="admin-log-action"
                        style={{ color: actionInfo.color }}
                      >
                        {actionInfo.label}
                      </span>
                      <span className="admin-log-resource badge badge-neutral">
                        {log.resourceType || 'System'}
                      </span>
                    </div>
                    {log.details && (
                      <p className="admin-log-details">{log.details}</p>
                    )}
                    <div className="admin-log-meta">
                      <span className="admin-log-user">
                        {log.user?.name || 'System'} ({log.user?.role || '—'})
                      </span>
                      <span className="admin-log-time">
                        <Clock size={12} />
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="admin-page-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminLogs;
