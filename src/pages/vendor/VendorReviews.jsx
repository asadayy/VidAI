import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { vendorAPI } from '../../api/vendors';
import { reportAPI } from '../../api';
import Loading from '../../components/Loading';
import ReportModal from '../../components/ReportModal';
import toast from 'react-hot-toast';
import {
  Star,
  MessageSquare,
  UserCircle2,
  CalendarDays,
  BadgeCheck,
  Flag,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './VendorReviews.css';

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown date';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const renderStars = (rating = 0) => {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return Array.from({ length: 5 }, (_, i) => i < Math.round(safeRating));
};

function VendorReviews() {
  const [vendor, setVendor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(true);
  const [reportingReview, setReportingReview] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, photos: [], index: 0 });

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const myProfileRes = await vendorAPI.getMyProfile().catch((err) => {
          if (err.response?.status === 404) return null;
          throw err;
        });

        if (!myProfileRes?.data?.data?.vendor?._id) {
          setHasProfile(false);
          return;
        }

        const vendorProfile = myProfileRes.data.data.vendor;
        setVendor(vendorProfile);

        const reviewsRes = await vendorAPI.getReviews(vendorProfile._id);
        setReviews(reviewsRes?.data?.data?.reviews || []);
      } catch {
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const computedAverage = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    return total / reviews.length;
  }, [reviews]);

  const summary = {
    totalReviews: reviews.length,
    averageRating: vendor?.ratingsAverage || computedAverage || 0,
    fiveStarCount: reviews.filter((r) => Number(r.rating) === 5).length,
  };

  if (loading) return <Loading fullScreen message="Loading reviews..." />;

  const openReportReview = (review) => {
    setReportingReview(review);
  };

  const closeReportReview = () => {
    setReportingReview(null);
  };

  const handleSubmitReviewReport = async ({ reasonCategory, reason, description }) => {
    if (!reportingReview?._id) return;

    setReportSubmitting(true);
    try {
      await reportAPI.create({
        targetType: 'review',
        targetReviewId: reportingReview._id,
        reasonCategory,
        reason,
        description,
      });
      toast.success('Review report submitted for admin review.');
      closeReportReview();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (!hasProfile) {
    return (
      <div className="vrev-empty-page">
        <div className="vrev-empty-card">
          <h2>No Vendor Profile Found</h2>
          <p>Create your vendor profile first to start receiving customer reviews.</p>
          <Link to="/vendor/onboarding" className="vrev-btn-primary">
            Complete Vendor Setup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="vrev-page">
      <div className="vrev-header">
        <div>
          <h1 className="vrev-title">Customer Reviews</h1>
          <p className="vrev-subtitle">
            Reviews received for {vendor?.businessName || 'your business'}
          </p>
        </div>
        {vendor?.verificationStatus === 'approved' && (
          <span className="vrev-verified-badge">
            <BadgeCheck size={14} /> Verified Vendor
          </span>
        )}
      </div>

      <div className="vrev-stats-grid">
        <div className="vrev-stat-card">
          <span className="vrev-stat-label">Average Rating</span>
          <span className="vrev-stat-value">
            {Number(summary.averageRating).toFixed(1)}
          </span>
        </div>
        <div className="vrev-stat-card">
          <span className="vrev-stat-label">Total Reviews</span>
          <span className="vrev-stat-value">{summary.totalReviews}</span>
        </div>
        <div className="vrev-stat-card">
          <span className="vrev-stat-label">5-Star Reviews</span>
          <span className="vrev-stat-value">{summary.fiveStarCount}</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="vrev-empty-state">
          <MessageSquare size={30} />
          <h3>No reviews yet</h3>
          <p>Your customer reviews will appear here once users rate your service.</p>
        </div>
      ) : (
        <div className="vrev-list">
          {reviews.map((review) => {
            const stars = renderStars(review.rating);
            return (
              <article key={review._id} className="vrev-card">
                <div className="vrev-card-head">
                  <div className="vrev-user">
                    <div className="vrev-user-avatar">
                      {review.user?.name
                        ? review.user.name.charAt(0).toUpperCase()
                        : <UserCircle2 size={16} />}
                    </div>
                    <div className="vrev-user-meta">
                      <span className="vrev-user-name">{review.user?.name || 'Anonymous User'}</span>
                      <span className="vrev-date">
                        <CalendarDays size={12} /> {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="vrev-stars" aria-label={`Rating ${review.rating} out of 5`}>
                    {stars.map((isFilled, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={isFilled ? 'vrev-star-filled' : 'vrev-star-empty'}
                      />
                    ))}
                  </div>
                </div>

                {review.title && <h3 className="vrev-review-title">{review.title}</h3>}
                {review.comment && <p className="vrev-comment">{review.comment}</p>}
                {review.photos && review.photos.length > 0 && (
                  <div className="vrev-review-photos">
                    {review.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo.url}
                        alt={`Review photo ${i + 1}`}
                        className="vrev-review-thumb"
                        onClick={() => setLightbox({ open: true, photos: review.photos, index: i })}
                      />
                    ))}
                  </div>
                )}
                <div className="vrev-card-actions">
                  <button type="button" className="vrev-report-btn" onClick={() => openReportReview(review)}>
                    <Flag size={13} /> Report review
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ReportModal
        isOpen={Boolean(reportingReview)}
        onClose={closeReportReview}
        title="Report Customer Review"
        subtitle="Describe why this review should be moderated."
        reasonOptions={[
          { value: 'harassment_or_abuse', label: 'Abusive or offensive review language' },
          { value: 'fake_or_misleading', label: 'False or misleading claims' },
          { value: 'spam', label: 'Spam or irrelevant review' },
          { value: 'fraud_or_scam', label: 'Extortion/scam-like behavior' },
          { value: 'other', label: 'Other' },
        ]}
        onSubmit={handleSubmitReviewReport}
        submitting={reportSubmitting}
      />

      {lightbox.open && createPortal(
        <div className="vd-lightbox-overlay" onClick={() => setLightbox(prev => ({ ...prev, open: false }))}>
          <div className="vd-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="vd-lightbox-close" onClick={() => setLightbox(prev => ({ ...prev, open: false }))}>
              <X size={22} />
            </button>
            <img src={lightbox.photos[lightbox.index]?.url} alt={`Review photo ${lightbox.index + 1}`} className="vd-lightbox-img" />
            <div className="vd-lightbox-counter">{lightbox.index + 1} / {lightbox.photos.length}</div>
            {lightbox.photos.length > 1 && (
              <>
                <button
                  className="vd-lightbox-nav vd-lightbox-prev"
                  onClick={() => setLightbox(prev => ({ ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length }))}
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="vd-lightbox-nav vd-lightbox-next"
                  onClick={() => setLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.photos.length }))}
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default VendorReviews;
