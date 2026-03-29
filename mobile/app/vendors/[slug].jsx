import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { vendorAPI } from '../../api/vendors.js';
import { bookingAPI } from '../../api/bookings.js';
import { reportAPI } from '../../api/reports.js';
import { chatAPI } from '../../api/chat.js';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/Loading';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;
const GOLD = '#C9A84C';
const BERRY = '#7B1D3A';
const CREAM = '#f8f5f2';
const COMMENTS_PAGE_SIZE = 6;

const TIME_OPTIONS = [
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM',
  '8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM','10:30 PM',
  '11:00 PM','11:30 PM','12:00 AM',
];

const renderStars = (rating, size = 14) =>
  Array.from({ length: 5 }, (_, i) => (
    <Ionicons
      key={i}
      name={i < Math.round(rating) ? 'star' : 'star-outline'}
      size={size}
      color={i < Math.round(rating) ? '#fbbf24' : '#d1d5db'}
      style={{ marginRight: 1 }}
    />
  ));

const formatCategory = (cat) =>
  cat ? cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Vendor';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function MobileVideo({ uri, style, contentFit = 'cover', nativeControls = false, shouldPlay = false, isLooping = false, isMuted = false }) {
  const player = useVideoPlayer(uri ? { uri } : null, (p) => {
    p.loop = Boolean(isLooping);
    p.muted = Boolean(isMuted);
    if (shouldPlay) p.play();
  });

  useEffect(() => {
    if (!player) return;
    player.loop = Boolean(isLooping);
    player.muted = Boolean(isMuted);
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, shouldPlay, isLooping, isMuted, uri]);

  if (!uri) {
    return <View style={[style, { backgroundColor: '#111827' }]} />;
  }

  return (
    <VideoView
      style={style}
      player={player}
      contentFit={contentFit}
      nativeControls={nativeControls}
      allowsPictureInPicture={false}
    />
  );
}

