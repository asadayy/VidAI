import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapPin, Mail, Phone, Calendar, Users, Check, X, ZoomIn, ChevronLeft, ChevronRight, ArrowLeft, BadgeCheck, Flag, Heart, MessageCircle, MessageSquareDot, Play, ImagePlus } from 'lucide-react';
import { vendorAPI } from '../../api/vendors';
import { reportAPI, chatAPI } from '../../api';
import client from '../../api/client';
import Loading from '../../components/Loading';
import AuthModal from '../../components/auth/AuthModal';
import ReportModal from '../../components/ReportModal';
import { useAuth } from '../../context/AuthContext';
import { getBookingFields, getInitialBookingData, EVENT_TYPE_OPTIONS, TIME_SLOT_OPTIONS, VENUE_TYPE_OPTIONS } from '../../utils/bookingFields';
import './VendorDetails.css';

const VendorDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const packagesRef = useRef(null);

  const [vendor, setVendor] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewLightbox, setReviewLightbox] = useState({ open: false, photos: [], index: 0 });

  const [commentDrafts, setCommentDrafts] = useState({});
  const [portfolioUpdatingId, setPortfolioUpdatingId] = useState('');
  const [likeAnimatedId, setLikeAnimatedId] = useState('');
  const [commentAnimatedId, setCommentAnimatedId] = useState('');
  const [commentsViewer, setCommentsViewer] = useState({
    open: false,
    itemId: '',
    page: 1,
  });

  // Reporting state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportContext, setReportContext] = useState({
    targetType: 'vendor',
    targetVendorId: '',
    portfolioItemId: null,
    title: 'Report Vendor',
    subtitle: '',
    reasonOptions: [],
  });

  // Lightbox
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });

  // Booking Form State
  const [bookingData, setBookingData] = useState({
    eventDate: '',
    eventType: 'wedding',
    guestCount: '',
    notes: '',
    timeSlot: '',
    numberOfPeople: '',
    venueType: '',
    eventLocation: '',
    eventTime: '',
  });

  const COMMENTS_PAGE_SIZE = 6;

  const fetchVendorDetails = useCallback(async () => {
    try {
      const { data } = await vendorAPI.getBySlug(slug);
      const vendorData = data.data?.vendor || data.vendor || data;
      setVendor(vendorData);
      setPackages(vendorData.packages || []);

      if (vendorData._id) {
        const reviewsRes = await client.get(`/vendors/${vendorData._id}/reviews`);
        setReviews(reviewsRes.data.data?.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      toast.error('Failed to load vendor details.');
      navigate('/user/vendors');
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (slug) fetchVendorDetails();
  }, [slug, fetchVendorDetails]);

  const handleBookClick = (pkg) => {
    if (!isAuthenticated) {
      toast.error('Please login to book a vendor.');
      setShowAuthModal(true);
      return;
    }
    setSelectedPackage(pkg);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedPackage(null);
    setBookingData({ eventDate: '', eventType: 'wedding', guestCount: '', notes: '', timeSlot: '', numberOfPeople: '', venueType: '', eventLocation: '', eventTime: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!vendor || !selectedPackage) return;
    setSubmitting(true);
    try {
      const payload = {
        vendorId: vendor._id,
        packageId: selectedPackage._id,
        eventDate: bookingData.eventDate,
        eventType: bookingData.eventType,
        notes: bookingData.notes,
      };
      // Category-specific fields
      if (bookingData.guestCount) payload.guestCount = Number(bookingData.guestCount);
      if (bookingData.timeSlot) payload.timeSlot = bookingData.timeSlot;
      if (bookingData.numberOfPeople) payload.numberOfPeople = Number(bookingData.numberOfPeople);
      if (bookingData.venueType) payload.venueType = bookingData.venueType;
      if (bookingData.eventLocation) payload.eventLocation = bookingData.eventLocation;
      if (bookingData.eventTime) payload.eventTime = bookingData.eventTime;

      await client.post('/bookings', payload);
      toast.success('Booking request sent successfully!');
      handleModalClose();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to leave a review.');
      setShowAuthModal(true);
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await vendorAPI.addReview(vendor._id, {
        ...reviewData,
        photos: reviewPhotos,
      });
      toast.success('Review added successfully!');
      fetchVendorDetails();
      setReviews(prev => [res.data.data.review, ...prev]);
      setReviewData({ rating: 5, title: '', comment: '' });
      setReviewPhotos([]);
    } catch (error) {
      console.error('Review error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openReportModal = ({
    targetType,
    portfolioItemId = null,
    title,
    subtitle,
    reasonOptions = [],
  }) => {
    if (!isAuthenticated) {
      toast.error('Please login to submit a report.');
      setShowAuthModal(true);
      return;
    }

    setReportContext({
      targetType,
      targetVendorId: vendor?._id || '',
      portfolioItemId,
      title,
      subtitle,
      reasonOptions,
    });
    setReportModalOpen(true);
  };

  const handleSubmitReport = async ({ reasonCategory, reason, description }) => {
    if (!vendor?._id) return;

    setReportSubmitting(true);
    try {
      const payload = {
        targetType: reportContext.targetType,
        targetVendorId: vendor._id,
        reasonCategory,
        reason,
        description,
      };

      if (reportContext.targetType === 'portfolio_item' && reportContext.portfolioItemId) {
        payload.portfolioItemId = reportContext.portfolioItemId;
      }

      await reportAPI.create(payload);
      toast.success('Report submitted successfully. Admin will review it.');
      setReportModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const getPortfolioMeta = (item) => {
    const likes = Array.isArray(item?.likes) ? item.likes : [];
    const comments = Array.isArray(item?.comments) ? item.comments : [];
    const likesCount = typeof item?.likesCount === 'number' ? item.likesCount : likes.length;
    const commentsCount = typeof item?.commentsCount === 'number' ? item.commentsCount : comments.length;

    return { likesCount, commentsCount, likes, comments };
  };

  const resolveEntityId = (entity) => {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;
    if (typeof entity === 'object') {
      if (entity._id) return entity._id.toString();
      if (entity.id) return entity.id.toString();
    }
    return '';
  };

  const isCurrentUserLiked = (item) => {
    const currentUserId = resolveEntityId(user);
    if (!currentUserId) return false;
    const { likes } = getPortfolioMeta(item);
    return likes.some((entry) => resolveEntityId(entry) === currentUserId);
  };

  const isCommentOwner = (comment) => {
    const currentUserId = resolveEntityId(user);
    if (!currentUserId) return false;
    return resolveEntityId(comment?.user) === currentUserId;
  };

  const getCommentDisplayName = (comment) => {
    if (comment?.user?.name) return comment.user.name;
    if (isCommentOwner(comment)) return user?.name || 'You';
    return 'User';
  };

  const isVideoItem = (item) => {
    if (!item) return false;
    if (typeof item === 'object' && item.resourceType === 'video') return true;
    const url = (typeof item === 'string' ? item : item.url || '').toLowerCase();
    return ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.mpeg'].some((ext) => url.includes(ext));
  };

  const updatePortfolioItem = (updatedItem) => {
    if (!updatedItem?._id) return;
    setVendor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        portfolio: (prev.portfolio || []).map((item) => (item._id === updatedItem._id ? updatedItem : item)),
      };
    });
  };

  const handlePortfolioLike = async (itemId) => {
    if (!isAuthenticated) {
      toast.error('Please login to like portfolio content.');
      setShowAuthModal(true);
      return;
    }

    if (!vendor?._id || !itemId) return;

    const previousVendor = vendor;
    const userId = resolveEntityId(user);

    if (userId) {
      setVendor((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          portfolio: (prev.portfolio || []).map((item) => {
            if (item._id !== itemId) return item;
            const likes = Array.isArray(item.likes) ? [...item.likes] : [];
            const alreadyLiked = likes.some((entry) => resolveEntityId(entry) === userId);
            const nextLikes = alreadyLiked
              ? likes.filter((entry) => resolveEntityId(entry) !== userId)
              : [...likes, userId];

            return {
              ...item,
              likes: nextLikes,
              likesCount: nextLikes.length,
            };
          }),
        };
      });
    }

    setPortfolioUpdatingId(`like-${itemId}`);
    setLikeAnimatedId(itemId);
    setTimeout(() => setLikeAnimatedId(''), 350);
    try {
      const { data } = await vendorAPI.togglePortfolioLike(vendor._id, itemId);
      updatePortfolioItem(data?.data?.portfolioItem);
    } catch (error) {
      setVendor(previousVendor);
      toast.error(error.response?.data?.message || 'Failed to update like.');
    } finally {
      setPortfolioUpdatingId('');
    }
  };

  const handlePortfolioComment = async (itemId) => {
    if (!isAuthenticated) {
      toast.error('Please login to comment on portfolio content.');
      setShowAuthModal(true);
      return;
    }

    if (!vendor?._id || !itemId) return;

    const text = (commentDrafts[itemId] || '').trim();
    if (!text) {
      toast.error('Please write a comment before submitting.');
      return;
    }

    const previousVendor = vendor;
    const optimisticComment = {
      _id: `temp-${Date.now()}`,
      user: {
        _id: resolveEntityId(user),
        name: user?.name || 'You',
      },
      text,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setVendor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        portfolio: (prev.portfolio || []).map((item) => {
          if (item._id !== itemId) return item;
          const comments = Array.isArray(item.comments) ? [...item.comments, optimisticComment] : [optimisticComment];
          return {
            ...item,
            comments,
            commentsCount: comments.length,
          };
        }),
      };
    });
    setCommentDrafts((prev) => ({ ...prev, [itemId]: '' }));
    setPortfolioUpdatingId(`comment-${itemId}`);
    setCommentAnimatedId(itemId);
    setTimeout(() => setCommentAnimatedId(''), 450);

    try {
      const { data } = await vendorAPI.addPortfolioComment(vendor._id, itemId, text);
      updatePortfolioItem(data?.data?.portfolioItem);
      toast.success('Comment added.');
    } catch (error) {
      setVendor(previousVendor);
      setCommentDrafts((prev) => ({ ...prev, [itemId]: text }));
      toast.error(error.response?.data?.message || 'Failed to add comment.');
    } finally {
      setPortfolioUpdatingId('');
    }
  };

  const handleDeletePortfolioComment = async (itemId, commentId) => {
    if (!isAuthenticated) {
      toast.error('Please login to manage your comments.');
      setShowAuthModal(true);
      return;
    }

    if (!vendor?._id || !itemId || !commentId) return;

    const activeItem = (vendor.portfolio || []).find((entry) => entry?._id === itemId);
    const targetComment = (activeItem?.comments || []).find((entry) => entry?._id === commentId);
    if (!targetComment || !isCommentOwner(targetComment)) {
      toast.error('You can only delete your own comment.');
      return;
    }

    const previousVendor = vendor;
    setVendor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        portfolio: (prev.portfolio || []).map((item) => {
          if (item._id !== itemId) return item;
          const comments = (item.comments || []).filter((comment) => comment?._id !== commentId);
          return {
            ...item,
            comments,
            commentsCount: comments.length,
          };
        }),
      };
    });

    setPortfolioUpdatingId(`delete-${commentId}`);

    try {
      const { data } = await vendorAPI.deletePortfolioComment(vendor._id, itemId, commentId);
      updatePortfolioItem(data?.data?.portfolioItem);
      toast.success('Comment deleted.');
    } catch (error) {
      setVendor(previousVendor);
      toast.error(error.response?.data?.message || 'Failed to delete comment.');
    } finally {
      setPortfolioUpdatingId('');
    }
  };

  const openCommentsViewer = (itemId) => {
    if (!itemId) return;
    setCommentsViewer({
      open: true,
      itemId,
      page: 1,
    });
  };

  const closeCommentsViewer = () => {
    setCommentsViewer({
      open: false,
      itemId: '',
      page: 1,
    });
  };

  // ── Helpers ──────────────────────────────────────────────────
  const renderStars = (rating, size = '1rem') => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ fontSize: size }} className={i < Math.round(rating) ? 'vd-star' : 'vd-star-empty'}>★</span>
    ));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const portfolio = vendor?.portfolio || [];
  const activeCommentItem = portfolio.find((item) => item?._id === commentsViewer.itemId);
  const activeCommentMeta = getPortfolioMeta(activeCommentItem);
  const activeComments = activeCommentMeta.comments;
  const activeLikesCount = activeCommentMeta.likesCount;
  const activeCommentsCount = activeCommentMeta.commentsCount;
  const activeCommentLiked = isCurrentUserLiked(activeCommentItem);
  const activeCommentItemId = activeCommentItem?._id;
  const commentPages = Math.max(1, Math.ceil(activeComments.length / COMMENTS_PAGE_SIZE));
  const safeCommentPage = Math.min(commentsViewer.page, commentPages);
  const activeCommentsPageItems = activeComments.slice(
    (safeCommentPage - 1) * COMMENTS_PAGE_SIZE,
    safeCommentPage * COMMENTS_PAGE_SIZE
  );

  useEffect(() => {
    if (!commentsViewer.open) return;
    if (commentsViewer.page > commentPages) {
      setCommentsViewer((prev) => ({ ...prev, page: commentPages }));
    }
  }, [commentsViewer.open, commentsViewer.page, commentPages]);

  // ── Render ────────────────────────────────────────────────────
  if (loading) return <Loading />;
  if (!vendor) return <div className="vd-error">Vendor not found</div>;

  return (
    <div className="vd-root">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <nav className="vd-topbar">
        <button className="vd-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="vd-breadcrumb">Vendors / <b>{vendor.businessName}</b></span>
        <div className="vd-topbar-actions">
          <button className="vd-topbar-btn" onClick={() => packagesRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            View Packages
          </button>
          {isAuthenticated && user?.role === 'user' && vendor?._id && (
            <button
              className="vd-topbar-btn"
              onClick={async () => {
                try {
                  const { data } = await chatAPI.getOrCreateConversation(vendor._id);
                  navigate(`/user/messages?conversation=${data.data._id}`);
                } catch (err) {
                  toast.error('Failed to start conversation');
                }
              }}
            >
              <MessageSquareDot size={14} /> Message
            </button>
          )}
          <button
            className="vd-topbar-btn vd-topbar-btn-danger"
            onClick={() => openReportModal({
              targetType: 'vendor',
              title: 'Report Vendor',
              subtitle: 'Tell us what issue you observed with this vendor.',
              reasonOptions: [
                { value: 'fraud_or_scam', label: 'Fraud or scam behavior' },
                { value: 'fake_or_misleading', label: 'Fake or misleading profile info' },
                { value: 'harassment_or_abuse', label: 'Harassment or abusive conduct' },
                { value: 'spam', label: 'Spam or repeated unwanted contact' },
                { value: 'other', label: 'Other' },
              ],
            })}
          >
            <Flag size={14} /> Report Vendor
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="vd-hero">
        <img
          src={vendor.coverImage?.url || 'https://placehold.co/1400x480/1a1a2e/ffffff?text=No+Cover+Image'}
          alt={vendor.businessName}
          className="vd-hero-img"
          onError={(e) => { e.target.src = 'https://placehold.co/1400x480/1a1a2e/ffffff?text=No+Cover+Image'; }}
        />
        <div className="vd-hero-overlay">
          <span className="vd-hero-cat">
            {vendor.category?.replace(/_/g, ' ') || 'Vendor'}
          </span>
          <h1 className="vd-hero-title">{vendor.businessName}</h1>
          <div className="vd-hero-meta">
            {vendor.city && (
              <span className="vd-hero-meta-item">
                <MapPin size={16} /> {vendor.city}
              </span>
            )}
            <span className="vd-hero-meta-item vd-hero-stars">
              {renderStars(vendor.ratingsAverage || 0)}
              <span className="vd-rating-score">{(vendor.ratingsAverage || 0).toFixed(1)}</span>
              <span className="vd-rating-count">({vendor.ratingsCount || 0})</span>
            </span>
            {vendor.isVerified && (
              <span className="vd-hero-verified">
                <BadgeCheck size={14} /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="vd-body">

        {/* ── Main Column ─────────────────────────────────── */}
        <main className="vd-main">

          {/* About */}
          <section className="vd-section">
            <h2 className="vd-section-title">About Us</h2>
            <p className="vd-about-text">{vendor.description || 'No description provided.'}</p>
            {vendor.tags?.length > 0 && (
              <div className="vd-tags">
                {vendor.tags.map((tag, i) => <span key={i} className="vd-tag">{tag}</span>)}
              </div>
            )}
          </section>

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <section className="vd-section">
              <h2 className="vd-section-title">Portfolio</h2>
              <div className="vd-portfolio-grid">
                {portfolio.map((item, index) => {
                  const { likesCount, commentsCount } = getPortfolioMeta(item);
                  const isVideo = isVideoItem(item);
                  const itemId = item?._id;
                  const itemLikedByCurrentUser = isCurrentUserLiked(item);

                  return (
                  <div
                    key={item._id || index}
                    className="vd-portfolio-item"
                    onClick={() => (itemId ? openCommentsViewer(itemId) : setLightbox({ open: true, index }))}
                  >
                    {isVideo ? (
                      <>
                        <video
                          src={item.url}
                          className="vd-portfolio-media"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <span className="vd-portfolio-video-tag"><Play size={12} /> Video</span>
                      </>
                    ) : (
                      <img
                        src={item.url || item}
                        alt={`Portfolio ${index + 1}`}
                        className="vd-portfolio-media"
                        onError={(e) => { e.target.src = 'https://placehold.co/300x300/f0ecea/999?text=Image'; }}
                      />
                    )}
                    <div className="vd-portfolio-item-overlay"><ZoomIn size={24} /></div>
                    <button
                      type="button"
                      className="vd-portfolio-report-btn"
                      disabled={!itemId}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!itemId) return;
                        openReportModal({
                          targetType: 'portfolio_item',
                          portfolioItemId: itemId,
                          title: 'Report Portfolio Media',
                          subtitle: 'Report this image/video if it violates platform rules.',
                          reasonOptions: [
                            { value: 'inappropriate_content', label: 'Inappropriate or explicit media' },
                            { value: 'copyright_or_ip', label: 'Copyright/IP infringement' },
                            { value: 'fake_or_misleading', label: 'Misleading or fake portfolio media' },
                            { value: 'fraud_or_scam', label: 'Scam or deceptive intent' },
                            { value: 'other', label: 'Other' },
                          ],
                        });
                      }}
                    >
                      <Flag size={13} /> Report
                    </button>

                    <div className="vd-portfolio-social" onClick={(e) => e.stopPropagation()}>
                      <span className={`vd-portfolio-social-count ${itemLikedByCurrentUser ? 'liked' : ''}`}>
                        <Heart size={14} fill={itemLikedByCurrentUser ? 'currentColor' : 'none'} /> {likesCount}
                      </span>
                      <span className="vd-portfolio-social-count">
                        <MessageCircle size={14} /> {commentsCount}
                      </span>
                    </div>
                  </div>
                );})}
              </div>
            </section>
          )}

          {/* Packages */}
          <section className="vd-section" ref={packagesRef}>
            <h2 className="vd-section-title">Available Packages</h2>
            {packages.length > 0 ? (
              <div className="vd-pkg-grid">
                {packages.map((pkg) => (
                  <div key={pkg._id} className="vd-pkg-card">
                    <div className="vd-pkg-head">
                      <span className="vd-pkg-name">{pkg.name}</span>
                      <span className="vd-pkg-price">Rs. {pkg.price?.toLocaleString()}</span>
                    </div>
                    {pkg.description && <p className="vd-pkg-desc">{pkg.description}</p>}
                    {pkg.features?.length > 0 && (
                      <ul className="vd-pkg-features">
                        {pkg.features.map((f, idx) => (
                          <li key={idx}>
                            <Check size={14} className="vd-pkg-feat-icon" /> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button className="vd-pkg-book-btn" onClick={() => handleBookClick(pkg)}>
                      Book This Package
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="vd-portfolio-empty">No packages listed yet.</p>
            )}
          </section>

          {/* Reviews */}
          <section className="vd-section">
            <h2 className="vd-section-title">Reviews &amp; Ratings</h2>
            <div className="vd-reviews-layout">

              {/* Submit form */}
              <div className="vd-review-form">
                <h3>Leave a Review</h3>
                <form onSubmit={handleReviewSubmit}>

                  {/* Star picker */}
                  <div className="vd-field">
                    <label>Your Rating</label>
                    <div className="vd-star-picker">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`vd-star-pick${(hoverRating || reviewData.rating) >= n ? ' active' : ''}`}
                          onMouseEnter={() => setHoverRating(n)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewData(prev => ({ ...prev, rating: n }))}
                          aria-label={`${n} star`}
                        >★</button>
                      ))}
                    </div>
                  </div>

                  <div className="vd-field">
                    <label>Title</label>
                    <input
                      type="text"
                      value={reviewData.title}
                      onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      placeholder="Summarise your experience"
                    />
                  </div>

                  <div className="vd-field">
                    <label>Comment</label>
                    <textarea
                      value={reviewData.comment}
                      onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                      required
                      placeholder="Share the details of your experience…"
                      rows={4}
                    />
                  </div>

                  {/* Photo upload */}
                  <div className="vd-field">
                    <label>Photos (optional, up to 5)</label>
                    <div className="vd-photo-upload-area">
                      {reviewPhotos.map((file, i) => (
                        <div key={i} className="vd-photo-preview">
                          <img src={URL.createObjectURL(file)} alt={`Preview ${i + 1}`} />
                          <button
                            type="button"
                            className="vd-photo-remove"
                            onClick={() => setReviewPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {reviewPhotos.length < 5 && (
                        <label className="vd-photo-add-btn">
                          <ImagePlus size={20} />
                          <span>Add</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            hidden
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setReviewPhotos(prev => [...prev, ...files].slice(0, 5));
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="vd-submit-btn" disabled={submittingReview}>
                    {submittingReview ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              </div>

              {/* Reviews list */}
              <div>
                <h3 className="vd-review-list-head">Recent Reviews</h3>
                {reviews.length > 0 ? (
                  <div className="vd-review-cards">
                    {reviews.map(review => (
                      <div key={review._id} className="vd-review-card">
                        <div className="vd-review-card-head">
                          <div className="vd-reviewer-info">
                            <div className="vd-reviewer-avatar">
                              {(review.user?.name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="vd-reviewer-name">{review.user?.name || 'Guest'}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="vd-review-stars">
                              {Array.from({ length: 5 }, (_, i) => (
                                <span key={i} className={i < review.rating ? 'vd-review-star-full' : 'vd-review-star-empty'}>★</span>
                              ))}
                            </div>
                            <div className="vd-review-date">{formatDate(review.createdAt)}</div>
                          </div>
                        </div>
                        {review.title && <p className="vd-review-title-text">{review.title}</p>}
                        <p className="vd-review-body">{review.comment}</p>
                        {review.photos && review.photos.length > 0 && (
                          <div className="vd-review-photos">
                            {review.photos.map((photo, i) => (
                              <img
                                key={i}
                                src={photo.url}
                                alt={`Review photo ${i + 1}`}
                                className="vd-review-thumb"
                                onClick={() => setReviewLightbox({ open: true, photos: review.photos, index: i })}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="vd-no-reviews">No reviews yet — be the first to share your experience!</p>
                )}
              </div>

            </div>
          </section>
        </main>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="vd-sidebar">

          {/* Stats card */}
          <div className="vd-stats-card">
            <p className="vd-stats-card-title">At a Glance</p>
            <div className="vd-stats-grid">
              <div className="vd-stat-item">
                <span className="vd-stat-val vd-stat-gold">{(vendor.ratingsAverage || 0).toFixed(1)}</span>
                <span className="vd-stat-lbl">Rating</span>
              </div>
              <div className="vd-stat-item">
                <span className="vd-stat-val">{vendor.ratingsCount || 0}</span>
                <span className="vd-stat-lbl">Reviews</span>
              </div>
              <div className="vd-stat-item">
                <span className="vd-stat-val">{packages.length}</span>
                <span className="vd-stat-lbl">Packages</span>
              </div>
              <div className="vd-stat-item">
                <span className="vd-stat-val">{portfolio.length}</span>
                <span className="vd-stat-lbl">Portfolio</span>
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className="vd-contact-card">
            <p className="vd-contact-card-title">Contact &amp; Book</p>
            <div className="vd-contact-rows">
              {vendor.email && (
                <div className="vd-contact-row">
                  <span className="vd-contact-icon"><Mail size={15} /></span>
                  {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="vd-contact-row">
                  <span className="vd-contact-icon"><Phone size={15} /></span>
                  {vendor.phone}
                </div>
              )}
              {vendor.city && (
                <div className="vd-contact-row">
                  <span className="vd-contact-icon"><MapPin size={15} /></span>
                  {vendor.city}
                </div>
              )}
            </div>
            <button
              className="vd-cta-btn"
              onClick={() => packagesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              Book a Package
            </button>
            <button
              className="vd-cta-btn-outline"
              onClick={() => navigate('/user/vendors')}
            >
              ← Browse Vendors
            </button>
          </div>

        </aside>
      </div>

      {/* ── Booking Modal ──────────────────────────────────── */}
      {showModal && createPortal(
        <div className="vd-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleModalClose(); }}>
          <div className="vd-modal">
            <div className="vd-modal-header">
              <p className="vd-modal-pkg-label">Booking Request</p>
              <h2 className="vd-modal-title">{selectedPackage?.name}</h2>
              {selectedPackage?.price && (
                <span className="vd-modal-price">
                  Rs. {(['makeup_artist', 'mehndi_artist'].includes(vendor?.category) && Number(bookingData.numberOfPeople) > 1
                    ? (selectedPackage.price * Number(bookingData.numberOfPeople)).toLocaleString()
                    : selectedPackage.price.toLocaleString()
                  )}
                  {['makeup_artist', 'mehndi_artist'].includes(vendor?.category) && Number(bookingData.numberOfPeople) > 1 && (
                    <span style={{ fontSize: '0.75em', opacity: 0.7, marginLeft: 6 }}>
                      ({bookingData.numberOfPeople} × Rs. {selectedPackage.price.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
              <button className="vd-modal-close" onClick={handleModalClose}><X size={16} /></button>
            </div>

            <div className="vd-modal-body">
              {(() => {
                const fields = vendor ? getBookingFields(vendor.category) : {};
                return (
                  <form onSubmit={handleBookingSubmit} className="vd-modal-form">

                    {/* Row: Date + GuestCount or Date + TimeSlot or Date + Time */}
                    <div className="vd-modal-row">
                      {fields.eventDate && (
                        <div className="vd-field">
                          <label><Calendar size={12} style={{ marginRight: 4 }} />Event Date {fields.eventDate.required && '*'}</label>
                          <input
                            type="date"
                            name="eventDate"
                            value={bookingData.eventDate}
                            onChange={handleInputChange}
                            required={fields.eventDate.required}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      )}

                      {fields.guestCount && (
                        <div className="vd-field">
                          <label><Users size={12} style={{ marginRight: 4 }} />Guest Count {fields.guestCount.required && '*'}</label>
                          <input
                            type="number"
                            name="guestCount"
                            value={bookingData.guestCount}
                            onChange={handleInputChange}
                            placeholder="e.g. 200"
                            min="1"
                            required={fields.guestCount.required}
                          />
                        </div>
                      )}

                      {fields.timeSlot && (
                        <div className="vd-field">
                          <label>Morning / Evening {fields.timeSlot.required && '*'}</label>
                          <select name="timeSlot" value={bookingData.timeSlot} onChange={handleInputChange} required={fields.timeSlot.required}>
                            <option value="" disabled>Select slot</option>
                            {TIME_SLOT_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {fields.eventTime && (
                        <div className="vd-field">
                          <label>Time {fields.eventTime.required && '*'}</label>
                          <input
                            type="time"
                            name="eventTime"
                            value={bookingData.eventTime}
                            onChange={handleInputChange}
                            required={fields.eventTime.required}
                          />
                        </div>
                      )}
                    </div>

                    {/* Number of people (makeup/mehndi) */}
                    {fields.numberOfPeople && (
                      <div className="vd-field">
                        <label>No. of People {fields.numberOfPeople.required && '*'}</label>
                        <input
                          type="number"
                          name="numberOfPeople"
                          value={bookingData.numberOfPeople}
                          onChange={handleInputChange}
                          placeholder="e.g. 1"
                          min="1"
                          required={fields.numberOfPeople.required}
                        />
                      </div>
                    )}

                    {/* Venue type (decorator) */}
                    {fields.venueType && (
                      <div className="vd-field">
                        <label>Venue Type {fields.venueType.required && '*'}</label>
                        <select name="venueType" value={bookingData.venueType} onChange={handleInputChange} required={fields.venueType.required}>
                          <option value="" disabled>Select venue type</option>
                          {VENUE_TYPE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Venue address (decorator) */}
                    {fields.eventLocation && (
                      <div className="vd-field">
                        <label>Venue Address {fields.eventLocation.required && '*'}</label>
                        <input
                          type="text"
                          name="eventLocation"
                          value={bookingData.eventLocation}
                          onChange={handleInputChange}
                          placeholder="Enter venue address"
                          required={fields.eventLocation.required}
                        />
                      </div>
                    )}

                    {/* Event Type */}
                    {fields.eventType && (
                      <div className="vd-field">
                        <label>Event Type {fields.eventType.required && '*'}</label>
                        <select name="eventType" value={bookingData.eventType} onChange={handleInputChange} required={fields.eventType.required}>
                          {EVENT_TYPE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Notes */}
                    {fields.notes !== undefined && (
                      <div className="vd-field">
                        <label>Special Details / Notes</label>
                        <textarea
                          name="notes"
                          value={bookingData.notes}
                          onChange={handleInputChange}
                          placeholder="Any specific requests or details…"
                          rows={3}
                        />
                      </div>
                    )}

                    <button type="submit" className="vd-form-confirm-btn" disabled={submitting}>
                      {submitting ? 'Submitting…' : 'Confirm Booking Request'}
                    </button>
                  </form>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {commentsViewer.open && createPortal(
        <div className="vd-comments-modal-backdrop" onClick={closeCommentsViewer}>
          <div className="vd-comments-modal" onClick={(e) => e.stopPropagation()}>
            {!activeCommentItem ? (
              <div className="vd-comments-modal-body">
                <p className="vd-comments-empty">Portfolio item not found.</p>
              </div>
            ) : (
              <>
                <div className="vd-comments-media-wrap">
                  {isVideoItem(activeCommentItem) ? (
                    <video
                      src={activeCommentItem?.url}
                      className="vd-comments-media"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={activeCommentItem?.url}
                      alt="Portfolio media"
                      className="vd-comments-media"
                    />
                  )}
                </div>

                <div className="vd-comments-side">
                  <div className="vd-comments-modal-head">
                    <h3>Portfolio Comments</h3>
                    <button type="button" className="vd-comments-close" onClick={closeCommentsViewer}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="vd-comments-thread">
                    {activeComments.length === 0 ? (
                      <p className="vd-comments-empty">No comments yet.</p>
                    ) : (
                      <div className="vd-comments-list">
                        {activeCommentsPageItems.map((comment) => (
                          <div key={comment._id} className={`vd-comments-item ${comment.isOptimistic ? 'pending' : ''}`}>
                            <div className="vd-comments-item-head">
                              <span className="vd-comments-user">{getCommentDisplayName(comment)}</span>
                              <div className="vd-comments-item-meta">
                                <span className="vd-comments-time">{formatDate(comment.createdAt)}</span>
                                {isCommentOwner(comment) && !comment.isOptimistic && (
                                  <button
                                    type="button"
                                    className="vd-comments-delete-btn"
                                    onClick={() => handleDeletePortfolioComment(activeCommentItemId, comment._id)}
                                    disabled={portfolioUpdatingId === `delete-${comment._id}`}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                            <p>{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {commentPages > 1 && (
                      <div className="vd-comments-pagination">
                        <button
                          type="button"
                          onClick={() => setCommentsViewer((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                          disabled={safeCommentPage <= 1}
                        >
                          Prev
                        </button>
                        <span>{safeCommentPage} / {commentPages}</span>
                        <button
                          type="button"
                          onClick={() => setCommentsViewer((prev) => ({ ...prev, page: Math.min(commentPages, prev.page + 1) }))}
                          disabled={safeCommentPage >= commentPages}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="vd-comments-actions">
                    <button
                      type="button"
                      className={`vd-comments-like-btn ${activeCommentLiked ? 'liked' : ''} ${likeAnimatedId === activeCommentItemId ? 'pulse' : ''}`}
                      onClick={() => handlePortfolioLike(activeCommentItemId)}
                      disabled={!activeCommentItemId || portfolioUpdatingId === `like-${activeCommentItemId}`}
                    >
                      <Heart size={15} fill={activeCommentLiked ? 'currentColor' : 'none'} />
                      <span>{activeLikesCount}</span>
                    </button>

                    <span className="vd-comments-action-count">
                      <MessageCircle size={15} /> {activeCommentsCount}
                    </span>
                  </div>

                  <div className="vd-comments-composer">
                    <input
                      type="text"
                      value={activeCommentItemId ? (commentDrafts[activeCommentItemId] || '') : ''}
                      onChange={(e) => {
                        if (!activeCommentItemId) return;
                        setCommentDrafts((prev) => ({ ...prev, [activeCommentItemId]: e.target.value }));
                      }}
                      placeholder="Add a comment..."
                      maxLength={500}
                    />
                    <button
                      type="button"
                      className={commentAnimatedId === activeCommentItemId ? 'pulse' : ''}
                      onClick={() => handlePortfolioComment(activeCommentItemId)}
                      disabled={!activeCommentItemId || portfolioUpdatingId === `comment-${activeCommentItemId}`}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Lightbox ───────────────────────────────────────── */}
      {lightbox.open && createPortal(
        <div className="vd-lightbox" onClick={() => setLightbox({ open: false, index: 0 })}>
          {portfolio.length > 1 && (
            <>
              <button
                className="vd-lightbox-nav vd-lightbox-nav-prev"
                onClick={(e) => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index - 1 + portfolio.length) % portfolio.length })); }}
              ><ChevronLeft size={24} /></button>
              <button
                className="vd-lightbox-nav vd-lightbox-nav-next"
                onClick={(e) => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index + 1) % portfolio.length })); }}
              ><ChevronRight size={24} /></button>
            </>
          )}
          {isVideoItem(portfolio[lightbox.index]) ? (
            <video
              src={portfolio[lightbox.index]?.url}
              className="vd-lightbox-video"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={portfolio[lightbox.index]?.url || portfolio[lightbox.index]}
              alt={`Portfolio ${lightbox.index + 1}`}
              className="vd-lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button className="vd-lightbox-close" onClick={() => setLightbox({ open: false, index: 0 })}><X size={18} /></button>
          <span className="vd-lightbox-caption">{lightbox.index + 1} / {portfolio.length}</span>
        </div>,
        document.body
      )}

      {/* ── Auth Modal ─────────────────────────────────────── */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={reportContext.title}
        subtitle={reportContext.subtitle}
        reasonOptions={reportContext.reasonOptions}
        onSubmit={handleSubmitReport}
        submitting={reportSubmitting}
        submitLabel="Submit Report"
      />

      {/* Review photo lightbox */}
      {reviewLightbox.open && createPortal(
        <div className="vd-lightbox-overlay" onClick={() => setReviewLightbox(prev => ({ ...prev, open: false }))}>
          <div className="vd-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="vd-lightbox-close" onClick={() => setReviewLightbox(prev => ({ ...prev, open: false }))}>
              <X size={22} />
            </button>
            <img src={reviewLightbox.photos[reviewLightbox.index]?.url} alt={`Review photo ${reviewLightbox.index + 1}`} className="vd-lightbox-img" />
            <div className="vd-lightbox-counter">{reviewLightbox.index + 1} / {reviewLightbox.photos.length}</div>
            {reviewLightbox.photos.length > 1 && (
              <>
                <button
                  className="vd-lightbox-nav vd-lightbox-prev"
                  onClick={() => setReviewLightbox(prev => ({ ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length }))}
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="vd-lightbox-nav vd-lightbox-next"
                  onClick={() => setReviewLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.photos.length }))}
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
};

export default VendorDetails;
