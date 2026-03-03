import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  ShieldCheck,
  ShieldX,
  ChevronLeft,
  ChevronRight,
  Eye,
  Store,
  X,
  MapPin,
  Phone,
  Mail,
  Star,
  CalendarDays,
  Package,
  BarChart2,
  Filter,
  AlertTriangle,
  CheckCircle2,
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
    <div className="av-page">
      {/* ── Header ── */}
      <div className="av-header">
        <div className="av-header-left">
          <div className="av-header-icon"><Store size={18} /></div>
          <div>
            <h1 className="av-title">Vendor Management</h1>
            <p className="av-subtitle">Review, approve and manage vendor accounts</p>
          </div>
        </div>
        <div className="av-header-badges">
          <span className="av-count-badge">
            {pagination.total} vendor{pagination.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="av-filters">
        <div className="av-tabs">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`av-tab ${statusFilter === key ? 'av-tab-active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="av-filter-right">
          <Filter size={14} className="av-filter-icon" />
          <select
            className="av-cat-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <Loading size="md" />
      ) : vendors.length === 0 ? (
        <div className="av-empty">
          <Store size={40} strokeWidth={1.2} />
          <h3>No vendors found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="av-table-wrap">
            <table className="av-table">
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
                {vendors.map((v) => {
                  const completeness = v.profileCompleteness ?? 0;
                  return (
                    <tr key={v._id}>
                      <td>
                        <div className="av-biz-cell">
                          {v.coverImage?.url ? (
                            <img src={v.coverImage.url} alt="" className="av-thumb" />
                          ) : (
                            <div className="av-thumb-placeholder" style={{ background: stringToColor(v.businessName) }}>
                              {v.businessName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="av-biz-name">{v.businessName}</span>
                            <span className="av-biz-date">
                              Joined {new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td><span className="av-category">{v.category?.replace(/_/g, ' ') || '—'}</span></td>
                      <td className="av-city">{v.city || '—'}</td>
                      <td>
                        <div className="av-owner">
                          <span className="av-owner-name">{v.user?.name || 'N/A'}</span>
                          <span className="av-owner-email">{v.user?.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`av-status-badge av-status-${v.verificationStatus}`}>
                          {v.verificationStatus === 'approved' && <CheckCircle2 size={11} />}
                          {v.verificationStatus === 'pending' && <AlertTriangle size={11} />}
                          {v.verificationStatus === 'rejected' && <X size={11} />}
                          {v.verificationStatus}
                        </span>
                      </td>
                      <td>
                        <div className="av-progress-wrap">
                          <div className="av-progress-bar">
                            <div
                              className="av-progress-fill"
                              style={{
                                width: `${completeness}%`,
                                background: completeness >= 80 ? '#22c55e' : completeness >= 50 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="av-progress-pct">{completeness}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="av-actions">
                          <button type="button" className="av-action-btn av-action-view" title="View details" onClick={() => setDetailVendor(v)}>
                            <Eye size={14} />
                          </button>
                          {v.verificationStatus !== 'approved' && (
                            <button type="button" className="av-action-btn av-action-approve" title="Approve" onClick={() => setActionModal({ type: 'approve', vendor: v })}>
                              <ShieldCheck size={14} />
                            </button>
                          )}
                          {v.verificationStatus !== 'rejected' && (
                            <button type="button" className="av-action-btn av-action-reject" title="Reject" onClick={() => setActionModal({ type: 'reject', vendor: v })}>
                              <ShieldX size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="av-pagination">
              <button
                type="button"
                className="av-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <div className="av-page-numbers">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pagination.pages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '...' ? (
                      <span key={`ellipsis-${i}`} className="av-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={`av-page-num ${page === n ? 'active' : ''}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
              </div>
              <button
                type="button"
                className="av-page-btn"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Approve / Reject Modal ── */}
      {actionModal && (
        <div className="av-overlay" onClick={() => !actionLoading && setActionModal(null)}>
          <div className="av-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`av-modal-header ${actionModal.type === 'approve' ? 'av-modal-header-approve' : 'av-modal-header-reject'}`}>
              <div className="av-modal-header-icon">
                {actionModal.type === 'approve' ? <ShieldCheck size={20} /> : <ShieldX size={20} />}
              </div>
              <div>
                <h3 className="av-modal-title">
                  {actionModal.type === 'approve' ? 'Approve Vendor' : 'Reject Vendor'}
                </h3>
                <p className="av-modal-vendor">{actionModal.vendor.businessName}</p>
              </div>
              <button className="av-modal-close" onClick={() => { setActionModal(null); setRejectReason(''); }} disabled={actionLoading}>
                <X size={18} />
              </button>
            </div>

            <div className="av-modal-body">
              {actionModal.type === 'approve' ? (
                <p className="av-modal-desc">
                  This vendor will become publicly visible and eligible to receive customer bookings.
                </p>
              ) : (
                <div>
                  <label className="av-modal-label">Reason for Rejection</label>
                  <textarea
                    className="av-modal-textarea"
                    rows={3}
                    placeholder="Provide a clear reason for the vendor..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="av-modal-footer">
              <button
                type="button"
                className="av-btn-cancel"
                onClick={() => { setActionModal(null); setRejectReason(''); }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={actionModal.type === 'approve' ? 'av-btn-approve' : 'av-btn-reject'}
                onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing…' : actionModal.type === 'approve' ? 'Approve Vendor' : 'Reject Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailVendor && (
        <div className="av-overlay" onClick={() => setDetailVendor(null)}>
          <div className="av-modal av-modal-lg" onClick={(e) => e.stopPropagation()}>

            {/* ── Hero header ── */}
            <div className="av-dh-hero">
              {detailVendor.coverImage?.url ? (
                <img src={detailVendor.coverImage.url} alt="cover" className="av-dh-cover-img" />
              ) : (
                <div className="av-dh-cover-gradient" style={{ '--av-hue': stringToColor(detailVendor.businessName) }} />
              )}
              <div className="av-dh-hero-overlay" />
              <button className="av-dh-close" onClick={() => setDetailVendor(null)}><X size={16} /></button>
              <div className="av-dh-hero-content">
                <div className="av-dh-avatar" style={{ background: stringToColor(detailVendor.businessName) }}>
                  {detailVendor.coverImage?.url
                    ? <img src={detailVendor.coverImage.url} alt="" />
                    : detailVendor.businessName?.charAt(0).toUpperCase()}
                </div>
                <div className="av-dh-hero-text">
                  <div className="av-dh-hero-row">
                    <h3 className="av-dh-title">{detailVendor.businessName}</h3>
                    <span className={`av-status-badge av-status-${detailVendor.verificationStatus}`}>
                      {detailVendor.verificationStatus === 'approved' && <CheckCircle2 size={11} />}
                      {detailVendor.verificationStatus === 'pending' && <AlertTriangle size={11} />}
                      {detailVendor.verificationStatus === 'rejected' && <X size={11} />}
                      {detailVendor.verificationStatus}
                    </span>
                  </div>
                  <p className="av-dh-category">{detailVendor.category?.replace(/_/g, ' ')}</p>
                  <div className="av-dh-meta">
                    {detailVendor.city    && <span><MapPin  size={11} /> {detailVendor.city}</span>}
                    {detailVendor.phone   && <span><Phone   size={11} /> {detailVendor.phone}</span>}
                    {detailVendor.email   && <span><Mail    size={11} /> {detailVendor.email}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats strip ── */}
            <div className="av-dh-stats">
              <div className="av-dh-stat av-dh-stat--star">
                <Star size={15} />
                <div><strong>{detailVendor.ratingsAverage ?? 0}</strong><span>{detailVendor.ratingsCount ?? 0} reviews</span></div>
              </div>
              <div className="av-dh-stat av-dh-stat--cal">
                <CalendarDays size={15} />
                <div><strong>{detailVendor.totalBookings ?? 0}</strong><span>bookings</span></div>
              </div>
              <div className="av-dh-stat av-dh-stat--pkg">
                <Package size={15} />
                <div><strong>{detailVendor.packages?.length ?? 0}</strong><span>packages</span></div>
              </div>
              <div className="av-dh-stat av-dh-stat--bar">
                <BarChart2 size={15} />
                <div><strong>{detailVendor.profileCompleteness ?? 0}%</strong><span>complete</span></div>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="av-dh-body">

              {/* Info grid */}
              <div className="av-dh-section">
                <p className="av-dh-section-title">Business Info</p>
                <div className="av-dh-grid">
                  {[
                    ['Address',       detailVendor.address],
                    ['WhatsApp',      detailVendor.whatsapp],
                    ['Website',       detailVendor.website],
                    ['Starting Price',detailVendor.startingPrice ? `Rs ${detailVendor.startingPrice.toLocaleString()}` : null],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="av-dh-info-item">
                      <span className="av-dh-info-label">{label}</span>
                      <span className="av-dh-info-val">{val}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Description */}
              {detailVendor.description && (
                <div className="av-dh-section">
                  <p className="av-dh-section-title">Description</p>
                  <p className="av-dh-desc">{detailVendor.description}</p>
                </div>
              )}

              {/* Portfolio images */}
              {detailVendor.portfolio?.length > 0 && (
                <div className="av-dh-section">
                  <p className="av-dh-section-title">Portfolio <span className="av-dh-section-count">{detailVendor.portfolio.length} photos</span></p>
                  <div className="av-dh-portfolio">
                    {detailVendor.portfolio.map((item, i) => (
                      item.resourceType === 'video' ? (
                        <div key={i} className="av-dh-portfolio-item av-dh-portfolio-video">
                          <video src={item.url} muted preload="metadata" />
                          <span className="av-dh-video-badge">▶</span>
                        </div>
                      ) : (
                        <a key={i} href={item.url} target="_blank" rel="noreferrer" className="av-dh-portfolio-item">
                          <img src={item.url} alt={item.caption || `photo ${i + 1}`} loading="lazy" />
                          {item.caption && <span className="av-dh-portfolio-caption">{item.caption}</span>}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection reason */}
              {detailVendor.rejectionReason && (
                <div className="av-rejection-alert">
                  <AlertTriangle size={14} />
                  <span><strong>Rejection reason:</strong> {detailVendor.rejectionReason}</span>
                </div>
              )}

              {/* Account owner */}
              {detailVendor.user && (
                <div className="av-dh-section">
                  <p className="av-dh-section-title">Account Owner</p>
                  <div className="av-dh-owner">
                    <div className="av-owner-avatar" style={{ background: stringToColor(detailVendor.user.name) }}>
                      {(detailVendor.user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="av-dh-owner-info">
                      <span className="av-owner-name">{detailVendor.user.name}</span>
                      <span className="av-owner-email">{detailVendor.user.email}</span>
                      <span className="av-owner-meta">
                        Joined {new Date(detailVendor.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        <span className={detailVendor.user.isActive ? 'av-active' : 'av-inactive'}>
                          {detailVendor.user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>{/* end av-dh-body */}

            <div className="av-modal-footer">
              <button type="button" className="av-btn-cancel" onClick={() => setDetailVendor(null)}>Close</button>
              {detailVendor.verificationStatus !== 'approved' && (
                <button type="button" className="av-btn-approve"
                  onClick={() => { setDetailVendor(null); setActionModal({ type: 'approve', vendor: detailVendor }); }}>
                  <ShieldCheck size={15} /> Approve
                </button>
              )}
              {detailVendor.verificationStatus !== 'rejected' && (
                <button type="button" className="av-btn-reject"
                  onClick={() => { setDetailVendor(null); setActionModal({ type: 'reject', vendor: detailVendor }); }}>
                  <ShieldX size={15} /> Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function stringToColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360},50%,42%)`;
}

export default AdminVendors;