export default function VendorDetails() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [selectedPkg, setSelectedPkg] = useState(null);

  // Booking
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    eventDate: '',
    eventTime: '',
    guestCount: '',
    packageId: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState({ visible: false, index: 0 });

  // Portfolio social
  const [commentDrafts, setCommentDrafts] = useState({});
  const [portfolioUpdatingId, setPortfolioUpdatingId] = useState('');
  const [commentsViewer, setCommentsViewer] = useState({
    open: false,
    itemId: '',
    page: 1,
  });

  // Customer reports (vendor + portfolio content)
  const [reportModal, setReportModal] = useState({
    open: false,
    targetType: 'vendor',
    portfolioItemId: '',
  });
  const [reportCategory, setReportCategory] = useState('other');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const reportReasonOptions = [
    { value: 'fraud_or_scam', label: 'Fraud or scam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'fake_or_misleading', label: 'Fake or misleading' },
    { value: 'harassment_or_abuse', label: 'Harassment or abuse' },
    { value: 'copyright_or_ip', label: 'Copyright / IP' },
    { value: 'spam', label: 'Spam' },
    { value: 'other', label: 'Other' },
  ];

  const fmtDisplayDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setPickerDate(selected);
    setBookingData(prev => ({ ...prev, eventDate: selected.toISOString().split('T')[0] }));
  };

  useEffect(() => {
    fetchVendor();
  }, [slug]);

  const fetchVendor = async () => {
    try {
      const response = await vendorAPI.getBySlug(slug);
      const vendorData = response.data.data.vendor || response.data.vendor || response.data;
      setVendor(vendorData);
      if (vendorData && vendorData._id) {
        const reviewRes = await vendorAPI.getReviews(vendorData._id);
        setReviews(reviewRes.data.data?.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
      Toast.show({ type: 'error', text1: 'Failed to load vendor details' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!commentsViewer.open) return;
    const currentItem = (vendor?.portfolio || []).find((item) => item?._id === commentsViewer.itemId);
    const currentComments = Array.isArray(currentItem?.comments) ? currentItem.comments : [];
    const pages = Math.max(1, Math.ceil(currentComments.length / COMMENTS_PAGE_SIZE));
    if (commentsViewer.page > pages) {
      setCommentsViewer((prev) => ({ ...prev, page: pages }));
    }
  }, [commentsViewer.open, commentsViewer.itemId, commentsViewer.page, vendor]);

  const handleBooking = async () => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please login to book a vendor' });
      router.push('/(auth)/login');
      return;
    }
    if (!bookingData.eventDate || !bookingData.guestCount || !bookingData.packageId) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in all required fields',
        text2: !bookingData.packageId ? 'Select a package first' : !bookingData.eventDate ? 'Pick an event date' : 'Enter guest count',
      });
      return;
    }
    setSubmitting(true);
    try {
      await bookingAPI.create({
        vendorId: vendor._id,
        packageId: bookingData.packageId,
        eventDate: bookingData.eventDate,
        guestCount: parseInt(bookingData.guestCount),
        notes: bookingData.notes,
      });
      Toast.show({ type: 'success', text1: 'Booking created successfully!' });
      setBookingModal(false);
      router.push('/(tabs)/bookings');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create booking';
      Toast.show({ type: 'error', text1: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please login to leave a review' });
      setReviewModal(false);
      router.push('/(auth)/login');
      return;
    }
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5 || !reviewData.title || !reviewData.comment) {
      Toast.show({ type: 'error', text1: 'Please fill in all review fields' });
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await vendorAPI.addReview(vendor._id, {
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
      });
      Toast.show({ type: 'success', text1: 'Review added successfully!' });
      setReviewModal(false);
      setReviews(prev => [res.data.data.review, ...prev]);
      setReviewData({ rating: 5, title: '', comment: '' });
      fetchVendor();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit review';
      Toast.show({ type: 'error', text1: message });
    } finally {
      setSubmittingReview(false);
    }
  };

  const resolveEntityId = (entity) => {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;
    if (entity._id) return entity._id.toString();
    if (entity.id) return entity.id.toString();
    return '';
  };

  const getPortfolioMeta = (item) => {
    const likes = Array.isArray(item?.likes) ? item.likes : [];
    const comments = Array.isArray(item?.comments) ? item.comments : [];
    const likesCount = typeof item?.likesCount === 'number' ? item.likesCount : likes.length;
    const commentsCount = typeof item?.commentsCount === 'number' ? item.commentsCount : comments.length;
    return { likes, comments, likesCount, commentsCount };
  };

  const isCurrentUserLiked = (item) => {
    const currentUserId = resolveEntityId(user);
    if (!currentUserId) return false;
    return getPortfolioMeta(item).likes.some((entry) => resolveEntityId(entry) === currentUserId);
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
    if (item.resourceType === 'video') return true;
    const url = (item.url || item || '').toString().toLowerCase();
    return ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.mpeg'].some((ext) => url.includes(ext));
  };

  const updatePortfolioItem = (updatedItem) => {
    if (!updatedItem?._id) return;
    setVendor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        portfolio: (prev.portfolio || []).map((item) => (item?._id === updatedItem._id ? updatedItem : item)),
      };
    });
  };

  const openCommentsViewer = (itemId) => {
    if (!itemId) return;
    setCommentsViewer({ open: true, itemId, page: 1 });
  };

  const closeCommentsViewer = () => {
    setCommentsViewer({ open: false, itemId: '', page: 1 });
  };

  const handlePortfolioLike = async (itemId) => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please login to like portfolio content' });
      router.push('/(auth)/login');
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
            if (item?._id !== itemId) return item;
            const likes = Array.isArray(item.likes) ? [...item.likes] : [];
            const alreadyLiked = likes.some((entry) => resolveEntityId(entry) === userId);
            const nextLikes = alreadyLiked
              ? likes.filter((entry) => resolveEntityId(entry) !== userId)
              : [...likes, userId];
            return { ...item, likes: nextLikes, likesCount: nextLikes.length };
          }),
        };
      });
    }

    setPortfolioUpdatingId(`like-${itemId}`);
    try {
      const { data } = await vendorAPI.togglePortfolioLike(vendor._id, itemId);
      updatePortfolioItem(data?.data?.portfolioItem);
    } catch (error) {
      setVendor(previousVendor);
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to update like' });
    } finally {
      setPortfolioUpdatingId('');
    }
  };

  const handlePortfolioComment = async (itemId) => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please login to comment on portfolio content' });
      router.push('/(auth)/login');
      return;
    }

    if (!vendor?._id || !itemId) return;

    const text = (commentDrafts[itemId] || '').trim();
    if (!text) {
      Toast.show({ type: 'error', text1: 'Please write a comment first' });
      return;
    }

    const previousVendor = vendor;
    const optimisticComment = {
      _id: `temp-${Date.now()}`,
      user: { _id: resolveEntityId(user), name: user?.name || 'You' },
      text,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setVendor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        portfolio: (prev.portfolio || []).map((item) => {
          if (item?._id !== itemId) return item;
          const comments = Array.isArray(item.comments) ? [...item.comments, optimisticComment] : [optimisticComment];
          return { ...item, comments, commentsCount: comments.length };
        }),
      };
    });

    setCommentDrafts((prev) => ({ ...prev, [itemId]: '' }));
    setPortfolioUpdatingId(`comment-${itemId}`);
    try {
      const { data } = await vendorAPI.addPortfolioComment(vendor._id, itemId, text);
      updatePortfolioItem(data?.data?.portfolioItem);
      Toast.show({ type: 'success', text1: 'Comment added' });
    } catch (error) {
      setVendor(previousVendor);
      setCommentDrafts((prev) => ({ ...prev, [itemId]: text }));
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to add comment' });
    } finally {
      setPortfolioUpdatingId('');
    }
  };

  const handleDeletePortfolioComment = async (itemId, commentId) => {
    if (!user || !vendor?._id || !itemId || !commentId) return;

    const targetItem = (vendor.portfolio || []).find((item) => item?._id === itemId);
    const targetComment = (targetItem?.comments || []).find((comment) => comment?._id === commentId);

    if (!targetComment || !isCommentOwner(targetComment)) {
      Toast.show({ type: 'error', text1: 'You can only delete your own comment' });
      return;
    }

    Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const previousVendor = vendor;
          setVendor((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              portfolio: (prev.portfolio || []).map((item) => {
                if (item?._id !== itemId) return item;
                const comments = (item.comments || []).filter((comment) => comment?._id !== commentId);
                return { ...item, comments, commentsCount: comments.length };
              }),
            };
          });

          setPortfolioUpdatingId(`delete-${commentId}`);
          try {
            const { data } = await vendorAPI.deletePortfolioComment(vendor._id, itemId, commentId);
            updatePortfolioItem(data?.data?.portfolioItem);
            Toast.show({ type: 'success', text1: 'Comment deleted' });
          } catch (error) {
            setVendor(previousVendor);
            Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to delete comment' });
          } finally {
            setPortfolioUpdatingId('');
          }
        },
      },
    ]);
  };

  const openReportModal = ({ targetType, portfolioItemId = '' }) => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please login to submit a report' });
      router.push('/(auth)/login');
      return;
    }

    setReportModal({ open: true, targetType, portfolioItemId });
    setReportCategory('other');
    setReportReason('');
    setReportDescription('');
  };

  const closeReportModal = () => {
    setReportModal({ open: false, targetType: 'vendor', portfolioItemId: '' });
  };

  const submitReport = async () => {
    if (!vendor?._id) return;
    if (!reportReason.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide a reason' });
      return;
    }

    const payload = {
      targetType: reportModal.targetType,
      targetVendorId: vendor._id,
      reasonCategory: reportCategory,
      reason: reportReason.trim(),
      description: reportDescription.trim(),
    };

    if (reportModal.targetType === 'portfolio_item' && reportModal.portfolioItemId) {
      payload.portfolioItemId = reportModal.portfolioItemId;
    }

    setReportSubmitting(true);
    try {
      await reportAPI.create(payload);
      Toast.show({ type: 'success', text1: 'Report submitted successfully' });
      closeReportModal();
    } catch (error) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to submit report' });
    } finally {
      setReportSubmitting(false);
    }
  };

  const openBookingWithPkg = (pkg) => {
    setBookingData(prev => ({ ...prev, packageId: pkg._id }));
    setSelectedPkg(pkg);
    setBookingModal(true);
  };

  if (loading) return <Loading fullScreen message="Loading vendor details..." />;
  if (!vendor) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const portfolio = vendor.portfolio || [];
  const packages = vendor.packages || [];
  const activeCommentItem = portfolio.find((item) => item?._id === commentsViewer.itemId);
  const activeCommentMeta = getPortfolioMeta(activeCommentItem);
  const activeComments = activeCommentMeta.comments;
  const activeCommentItemId = activeCommentItem?._id;
  const commentPages = Math.max(1, Math.ceil(activeComments.length / COMMENTS_PAGE_SIZE));
  const safeCommentPage = Math.min(commentsViewer.page, commentPages);
  const activeCommentsPageItems = activeComments.slice(
    (safeCommentPage - 1) * COMMENTS_PAGE_SIZE,
    safeCommentPage * COMMENTS_PAGE_SIZE
  );
  const lowestPrice = packages.length > 0
    ? Math.min(...packages.map(p => p.price || 0))
    : null;

  // ── Tab content ──────────────────────────────────
  const renderAboutTab = () => (
    <View style={styles.tabContent}>
      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Us</Text>
        <Text style={styles.aboutText}>{vendor.description || 'No description provided.'}</Text>
        {vendor.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {vendor.tags.map((tag, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Contact Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Details</Text>
        <View style={styles.contactGrid}>
          {vendor.email && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{vendor.email}</Text>
              </View>
            </View>
          )}
          {vendor.phone && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{vendor.phone}</Text>
              </View>
            </View>
          )}
          {vendor.city && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Location</Text>
                <Text style={styles.contactValue}>{vendor.city}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <View style={styles.portfolioGrid}>
            {portfolio.map((item, idx) => {
              const itemId = item?._id;
              const { likesCount, commentsCount } = getPortfolioMeta(item);
              const likedByCurrentUser = isCurrentUserLiked(item);
              const isVideo = isVideoItem(item);

              return (
              <TouchableOpacity
                key={itemId || idx}
                style={styles.portfolioItem}
                activeOpacity={0.85}
                onPress={() => (itemId ? openCommentsViewer(itemId) : setLightbox({ visible: true, index: idx }))}
              >
                {!isVideo ? (
                  <Image
                    source={{ uri: item.url || item }}
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <MobileVideo
                      uri={item.url || item}
                      style={styles.portfolioImage}
                      contentFit="cover"
                      isMuted
                      shouldPlay
                      isLooping
                    />
                    <View style={styles.portfolioVideoBadge}>
                      <Ionicons name="play" size={10} color="#fff" />
                      <Text style={styles.portfolioVideoBadgeText}>Video</Text>
                    </View>
                  </>
                )}

                {itemId && (
                  <TouchableOpacity
                    style={styles.portfolioReportBtn}
                    onPress={() => openReportModal({ targetType: 'portfolio_item', portfolioItemId: itemId })}
                  >
                    <Ionicons name="flag-outline" size={14} color="#fff" />
                  </TouchableOpacity>
                )}

                <View style={styles.portfolioSocialRow}>
                  <View style={[styles.portfolioSocialPill, likedByCurrentUser && styles.portfolioSocialPillLiked]}>
                    <Ionicons
                      name={likedByCurrentUser ? 'heart' : 'heart-outline'}
                      size={13}
                      color={likedByCurrentUser ? '#be123c' : theme.colors.textSecondary}
                    />
                    <Text style={[styles.portfolioSocialText, likedByCurrentUser && styles.portfolioSocialTextLiked]}>{likesCount}</Text>
                  </View>
                  <View style={styles.portfolioSocialPill}>
                    <Ionicons name="chatbubble-outline" size={13} color={theme.colors.textSecondary} />
                    <Text style={styles.portfolioSocialText}>{commentsCount}</Text>
                  </View>
                </View>

                <View style={styles.portfolioOverlay} pointerEvents="none">
                  <Ionicons name="expand-outline" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  const renderPackagesTab = () => (
    <View style={styles.tabContent}>
      {packages.length > 0 ? (
        packages.map((pkg) => {
          const isSelected = bookingData.packageId === pkg._id;
          return (
            <TouchableOpacity
              key={pkg._id}
              style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
              activeOpacity={0.85}
              onPress={() => setBookingData(prev => ({ ...prev, packageId: pkg._id }))}
            >
              {isSelected && (
                <View style={styles.pkgCheckBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              <View style={styles.pkgHeader}>
                <Text style={styles.pkgName}>{pkg.name}</Text>
                <View style={styles.pkgPricePill}>
                  <Text style={styles.pkgPriceText}>Rs. {pkg.price?.toLocaleString()}</Text>
                </View>
              </View>
              {pkg.description && (
                <Text style={styles.pkgDesc}>{pkg.description}</Text>
              )}
              {pkg.features?.length > 0 && (
                <View style={styles.pkgFeatures}>
                  {pkg.features.map((f, idx) => (
                    <View key={idx} style={styles.pkgFeatureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                      <Text style={styles.pkgFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.pkgBookBtn}
                onPress={() => openBookingWithPkg(pkg)}
              >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.pkgBookBtnText}>Book This Package</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pricetags-outline" size={40} color={theme.colors.border} />
          <Text style={styles.emptyText}>No packages listed yet</Text>
        </View>
      )}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {/* Rating summary */}
      <View style={styles.ratingSummary}>
        <View style={styles.ratingBig}>
          <Text style={styles.ratingBigNumber}>
            {(vendor.ratingsAverage || 0).toFixed(1)}
          </Text>
          <View style={styles.ratingBigStars}>
            {renderStars(vendor.ratingsAverage || 0, 16)}
          </View>
          <Text style={styles.ratingBigCount}>
            {vendor.ratingsCount || 0} review{(vendor.ratingsCount || 0) !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.writeReviewBtn}
          onPress={() => setReviewModal(true)}
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.writeReviewBtnText}>Write a Review</Text>
        </TouchableOpacity>
      </View>

      {/* Reviews list */}
      {reviews.length > 0 ? (
        reviews.map((review) => (
          <View key={review._id} style={styles.reviewCard}>
            <View style={styles.reviewCardHead}>
              <View style={styles.reviewerInfo}>
                <View style={styles.reviewerAvatar}>
                  <Text style={styles.reviewerAvatarText}>
                    {(review.user?.name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.reviewerName}>{review.user?.name || 'Guest'}</Text>
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.reviewRatingBadge}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.reviewRatingNum}>{review.rating}</Text>
              </View>
            </View>
            {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.border} />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share your experience!</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Hero ─────────────────────────────────────── */}
        <View style={styles.hero}>
          <Image
            source={{
              uri: vendor.coverImage?.url || 'https://placehold.co/800x400/1a1a2e/ffffff?text=No+Cover',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)']}
            locations={[0, 0.4, 1]}
            style={styles.heroGradient}
          />

          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => openReportModal({ targetType: 'vendor' })}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Hero content */}
          <View style={styles.heroContent}>
            <View style={styles.heroCatChip}>
              <Text style={styles.heroCatText}>{formatCategory(vendor.category)}</Text>
            </View>
            <Text style={styles.heroTitle}>{vendor.businessName}</Text>
            <View style={styles.heroMeta}>
              {vendor.city && (
                <View style={styles.heroMetaItem}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMetaText}>{vendor.city}</Text>
                </View>
              )}
              <View style={styles.heroMetaItem}>
                {renderStars(vendor.ratingsAverage || 0, 13)}
                <Text style={styles.heroMetaText}>
                  {(vendor.ratingsAverage || 0).toFixed(1)} ({vendor.ratingsCount || 0})
                </Text>
              </View>
              {vendor.isVerified && (
                <View style={styles.heroVerifiedChip}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  <Text style={styles.heroVerifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Stats Strip ──────────────────────────────── */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: GOLD }]}>
              {(vendor.ratingsAverage || 0).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{vendor.ratingsCount || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{packages.length}</Text>
            <Text style={styles.statLabel}>Packages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{portfolio.length}</Text>
            <Text style={styles.statLabel}>Portfolio</Text>
          </View>
        </View>

        {/* ── Tab Bar ──────────────────────────────────── */}
        <View style={styles.tabBar}>
          {['about', 'packages', 'reviews'].map((tab) => {
            const active = activeTab === tab;
            const icons = { about: 'information-circle-outline', packages: 'pricetags-outline', reviews: 'chatbubbles-outline' };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={icons[tab]}
                  size={18}
                  color={active ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content ──────────────────────────────── */}
        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'packages' && renderPackagesTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
      </Animated.ScrollView>

      {/* ── Sticky Bottom Bar ──────────────────────────── */}
      <View style={styles.bottomBar}>
        <View>
          {lowestPrice !== null && (
            <>
              <Text style={styles.bottomBarLabel}>Starting from</Text>
              <Text style={styles.bottomBarPrice}>Rs. {lowestPrice.toLocaleString()}</Text>
            </>
          )}
          {lowestPrice === null && <Text style={styles.bottomBarLabel}>Contact for pricing</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.bottomBarBtn, { backgroundColor: theme.colors.info }]}
            onPress={async () => {
              if (!user) {
                Toast.show({ type: 'error', text1: 'Please login to message a vendor' });
                return;
              }
              try {
                const { data } = await chatAPI.getOrCreateConversation(vendor._id);
                router.push(`/chat/${data.data._id}`);
              } catch (err) {
                Toast.show({ type: 'error', text1: 'Could not start conversation' });
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBarBtn}
            onPress={() => setBookingModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text style={styles.bottomBarBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Booking Modal ──────────────────────────────── */}
      <Modal
        visible={bookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBookingModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Handle */}
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Create Booking</Text>
              {selectedPkg && (
                <Text style={styles.modalSubtitle}>{selectedPkg.name} — Rs. {selectedPkg.price?.toLocaleString()}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setBookingModal(false)}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Package selector (if no pkg already selected) */}
            {!selectedPkg && packages.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Select Package *</Text>
                {packages.map((pkg) => {
                  const sel = bookingData.packageId === pkg._id;
                  return (
                    <TouchableOpacity
                      key={pkg._id}
                      style={[styles.modalPkgOption, sel && styles.modalPkgOptionSel]}
                      onPress={() => setBookingData(prev => ({ ...prev, packageId: pkg._id }))}
                    >
                      <View style={styles.modalPkgRow}>
                        <Text style={[styles.modalPkgName, sel && { color: theme.colors.primary }]}>{pkg.name}</Text>
                        <Text style={styles.modalPkgPrice}>Rs. {pkg.price?.toLocaleString()}</Text>
                      </View>
                      {sel && (
                        <View style={styles.modalPkgCheck}>
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Date & Time */}
            <View style={styles.modalRow}>
              <View style={styles.modalCol}>
                <Text style={styles.modalLabel}>Event Date *</Text>
                <TouchableOpacity
                  style={styles.modalPickerBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={bookingData.eventDate ? theme.colors.primary : '#94a3b8'}
                  />
                  <Text style={[styles.modalPickerText, !bookingData.eventDate && styles.modalPickerPlaceholder]}>
                    {bookingData.eventDate ? fmtDisplayDate(bookingData.eventDate) : 'Pick date'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalCol}>
                <Text style={styles.modalLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.modalPickerBtn}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={bookingData.eventTime ? theme.colors.primary : '#94a3b8'}
                  />
                  <Text style={[styles.modalPickerText, !bookingData.eventTime && styles.modalPickerPlaceholder]}>
                    {bookingData.eventTime || 'Pick time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Guest Count *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 200"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={bookingData.guestCount}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, guestCount: text }))}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Special Requirements / Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Any specific requests or details..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={bookingData.notes}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, notes: text }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, submitting && { opacity: 0.65 }]}
              onPress={handleBooking}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtnGradient}
              >
                {submitting ? (
                  <Text style={styles.confirmBtnText}>Submitting...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Time Picker Bottom Sheet ──────────────────── */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const sel = bookingData.eventTime === item;
                return (
                  <TouchableOpacity
                    style={[styles.timeOption, sel && styles.timeOptionSel]}
                    onPress={() => {
                      setBookingData(prev => ({ ...prev, eventTime: item }));
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.timeOptionText, sel && styles.timeOptionTextSel]}>{item}</Text>
                    {sel && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Review Modal ──────────────────────────────── */}
      <Modal
        visible={reviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReviewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <Text style={styles.modalSubtitle}>{vendor.businessName}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setReviewModal(false)}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Your Rating</Text>
              <View style={styles.starPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewData(prev => ({ ...prev, rating: star }))}
                    style={styles.starPickerBtn}
                  >
                    <Ionicons
                      name={star <= reviewData.rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= reviewData.rating ? '#f59e0b' : '#d1d5db'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Summarise your experience"
                placeholderTextColor="#94a3b8"
                value={reviewData.title}
                onChangeText={(text) => setReviewData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Comment</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Share the details of your experience..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={reviewData.comment}
                onChangeText={(text) => setReviewData(prev => ({ ...prev, comment: text }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, submittingReview && { opacity: 0.65 }]}
              onPress={handleReview}
              disabled={submittingReview}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtnGradient}
              >
                {submittingReview ? (
                  <Text style={styles.confirmBtnText}>Submitting...</Text>
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Submit Review</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Portfolio Comments Viewer ───────────────── */}
      <Modal
        visible={commentsViewer.open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCommentsViewer}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHandleWrap}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Portfolio Comments</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeCommentsViewer}>
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {!activeCommentItem ? (
            <View style={styles.commentsEmptyWrap}>
              <Text style={styles.emptyText}>Portfolio item not found</Text>
            </View>
          ) : (
            <View style={styles.commentsViewerBody}>
              {!isVideoItem(activeCommentItem) ? (
                <Image
                  source={{ uri: activeCommentItem?.url }}
                  style={styles.commentsMedia}
                  resizeMode="contain"
                />
              ) : (
                <MobileVideo
                  uri={activeCommentItem?.url}
                  style={styles.commentsMedia}
                  contentFit="contain"
                  nativeControls
                  shouldPlay
                />
              )}

              <View style={styles.commentsActionRow}>
                <TouchableOpacity
                  style={[styles.commentsLikeBtn, isCurrentUserLiked(activeCommentItem) && styles.commentsLikeBtnActive]}
                  onPress={() => handlePortfolioLike(activeCommentItemId)}
                  disabled={!activeCommentItemId || portfolioUpdatingId === `like-${activeCommentItemId}`}
                >
                  <Ionicons
                    name={isCurrentUserLiked(activeCommentItem) ? 'heart' : 'heart-outline'}
                    size={16}
                    color={isCurrentUserLiked(activeCommentItem) ? '#be123c' : theme.colors.textSecondary}
                  />
                  <Text style={[styles.commentsActionText, isCurrentUserLiked(activeCommentItem) && styles.commentsActionTextActive]}>
                    {activeCommentMeta.likesCount}
                  </Text>
                </TouchableOpacity>

                <View style={styles.commentsCountPill}>
                  <Ionicons name="chatbubble-outline" size={15} color={theme.colors.textSecondary} />
                  <Text style={styles.commentsActionText}>{activeCommentMeta.commentsCount}</Text>
                </View>

                <TouchableOpacity
                  style={styles.commentsReportBtn}
                  onPress={() => openReportModal({ targetType: 'portfolio_item', portfolioItemId: activeCommentItemId })}
                >
                  <Ionicons name="flag-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.commentsReportBtnText}>Report</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.commentsComposer}>
                <TextInput
                  style={styles.commentsInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#94a3b8"
                  value={activeCommentItemId ? (commentDrafts[activeCommentItemId] || '') : ''}
                  onChangeText={(text) => {
                    if (!activeCommentItemId) return;
                    setCommentDrafts((prev) => ({ ...prev, [activeCommentItemId]: text }));
                  }}
                  maxLength={500}
                />
                <TouchableOpacity
                  style={styles.commentsPostBtn}
                  onPress={() => handlePortfolioComment(activeCommentItemId)}
                  disabled={!activeCommentItemId || portfolioUpdatingId === `comment-${activeCommentItemId}`}
                >
                  <Text style={styles.commentsPostBtnText}>Post</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                {activeCommentsPageItems.length === 0 ? (
                  <Text style={styles.commentsEmptyText}>No comments yet.</Text>
                ) : (
                  activeCommentsPageItems.map((comment) => (
                    <View key={comment._id} style={[styles.commentItem, comment.isOptimistic && styles.commentItemPending]}>
                      <View style={styles.commentItemHead}>
                        <Text style={styles.commentUser}>{getCommentDisplayName(comment)}</Text>
                        <View style={styles.commentMetaRight}>
                          <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
                          {isCommentOwner(comment) && !comment.isOptimistic && (
                            <TouchableOpacity
                              style={styles.commentDeleteBtn}
                              onPress={() => handleDeletePortfolioComment(activeCommentItemId, comment._id)}
                              disabled={portfolioUpdatingId === `delete-${comment._id}`}
                            >
                              <Text style={styles.commentDeleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {commentPages > 1 && (
                <View style={styles.commentsPagination}>
                  <TouchableOpacity
                    style={[styles.commentsPageBtn, safeCommentPage <= 1 && styles.commentsPageBtnDisabled]}
                    onPress={() => setCommentsViewer((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={safeCommentPage <= 1}
                  >
                    <Text style={styles.commentsPageBtnText}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.commentsPageText}>{safeCommentPage} / {commentPages}</Text>

                  <TouchableOpacity
                    style={[styles.commentsPageBtn, safeCommentPage >= commentPages && styles.commentsPageBtnDisabled]}
                    onPress={() => setCommentsViewer((prev) => ({ ...prev, page: Math.min(commentPages, prev.page + 1) }))}
                    disabled={safeCommentPage >= commentPages}
                  >
                    <Text style={styles.commentsPageBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* ── Report Modal ────────────────────────────── */}
      <Modal
        visible={reportModal.open}
        animationType="slide"
        transparent
        onRequestClose={closeReportModal}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeReportModal}>
          <TouchableOpacity activeOpacity={1} style={styles.reportSheet} onPress={() => {}}>
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Submit Report</Text>
              <TouchableOpacity onPress={closeReportModal}>
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reportBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.reportLabel}>Reason Category</Text>
              <View style={styles.reportReasonGrid}>
                {reportReasonOptions.map((option) => {
                  const selected = reportCategory === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.reportReasonChip, selected && styles.reportReasonChipSelected]}
                      onPress={() => setReportCategory(option.value)}
                    >
                      <Text style={[styles.reportReasonChipText, selected && styles.reportReasonChipTextSelected]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.reportLabel}>Reason *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Describe the issue in one line"
                placeholderTextColor="#94a3b8"
                value={reportReason}
                onChangeText={setReportReason}
                maxLength={500}
              />

              <Text style={[styles.reportLabel, { marginTop: 12 }]}>Additional Details</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Optional details to help moderation"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={reportDescription}
                onChangeText={setReportDescription}
                maxLength={2000}
              />

              <TouchableOpacity
                style={[styles.confirmBtn, reportSubmitting && { opacity: 0.65 }]}
                onPress={submitReport}
                disabled={reportSubmitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtnGradient}
                >
                  <Ionicons name="flag" size={16} color="#fff" />
                  <Text style={styles.confirmBtnText}>{reportSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Portfolio Lightbox ─────────────────────────── */}
      <Modal
        visible={lightbox.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox({ visible: false, index: 0 })}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightbox({ visible: false, index: 0 })}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {!isVideoItem(portfolio[lightbox.index]) ? (
            <Image
              source={{ uri: portfolio[lightbox.index]?.url || portfolio[lightbox.index] }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          ) : (
            <MobileVideo
              uri={portfolio[lightbox.index]?.url || portfolio[lightbox.index]}
              style={styles.lightboxVideo}
              contentFit="contain"
              nativeControls
              shouldPlay
            />
          )}

          {portfolio.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.lightboxNav, styles.lightboxNavLeft]}
                onPress={() => setLightbox(lb => ({ ...lb, index: (lb.index - 1 + portfolio.length) % portfolio.length }))}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lightboxNav, styles.lightboxNavRight]}
                onPress={() => setLightbox(lb => ({ ...lb, index: (lb.index + 1) % portfolio.length }))}
              >
                <Ionicons name="chevron-forward" size={28} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.lightboxCaption}>
            <Text style={styles.lightboxCaptionText}>
              {lightbox.index + 1} / {portfolio.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scrollView: {
    flex: 1,
  },

  // ── Hero ──────────────────────────────
  hero: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 44) + 8,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  reportBtn: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 44) + 8,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroCatChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  heroCatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  heroVerifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  heroVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // ── Stats Strip ────────────────────────
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },

  // ── Tab Bar ────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },

  // ── Tab Content ────────────────────────
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Section ────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },

  // ── About ──────────────────────────────
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: 'rgba(215,56,94,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // ── Contact ────────────────────────────
  contactGrid: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  contactIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(215,56,94,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },

  // ── Portfolio ──────────────────────────
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioItem: {
    width: (SCREEN_WIDTH - 48) / 3,
    height: (SCREEN_WIDTH - 48) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  portfolioVideoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(17,24,39,0.72)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  portfolioVideoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  portfolioReportBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(17,24,39,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  portfolioSocialRow: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  portfolioSocialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  portfolioSocialPillLiked: {
    borderColor: '#fecdd3',
    backgroundColor: '#ffe4e6',
  },
  portfolioSocialText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  portfolioSocialTextLiked: {
    color: '#be123c',
  },
  portfolioOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },

  // ── Package Cards ──────────────────────
  pkgCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  pkgCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#fef2f4',
  },
  pkgCheckBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pkgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 28,
  },
  pkgName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  pkgPricePill: {
    backgroundColor: 'rgba(215,56,94,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pkgPriceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  pkgDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  pkgFeatures: {
    marginBottom: 14,
    gap: 6,
  },
  pkgFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pkgFeatureText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  pkgBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pkgBookBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ── Reviews ────────────────────────────
  ratingSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  ratingBig: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBigNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: GOLD,
    marginBottom: 4,
  },
  ratingBigStars: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  ratingBigCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  writeReviewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  reviewCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BERRY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviewDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewRatingNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d97706',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },

  // ── Empty State ────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  // ── Sticky Bottom Bar ─────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  bottomBarLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bottomBarPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  bottomBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomBarBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },

  // ── Modals ─────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: CREAM,
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 18,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  modalCol: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: '#fff',
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  modalPickerText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  modalPickerPlaceholder: {
    color: '#94a3b8',
  },
  modalPkgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  modalPkgOptionSel: {
    borderColor: theme.colors.primary,
    backgroundColor: '#fef2f4',
  },
  modalPkgRow: {
    flex: 1,
  },
  modalPkgName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  modalPkgPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalPkgCheck: {
    marginLeft: 12,
  },
  confirmBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 30,
  },
  confirmBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  starPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starPickerBtn: {
    padding: 4,
  },

  // ── Comments Viewer ───────────────────
  commentsEmptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  commentsViewerBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  commentsMedia: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    backgroundColor: '#111827',
    marginTop: 12,
  },
  commentsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  commentsLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#f3d1d9',
    backgroundColor: '#fff7f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  commentsLikeBtnActive: {
    borderColor: '#fecdd3',
    backgroundColor: '#ffe4e6',
  },
  commentsCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  commentsActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  commentsActionTextActive: {
    color: '#be123c',
  },
  commentsReportBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#f5c2cf',
    backgroundColor: '#fff1f5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  commentsReportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  commentsComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  commentsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fff',
    color: theme.colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentsPostBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentsPostBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  commentsList: {
    flex: 1,
    marginTop: 12,
  },
  commentsEmptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  commentItem: {
    borderWidth: 1,
    borderColor: '#f0e8e5',
    backgroundColor: '#fdfaf9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  commentItemPending: {
    opacity: 0.72,
  },
  commentItemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  commentMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentTime: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  commentDeleteBtn: {
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  commentDeleteBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#be123c',
  },
  commentText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4b5563',
  },
  commentsPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  commentsPageBtn: {
    borderWidth: 1,
    borderColor: '#e5d8d6',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  commentsPageBtnDisabled: {
    opacity: 0.45,
  },
  commentsPageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  commentsPageText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },

  // ── Report Sheet ──────────────────────
  reportSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    maxHeight: '84%',
  },
  reportBody: {
    paddingHorizontal: 20,
  },
  reportLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reportReasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reportReasonChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reportReasonChipSelected: {
    borderColor: '#f5c2cf',
    backgroundColor: '#fff1f5',
  },
  reportReasonChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  reportReasonChipTextSelected: {
    color: theme.colors.primary,
  },

  // ── Time Sheet ─────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeOptionSel: {
    backgroundColor: '#fef2f4',
  },
  timeOptionText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  timeOptionTextSel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // ── Lightbox ───────────────────────────
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 44) + 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 6,
  },
  lightboxVideo: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 6,
    backgroundColor: '#111827',
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    zIndex: 10,
  },
  lightboxNavLeft: {
    left: 12,
  },
  lightboxNavRight: {
    right: 12,
  },
  lightboxCaption: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lightboxCaptionText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },

  // ── Error ──────────────────────────────
  errorContainer: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
