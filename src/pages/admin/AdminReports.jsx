import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Eye,
  Flag,
  User,
  Store,
  MessageSquare,
  Image,
  Shield,
  ShieldAlert,
  CheckSquare,
  Square,
} from 'lucide-react';
import './AdminReports.css';

const STATUS_OPTIONS = ['pending', 'in_review', 'resolved', 'rejected'];
const ACTION_OPTIONS = [
  { value: 'none', label: 'No direct action' },
  { value: 'warn_vendor', label: 'Warn vendor' },
  { value: 'warn_user', label: 'Warn user' },
  { value: 'deactivate_vendor', label: 'Deactivate vendor' },
  { value: 'deactivate_user', label: 'Deactivate user' },
  { value: 'hide_review', label: 'Hide review' },
  { value: 'remove_portfolio_item', label: 'Remove portfolio item' },
];

const TARGET_META = {
  vendor: { icon: Store, label: 'Vendor' },
  portfolio_item: { icon: Image, label: 'Portfolio Item' },
  customer: { icon: User, label: 'Customer' },
  review: { icon: MessageSquare, label: 'Review' },
};

const formatReasonCategory = (category) => {
  if (!category) return 'General';
  return category.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const formatStatusLabel = (status) => {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedReportIds, setSelectedReportIds] = useState([]);

  const [filters, setFilters] = useState({
    status: '',
    targetType: '',
    reporterRole: '',
    page: 1,
  });

  const [moderation, setModeration] = useState({
    status: 'pending',
    adminActionType: 'none',
    adminNotes: '',
  });

  const [bulkModeration, setBulkModeration] = useState({
    status: 'in_review',
    adminActionType: 'none',
    adminNotes: '',
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: 20,
      };
      if (filters.status) params.status = filters.status;
      if (filters.targetType) params.targetType = filters.targetType;
      if (filters.reporterRole) params.reporterRole = filters.reporterRole;

      const { data } = await adminAPI.getReports(params);
      setReports(data.data.reports || []);
      setPagination(data.data.pagination || { page: 1, pages: 1, total: 0 });
      setSelectedReportIds([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchReportDetail = useCallback(async (reportId) => {
    try {
      const { data } = await adminAPI.getReportById(reportId);
      const report = data.data.report;
      setSelectedReport(report);
      setModeration({
        status: report.status || 'pending',
        adminActionType: report.adminActionType || 'none',
        adminNotes: report.adminNotes || '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load report details');
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSelectReport = (reportId) => {
    fetchReportDetail(reportId);
  };

  const toggleReportSelection = (reportId) => {
    setSelectedReportIds((prev) => (
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    ));
  };

  const toggleSelectAllOnPage = () => {
    const allIdsOnPage = reports.map((r) => r._id);
    const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every((id) => selectedReportIds.includes(id));

    if (isAllSelected) {
      setSelectedReportIds((prev) => prev.filter((id) => !allIdsOnPage.includes(id)));
    } else {
      setSelectedReportIds((prev) => [...new Set([...prev, ...allIdsOnPage])]);
    }
  };

  const handleUpdateReport = async () => {
    if (!selectedReport?._id) return;

    setUpdating(true);
    try {
      const payload = {
        status: moderation.status,
        adminActionType: moderation.adminActionType,
        adminNotes: moderation.adminNotes,
      };
      const { data } = await adminAPI.updateReport(selectedReport._id, payload);
      const updated = data.data.report;
      setSelectedReport(updated);
      setReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      toast.success('Report updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update report');
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkUpdateReports = async () => {
    if (selectedReportIds.length === 0) {
      toast.error('Select at least one report for bulk update');
      return;
    }

    setUpdating(true);
    try {
      await adminAPI.updateReportsBulk({
        reportIds: selectedReportIds,
        status: bulkModeration.status,
        adminActionType: bulkModeration.adminActionType,
        adminNotes: bulkModeration.adminNotes,
      });

      toast.success(`Updated ${selectedReportIds.length} report(s)`);
      setSelectedReportIds([]);
      await fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk update reports');
    } finally {
      setUpdating(false);
    }
  };

  const selectedTargetMeta = useMemo(() => {
    const type = selectedReport?.targetType;
    return TARGET_META[type] || { icon: AlertTriangle, label: type || 'Unknown' };
  }, [selectedReport]);
  const SelectedTargetIcon = selectedTargetMeta.icon;
  const allIdsOnPage = reports.map((r) => r._id);
  const allSelectedOnPage = allIdsOnPage.length > 0 && allIdsOnPage.every((id) => selectedReportIds.includes(id));

  return (
    <div className="ar-page">
      <div className="ar-header">
        <div className="ar-header-left">
          <div className="ar-header-icon"><ShieldAlert size={18} /></div>
          <div>
            <h1 className="ar-title">System Reports</h1>
            <p className="ar-subtitle">Review user and vendor abuse reports, then apply moderation actions.</p>
          </div>
        </div>
        <span className="ar-total-badge">{pagination.total} total</span>
      </div>

      <div className="ar-controls-card">
        <div className="ar-filter-row">
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
          </select>

          <select value={filters.targetType} onChange={(e) => handleFilterChange('targetType', e.target.value)}>
            <option value="">All target types</option>
            <option value="vendor">Vendor</option>
            <option value="portfolio_item">Portfolio item</option>
            <option value="customer">Customer</option>
            <option value="review">Review</option>
          </select>

          <select value={filters.reporterRole} onChange={(e) => handleFilterChange('reporterRole', e.target.value)}>
            <option value="">All reporter roles</option>
            <option value="user">User</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>

        <div className="ar-bulk-panel">
          <div className="ar-bulk-head">
            <button type="button" className="ar-select-all-btn" onClick={toggleSelectAllOnPage}>
              {allSelectedOnPage ? <CheckSquare size={15} /> : <Square size={15} />} Select all on page
            </button>
            <span>{selectedReportIds.length} selected</span>
          </div>

          <div className="ar-bulk-controls">
            <select
              value={bulkModeration.status}
              onChange={(e) => setBulkModeration((prev) => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
            </select>

            <select
              value={bulkModeration.adminActionType}
              onChange={(e) => setBulkModeration((prev) => ({ ...prev, adminActionType: e.target.value }))}
            >
              {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>

            <input
              type="text"
              value={bulkModeration.adminNotes}
              onChange={(e) => setBulkModeration((prev) => ({ ...prev, adminNotes: e.target.value }))}
              placeholder="Bulk admin notes"
            />

            <button type="button" onClick={handleBulkUpdateReports} disabled={updating || selectedReportIds.length === 0}>
              {updating ? 'Updating...' : 'Apply Bulk Update'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading message="Loading reports..." />
      ) : (
        <div className="ar-content-grid">
          <section className="ar-list-panel">
            {reports.length === 0 ? (
              <div className="ar-empty">
                <Flag size={26} />
                <p>No reports found for the selected filters.</p>
              </div>
            ) : (
              <div className="ar-report-list">
                {reports.map((report) => {
                  const meta = TARGET_META[report.targetType] || TARGET_META.vendor;
                  const TargetIcon = meta.icon;
                  return (
                    <div
                      key={report._id}
                      className={`ar-report-row ${selectedReport?._id === report._id ? 'active' : ''}`}
                    >
                      <div className="ar-row-select">
                        <input
                          type="checkbox"
                          checked={selectedReportIds.includes(report._id)}
                          onChange={() => toggleReportSelection(report._id)}
                        />
                      </div>
                      <button
                        type="button"
                        className="ar-report-main-btn"
                        onClick={() => handleSelectReport(report._id)}
                      >
                      <div className="ar-report-row-left">
                        <span className="ar-target-pill">
                          <TargetIcon size={13} /> {meta.label}
                        </span>
                        <span className={`ar-status ar-status-${report.status}`}>{formatStatusLabel(report.status)}</span>
                      </div>
                      <p className="ar-report-reason">{report.reason}</p>
                      <div className="ar-report-meta">
                        <span><User size={12} /> {report.reporter?.name || 'Unknown'}</span>
                        <span><CalendarDays size={12} /> {new Date(report.createdAt).toLocaleDateString()}</span>
                        <span>{formatReasonCategory(report.reasonCategory)}</span>
                      </div>
                      <ChevronRight size={14} className="ar-row-arrow" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="ar-pagination">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  Prev
                </button>
                <span>{pagination.page} / {pagination.pages}</span>
                <button
                  type="button"
                  disabled={filters.page >= pagination.pages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </button>
              </div>
            )}
          </section>

          <aside className="ar-detail-panel">
            {!selectedReport ? (
              <div className="ar-detail-empty">
                <Eye size={26} />
                <p>Select a report to view details and moderation options.</p>
              </div>
            ) : (
              <>
                <div className="ar-detail-head">
                  <h2>Report Detail</h2>
                  <span className={`ar-status ar-status-${selectedReport.status}`}>{formatStatusLabel(selectedReport.status)}</span>
                </div>

                <div className="ar-detail-block">
                  <span className="label">Reporter</span>
                  <p>{selectedReport.reporter?.name} ({selectedReport.reporter?.email})</p>
                </div>

                <div className="ar-detail-block">
                  <span className="label">Target</span>
                  <p>
                    <SelectedTargetIcon size={13} /> {selectedTargetMeta.label}
                  </p>
                  {selectedReport.targetVendor?.businessName && (
                    <p>Vendor: {selectedReport.targetVendor.businessName}</p>
                  )}
                  {selectedReport.targetUser?.email && (
                    <p>User: {selectedReport.targetUser.email}</p>
                  )}
                </div>

                <div className="ar-detail-block">
                  <span className="label">Reason</span>
                  <p><strong>Category:</strong> {formatReasonCategory(selectedReport.reasonCategory)}</p>
                  <p>{selectedReport.reason}</p>
                </div>

                {selectedReport.description && (
                  <div className="ar-detail-block">
                    <span className="label">Description</span>
                    <p>{selectedReport.description}</p>
                  </div>
                )}

                {selectedReport.targetReview && (
                  <div className="ar-detail-block">
                    <span className="label">Reported Review</span>
                    <p>
                      Rating: {selectedReport.targetReview.rating} / 5
                      {selectedReport.targetReview.title ? ` - ${selectedReport.targetReview.title}` : ''}
                    </p>
                    {selectedReport.targetReview.comment && (
                      <p className="ar-review-snippet">{selectedReport.targetReview.comment}</p>
                    )}
                  </div>
                )}

                <div className="ar-moderation-block">
                  <h3><Shield size={15} /> Moderation Action</h3>

                  <label>Status</label>
                  <select
                    value={moderation.status}
                    onChange={(e) => setModeration((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
                  </select>

                  <label>Admin Action</label>
                  <select
                    value={moderation.adminActionType}
                    onChange={(e) => setModeration((prev) => ({ ...prev, adminActionType: e.target.value }))}
                  >
                    {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>

                  <label>Admin Notes</label>
                  <textarea
                    rows={4}
                    value={moderation.adminNotes}
                    onChange={(e) => setModeration((prev) => ({ ...prev, adminNotes: e.target.value }))}
                    placeholder="Add internal notes for this moderation decision"
                  />

                  <button type="button" onClick={handleUpdateReport} disabled={updating}>
                    {updating ? 'Updating...' : 'Save Moderation Update'}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminReports;
