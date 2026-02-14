import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  ShieldCheck,
  ShieldX,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminVendors.css';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const CATEGORIES = [
  '', 'venue', 'photographer', 'videographer', 'caterer', 'decorator',
  'makeup_artist', 'mehndi_artist', 'dj_music', 'wedding_planner',
  'invitation_cards', 'bridal_wear', 'groom_wear', 'jewelry',
  'transport', 'florist', 'cake', 'other',
];

function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal state
  const [actionModal, setActionModal] = useState(null); // { type: 'approve'|'reject', vendor }
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Detail modal
  const [detailVendor, setDetailVendor] = useState(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await adminAPI.getVendors(params);
      setVendors(res.data.data.vendors);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter]);

  const handleApprove = async () => {
    if (!actionModal?.vendor) return;
    setActionLoading(true);
    try {
      await adminAPI.verifyVendor(actionModal.vendor._id);
      toast.success(`${actionModal.vendor.businessName} approved!`);
      setActionModal(null);
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal?.vendor) return;
    setActionLoading(true);
    try {
      await adminAPI.rejectVendor(actionModal.vendor._id, { reason: rejectReason });
      toast.success(`${actionModal.vendor.businessName} rejected.`);
      setActionModal(null);
      setRejectReason('');
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject vendor');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-vendors">
      <div className="page-header">
        <h1>Vendor Management</h1>
        <span className="admin-total-badge">{pagination.total} vendor{pagination.total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="admin-vendor-filters">
        <div className="admin-status-tabs">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`admin-tab ${statusFilter === key ? 'admin-tab-active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="admin-cat-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <Loading size="md" />
      ) : vendors.length === 0 ? (
        <div className="empty-state">
          <h3>No vendors found</h3>
          <p>Try changing your filters.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Category</th>
                  <th>City</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Profile</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v._id}>
                    <td className="admin-vendor-name">
                      {v.coverImage?.url ? (
                        <img src={v.coverImage.url} alt="" className="admin-vendor-thumb" />
                      ) : (
                        <div className="admin-vendor-thumb-placeholder">
                          {v.businessName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="admin-vendor-biz">{v.businessName}</span>
                        <span className="admin-vendor-created">
                          Joined {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="admin-category-cell">{v.category?.replace(/_/g, ' ')}</td>
                    <td>{v.city || '—'}</td>
                    <td>
                      <span className="admin-owner-info">
                        {v.user?.name || 'N/A'}
                        <span className="admin-owner-email">{v.user?.email}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${verificationBadge(v.verificationStatus)}`}>
                        {v.verificationStatus}
                      </span>
                    </td>
                    <td>{v.profileCompleteness ?? 0}%</td>
                    <td>
                      <div className="admin-vendor-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="View details"
                          onClick={() => setDetailVendor(v)}
                        >
                          <Eye size={15} />
                        </button>
                        {v.verificationStatus !== 'approved' && (
                          <button
                            type="button"
                            className="btn btn-sm admin-btn-approve"
                            title="Approve"
                            onClick={() => setActionModal({ type: 'approve', vendor: v })}
                          >
                            <ShieldCheck size={15} />
                          </button>
                        )}
                        {v.verificationStatus !== 'rejected' && (
                          <button
                            type="button"
                            className="btn btn-sm admin-btn-reject"
                            title="Reject"
                            onClick={() => setActionModal({ type: 'reject', vendor: v })}
                          >
                            <ShieldX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Approve/Reject Modal */}
      {actionModal && (
        <div className="admin-modal-overlay" onClick={() => !actionLoading && setActionModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {actionModal.type === 'approve' ? 'Approve' : 'Reject'} Vendor
            </h3>
            <p className="admin-modal-vendor-name">{actionModal.vendor.businessName}</p>

            {actionModal.type === 'approve' ? (
              <p className="admin-modal-desc">
                This vendor will become visible to customers and can receive bookings.
              </p>
            ) : (
              <div className="form-group">
                <label>Rejection Reason</label>
                <textarea
                  rows={3}
                  placeholder="Provide a reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            )}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setActionModal(null); setRejectReason(''); }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${actionModal.type === 'approve' ? 'admin-btn-approve' : 'btn-danger'}`}
                onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : actionModal.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailVendor && (
        <div className="admin-modal-overlay" onClick={() => setDetailVendor(null)}>
          <div className="admin-modal admin-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="admin-detail-header">
              <h3>{detailVendor.businessName}</h3>
              <span className={`badge badge-${verificationBadge(detailVendor.verificationStatus)}`}>
                {detailVendor.verificationStatus}
              </span>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <span className="admin-detail-label">Category</span>
                <span>{detailVendor.category?.replace(/_/g, ' ')}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">City</span>
                <span>{detailVendor.city || '—'}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Address</span>
                <span>{detailVendor.address || '—'}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Phone</span>
                <span>{detailVendor.phone || '—'}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">WhatsApp</span>
                <span>{detailVendor.whatsapp || '—'}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Email</span>
                <span>{detailVendor.email || '—'}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Website</span>
                <span>{detailVendor.website || '—'}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Profile Complete</span>
                <span>{detailVendor.profileCompleteness ?? 0}%</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Rating</span>
                <span>{detailVendor.ratingsAverage ?? 0} ({detailVendor.ratingsCount ?? 0} reviews)</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Total Bookings</span>
                <span>{detailVendor.totalBookings ?? 0}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Starting Price</span>
                <span>{detailVendor.startingPrice ? `Rs ${detailVendor.startingPrice.toLocaleString()}` : '—'}</span>
              </div>
              <div className="admin-detail-item">
                <span className="admin-detail-label">Packages</span>
                <span>{detailVendor.packages?.length ?? 0}</span>
              </div>
            </div>

            {detailVendor.description && (
              <div className="admin-detail-desc">
                <span className="admin-detail-label">Description</span>
                <p>{detailVendor.description}</p>
              </div>
            )}

            {detailVendor.rejectionReason && (
              <div className="alert alert-danger">
                <strong>Rejection Reason:</strong> {detailVendor.rejectionReason}
              </div>
            )}

            {/* Owner info */}
            {detailVendor.user && (
              <div className="admin-detail-owner">
                <span className="admin-detail-label">Account Owner</span>
                <p>{detailVendor.user.name} — {detailVendor.user.email}</p>
                <p className="admin-owner-joined">
                  Joined {new Date(detailVendor.user.createdAt).toLocaleDateString()}
                  {' '} | Account {detailVendor.user.isActive ? 'Active' : 'Disabled'}
                </p>
              </div>
            )}

            <div className="admin-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setDetailVendor(null)}>
                Close
              </button>
              {detailVendor.verificationStatus !== 'approved' && (
                <button
                  type="button"
                  className="btn admin-btn-approve"
                  onClick={() => { setDetailVendor(null); setActionModal({ type: 'approve', vendor: detailVendor }); }}
                >
                  <ShieldCheck size={16} /> Approve
                </button>
              )}
              {detailVendor.verificationStatus !== 'rejected' && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => { setDetailVendor(null); setActionModal({ type: 'reject', vendor: detailVendor }); }}
                >
                  <ShieldX size={16} /> Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function verificationBadge(status) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' };
  return map[status] || 'neutral';
}

export default AdminVendors;
