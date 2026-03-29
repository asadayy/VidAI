import { useState, useEffect, useCallback, useRef } from 'react';
import { vendorAPI } from '../../api/vendors';
import { uploadAPI } from '../../api/upload';
import { reportAPI } from '../../api';
import Loading from '../../components/Loading';
import ReportModal from '../../components/ReportModal';
import toast from 'react-hot-toast';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Flag,
  Film,
  Camera,
  X,
} from 'lucide-react';
import './VendorPortfolio.css';

function VendorPortfolio() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caption, setCaption] = useState('');

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [activeItemId, setActiveItemId] = useState('');

  const fileInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await vendorAPI.getMyProfile();
      setVendor(data.data.vendor);
    } catch (err) {
      toast.error('Failed to load portfolio items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

    const validFiles = files.filter((file) => {
      if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
        toast.error(`Image ${file.name} exceeds 10MB limit.`);
        return false;
      }
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
        toast.error(`Video ${file.name} exceeds 100MB limit.`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      await uploadAPI.uploadVendorPortfolio(validFiles, caption, (evt) => {
        if (evt.total) {
          setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      });

      toast.success('Portfolio item(s) uploaded successfully!');
      setCaption('');
      await fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload portfolio item.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      await uploadAPI.deleteVendorPortfolioItem(itemId);
      toast.success('Portfolio item deleted.');
      await fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete portfolio item.');
    }
  };

  const openReportModal = (itemId, commentId) => {
    setReportContext({ itemId, commentId });
    setReportModalOpen(true);
  };

  const openItemModal = (itemId) => setActiveItemId(itemId);
  const closeItemModal = () => setActiveItemId('');

  const handleReportSubmit = async ({ reasonCategory, reason, description }) => {
    if (!reportContext?.commentId || !reportContext?.itemId || !vendor?._id) return;

    setReportSubmitting(true);
    try {
      await reportAPI.create({
        targetType: 'portfolio_comment',
        targetVendorId: vendor._id,
        portfolioItemId: reportContext.itemId,
        portfolioCommentId: reportContext.commentId,
        reasonCategory,
        reason,
        description,
      });
      toast.success('Report submitted successfully.');
      setReportModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) return <Loading fullScreen message="Loading portfolio..." />;

  const portfolio = vendor?.portfolio || [];
  const activeItem = portfolio.find((item) => item._id === activeItemId) || null;
  const summary = portfolio.reduce(
    (acc, item) => {
      const likesCount = item.likesCount || item.likes?.length || 0;
      const commentsCount = item.comments?.length || 0;
      acc.totalLikes += likesCount;
      acc.totalComments += commentsCount;
      if (item.resourceType === 'video') acc.totalVideos += 1;
      else acc.totalImages += 1;
      return acc;
    },
    { totalLikes: 0, totalComments: 0, totalImages: 0, totalVideos: 0 }
  );

  const summaryCards = [
    {
      label: 'Total Items',
      value: portfolio.length,
      hint: 'Posts in your grid',
      Icon: ImageIcon,
    },
    {
      label: 'Images',
      value: summary.totalImages,
      hint: 'Photo posts',
      Icon: Camera,
    },
    {
      label: 'Videos',
      value: summary.totalVideos,
      hint: 'Reel-style posts',
      Icon: Film,
    },
    {
      label: 'Total Interactions',
      value: summary.totalLikes + summary.totalComments,
      hint: `${summary.totalLikes} likes · ${summary.totalComments} comments`,
      Icon: Heart,
    },
  ];

  return (
    <div className="vp-portfolio-page">
      <div className="vp-hero">
        <div className="vp-hero-glow" />
        <div className="vp-hero-body">
          <div className="vp-hero-icon-wrap">
            <ImageIcon size={22} />
          </div>
          <div>
            <h1 className="vp-title">Your Portfolio</h1>
            <p className="vp-subtitle">Manage the images and videos showcased on your profile.</p>
          </div>
        </div>
      </div>

      <div className="vp-portfolio-content">
        <div className="vp-summary-grid">
          {summaryCards.map(({ label, value, hint, Icon }) => (
            <div key={label} className="vp-summary-card">
              <div className="vp-summary-card-head">
                <span className="vp-summary-label">{label}</span>
                <span className="vp-summary-icon"><Icon size={14} /></span>
              </div>
              <strong className="vp-summary-value">{value}</strong>
              <p className="vp-summary-hint">{hint}</p>
            </div>
          ))}
        </div>

        <div className="vp-upload-card">
          <div className="vp-upload-header">
            <div className="vp-upload-title-wrap">
              <h3>Add New Media</h3>
              <p>Share a photo or video to keep your portfolio fresh and engaging.</p>
            </div>
            <span className="vp-upload-limit-info">Images up to 10MB, Videos up to 100MB</span>
          </div>

          <div className="vp-upload-actions-wrap">
            <div className="vp-upload-actions">
              <input
                type="text"
                placeholder="Add an optional caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="vp-caption-input"
                disabled={uploading}
              />

              <input
                type="file"
                accept="image/*,video/*"
                multiple
                ref={fileInputRef}
                onChange={handleUpload}
                style={{ display: 'none' }}
                disabled={uploading}
              />

              <button
                type="button"
                className="vp-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  `Uploading ${uploadProgress}%...`
                ) : (
                  <>
                    <Upload size={18} /> Upload Media
                  </>
                )}
              </button>
            </div>
            <p className="vp-upload-helper">Tip: High-contrast, well-lit media gets better engagement.</p>
          </div>

          {uploading && (
            <div className="vp-progress-bar">
              <div className="vp-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>

        {portfolio.length === 0 ? (
          <div className="vp-empty-portfolio">
            <Camera size={48} className="vp-empty-icon" />
            <p>Your portfolio is currently empty.</p>
            <span>Upload some of your best work to attract more clients!</span>
          </div>
        ) : (
          <div className="vp-portfolio-grid">
            {portfolio.map((item) => (
              <div
                key={item._id}
                className="vp-portfolio-item"
                onClick={() => openItemModal(item._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openItemModal(item._id);
                  }
                }}
              >
                <div className="vp-item-media">
                  {item.resourceType === 'video' ? (
                    <video
                      src={item.url}
                      className="vp-media-video"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption || 'Portfolio item'}
                      className="vp-media-img"
                      loading="lazy"
                    />
                  )}

                  <div className="vp-media-overlay">
                    <button
                      type="button"
                      className="vp-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item._id);
                      }}
                      title="Delete this item"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="vp-hover-stats" aria-hidden="true">
                      <span className="vp-hover-stat">
                        <Heart size={16} /> {item.likesCount || item.likes?.length || 0}
                      </span>
                      <span className="vp-hover-stat">
                        <MessageCircle size={16} /> {item.comments?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="vp-media-type-chip">
                    {item.resourceType === 'video' ? (
                      <><Film size={12} /> Video</>
                    ) : (
                      <><ImageIcon size={12} /> Image</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeItem ? (
        <div className="vp-media-modal-backdrop" onClick={closeItemModal}>
          <div className="vp-media-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vp-media-modal-viewer">
              {activeItem.resourceType === 'video' ? (
                <video
                  src={activeItem.url}
                  className="vp-modal-media vp-modal-media-video"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={activeItem.url}
                  alt={activeItem.caption || 'Portfolio item'}
                  className="vp-modal-media vp-modal-media-image"
                />
              )}
            </div>

            <div className="vp-media-modal-panel">
              <div className="vp-modal-head">
                <div>
                  <h3>Portfolio Item</h3>
                  <p>Engagement and customer comments</p>
                </div>
                <button type="button" className="vp-modal-close" onClick={closeItemModal}>
                  <X size={16} />
                </button>
              </div>

              {activeItem.caption ? <p className="vp-modal-caption">{activeItem.caption}</p> : null}

              <div className="vp-modal-stats">
                <span className="vp-modal-stat">
                  <Heart size={15} /> {activeItem.likesCount || activeItem.likes?.length || 0}
                </span>
                <span className="vp-modal-stat">
                  <MessageCircle size={15} /> {activeItem.comments?.length || 0}
                </span>
                <button
                  type="button"
                  className="vp-modal-delete"
                  onClick={() => {
                    handleDeleteItem(activeItem._id);
                    closeItemModal();
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

              <div className="vp-modal-comments-wrap">
                <h4>Comments</h4>

                {activeItem.comments && activeItem.comments.length > 0 ? (
                  <div className="vp-modal-comments-list">
                    {activeItem.comments.map((comment) => (
                      <div key={comment._id} className="vp-comment">
                        <div className="vp-comment-avatar">
                          {(comment.user?.name || comment.user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="vp-comment-content">
                          <span className="vp-comment-author">{comment.user?.name || 'User'}</span>
                          <p className="vp-comment-text">{comment.text}</p>
                        </div>
                        <button
                          type="button"
                          className="vp-report-btn"
                          onClick={() => openReportModal(activeItem._id, comment._id)}
                          title="Report comment"
                        >
                          <Flag size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="vp-comments-empty">No comments yet on this post.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Comment"
        subtitle="Please let us know why you are reporting this comment."
        onSubmit={handleReportSubmit}
        submitting={reportSubmitting}
      />
    </div>
  );
}

export default VendorPortfolio;
