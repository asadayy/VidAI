import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { chatAPI } from '../../api/chat';

const PRIMARY = theme.colors.primary;
const PRIMARY_DARK = theme.colors.primaryDark;
const CHAT_BG = '#f9fafb';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (isSameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Contact Info Side Panel ── */
function ContactInfoPanel({ conversation, userRole, onClose, slideAnim, onViewVendor }) {
  if (!conversation) return null;

  const isVendor = userRole === 'vendor';
  const other = conversation.otherParticipant;
  const vendor = conversation.vendor;
  const name = isVendor ? (other?.name || 'Customer') : (vendor?.businessName || 'Vendor');
  const avatar = isVendor ? other?.avatar : vendor?.coverImage;
  const avatarUrl = avatar?.url || avatar;
  const email = other?.email;
  const role = other?.role;
  const phone = other?.phone;
  const city = other?.city;
  const area = other?.area;
  const ob = other?.onboarding;
  const category = vendor?.category;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  const fmtCurrency = (n) => n ? `PKR ${Number(n).toLocaleString()}` : null;
  const locationParts = [area, city].filter(Boolean);
  const location = locationParts.length ? locationParts.join(', ') : null;

  const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
      <View style={panelStyles.row}>
        <Ionicons name={icon} size={16} color={PRIMARY} style={panelStyles.rowIcon} />
        <View style={panelStyles.rowContent}>
          <Text style={panelStyles.rowLabel}>{label}</Text>
          <Text style={panelStyles.rowValue}>{value}</Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[panelStyles.overlay, { transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] }) }] }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Panel Header */}
        <View style={panelStyles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={panelStyles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={panelStyles.headerTitle}>Contact Info</Text>
          <View style={{ width: 36 }} />
        </View>

          {/* Profile Section */}
          <View style={panelStyles.profile}>
            <View style={panelStyles.profileAvatarLarge}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={panelStyles.profileImg} />
              ) : (
                <Text style={panelStyles.profileInitials}>{getInitials(name)}</Text>
              )}
            </View>
            <Text style={panelStyles.profileName}>{name}</Text>
            {email && <Text style={panelStyles.profileEmail}>{email}</Text>}
            {role && (
              <View style={panelStyles.roleBadge}>
                <Text style={panelStyles.roleBadgeText}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
              </View>
            )}
          </View>

          {/* View Vendor Profile button (for customers) */}
          {!isVendor && vendor?.slug && (
            <TouchableOpacity style={panelStyles.viewProfileBtn} onPress={onViewVendor} activeOpacity={0.7}>
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={panelStyles.viewProfileBtnText}>View Vendor Profile</Text>
            </TouchableOpacity>
          )}

          {/* Contact */}
          <View style={panelStyles.section}>
            <Text style={panelStyles.sectionTitle}>Contact</Text>
            <InfoRow icon="mail-outline" label="Email" value={email} />
            <InfoRow icon="call-outline" label="Phone" value={phone} />
            <InfoRow icon="location-outline" label="Location" value={location} />
          </View>

          {/* Event Details (visible to vendors) */}
          {isVendor && ob && (
            <View style={panelStyles.section}>
              <Text style={panelStyles.sectionTitle}>Event Details</Text>
              <InfoRow icon="heart-outline" label="Event Type" value={ob.eventTypes?.join(', ')} />
              <InfoRow icon="calendar-outline" label="Event Date" value={fmtDate(ob.eventDate)} />
              <InfoRow icon="navigate-outline" label="Wedding Location" value={ob.weddingLocation} />
              <InfoRow icon="business-outline" label="Venue Type" value={ob.venueType} />
              <InfoRow icon="people-outline" label="Guest Count" value={ob.guestCount} />
              <InfoRow icon="restaurant-outline" label="Food Preference" value={ob.foodPreference} />
              <InfoRow icon="wallet-outline" label="Total Budget" value={fmtCurrency(ob.totalBudget)} />
            </View>
          )}

          {/* Vendor category (visible to customers) */}
          {!isVendor && category && (
            <View style={panelStyles.section}>
              <Text style={panelStyles.sectionTitle}>Vendor</Text>
              <InfoRow icon="star-outline" label="Category" value={category} />
            </View>
          )}

        {/* Member Since */}
        {other?.createdAt && (
          <View style={panelStyles.section}>
            <InfoRow icon="time-outline" label="Member Since" value={new Date(other.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

/* ── Main Chat Screen ── */
export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isOnline } = useSocket();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [headerOnline, setHeaderOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef(null);

  // Contact info panel
  const [showInfo, setShowInfo] = useState(false);
  const infoPanelAnim = useRef(new Animated.Value(0)).current;

  const isVendorUser = user?.role === 'vendor';
  const headerName = isVendorUser
    ? (conversation?.otherParticipant?.name || 'Customer')
    : (conversation?.vendor?.businessName || 'Chat');

  // Avatar URLs
  const otherAvatarUrl = isVendorUser
    ? (conversation?.otherParticipant?.avatar?.url || null)
    : (conversation?.vendor?.coverImage?.url || null);
  const myAvatarUrl = user?.avatar?.url || null;

  const openInfoPanel = () => {
    setShowInfo(true);
    Animated.timing(infoPanelAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };
  const closeInfoPanel = () => {
    Animated.timing(infoPanelAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowInfo(false));
  };
  const handleViewVendor = () => {
    closeInfoPanel();
    const slug = conversation?.vendor?.slug;
    if (slug) router.push(`/vendors/${slug}`);
  };

  // Load messages — API returns chronological, we reverse for inverted FlatList
  const loadMessages = useCallback(async (cursor) => {
    try {
      const { data } = await chatAPI.getMessages(conversationId, cursor);
      const msgs = data.data;
      setHasMore(data.hasMore ?? msgs.length === 30);
      const reversed = [...msgs].reverse();
      if (cursor) {
        setMessages((prev) => [...prev, ...reversed]);
      } else {
        setMessages(reversed);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Get conversation info for header + avatars
  useEffect(() => {
    (async () => {
      try {
        const { data } = await chatAPI.getConversations();
        const conv = data.data.find((c) => c._id === conversationId);
        if (conv) {
          setConversation(conv);
          const otherId = conv.otherParticipant?._id;
          if (otherId && isOnline) setHeaderOnline(isOnline(otherId));
        }
      } catch { /* ignore */ }
    })();
  }, [conversationId, isOnline]);

  // Mark as read
  useEffect(() => {
    chatAPI.markAsRead(conversationId).catch(() => {});
  }, [conversationId, messages.length]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_conversation', conversationId);

    const handleNewMessage = (payload) => {
      const msg = payload.message || payload;
      if (msg.conversation === conversationId || msg.conversation?._id === conversationId) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !m._optimistic || String(m.sender?._id) !== String(msg.sender?._id) || m.content !== msg.content);
          if (filtered.some((m) => m._id === msg._id)) return filtered;
          return [msg, ...filtered];
        });
        setTyping(false);
        chatAPI.markAsRead(conversationId).catch(() => {});
      }
    };

    const handleTyping = ({ conversationId: cId, userId: uid }) => {
      const myId = user?._id || user?.id;
      if (cId === conversationId && uid !== myId) setTyping(true);
    };

    const handleStopTyping = ({ conversationId: cId, userId: uid }) => {
      const myId = user?._id || user?.id;
      if (cId === conversationId && uid !== myId) setTyping(false);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, conversationId, user?._id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    socket?.emit('stop_typing', conversationId);

    const optimistic = {
      _id: `temp-${Date.now()}`,
      content: trimmed,
      sender: { _id: user._id || user.id },
      createdAt: new Date().toISOString(),
      messageType: 'text',
      _optimistic: true,
    };
    setMessages((prev) => [optimistic, ...prev]);
    setText('');

    try {
      socket?.emit('send_message', { conversationId, content: trimmed, messageType: 'text' });
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (val) => {
    setText(val);
    if (socket && val.trim()) {
      socket.emit('typing', conversationId);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => socket.emit('stop_typing', conversationId), 2000);
    }
  };

  const loadOlder = () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[messages.length - 1];
    loadMessages(oldest.createdAt);
  };

  /* ── Avatar helper ── */
  const AvatarCircle = ({ uri, name, size = 30 }) => (
    <View style={[styles.msgAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.msgAvatarText, { fontSize: size * 0.4 }]}>{getInitials(name)}</Text>
      )}
    </View>
  );

  const renderMessage = ({ item, index }) => {
    const userId = user?._id || user?.id;
    const senderId = item.sender?._id || item.sender;
    const isMe = String(senderId) === String(userId);
    const isSystem = item.messageType === 'system';

    // Date separator
    let showDate = false;
    const next = messages[index + 1];
    if (!next || !isSameDay(item.createdAt, next.createdAt)) showDate = true;

    // Collapse avatar if same sender as the message above (previous in time = index - 1 in inverted)
    const prev = messages[index - 1];
    const sameSenderAsPrev = prev && String(prev.sender?._id || prev.sender) === String(senderId) && isSameDay(item.createdAt, prev.createdAt);

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>{formatDateLabel(item.createdAt)}</Text>
          </View>
        )}
        {isSystem ? (
          <View style={styles.systemMsg}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        ) : (
          <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
            {/* Other user's avatar */}
            {!isMe && (
              sameSenderAsPrev
                ? <View style={styles.avatarSpacer} />
                : <AvatarCircle uri={otherAvatarUrl} name={headerName} size={30} />
            )}
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                  {formatTime(item.createdAt)}
                </Text>
                {isMe && (
                  <Ionicons
                    name={item._optimistic ? 'time-outline' : 'checkmark-done'}
                    size={14}
                    color={item._optimistic ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            </View>
            {/* My avatar */}
            {isMe && (
              sameSenderAsPrev
                ? <View style={styles.avatarSpacer} />
                : <AvatarCircle uri={myAvatarUrl} name={user?.name || 'Me'} size={30} />
            )}
          </View>
        )}
      </>
    );
  };

  const ListFooterContent = () => {
    if (loadingMore) return <ActivityIndicator style={{ padding: 12 }} color={PRIMARY} />;
    if (!hasMore && messages.length > 0) {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.startedText}>Conversation started with {headerName}</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Hide default expo-router header */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      {/* ── Custom Top Panel ── */}
      <View style={styles.topPanel}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.topBack}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Vendor/Customer Avatar — tappable to open info panel */}
        <TouchableOpacity onPress={openInfoPanel} activeOpacity={0.7} style={styles.topAvatarWrap}>
          <View style={styles.topAvatar}>
            {otherAvatarUrl ? (
              <Image source={{ uri: otherAvatarUrl }} style={styles.topAvatarImg} />
            ) : (
              <Text style={styles.topAvatarInitials}>{getInitials(headerName)}</Text>
            )}
          </View>
          {headerOnline && <View style={styles.topOnlineDot} />}
        </TouchableOpacity>

        {/* Name + Status */}
        <TouchableOpacity style={styles.topInfo} onPress={openInfoPanel} activeOpacity={0.7}>
          <Text style={styles.topName} numberOfLines={1}>{headerName}</Text>
          {typing ? (
            <Text style={styles.topStatus}>typing...</Text>
          ) : headerOnline ? (
            <Text style={styles.topStatus}>online</Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.messageList}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        ListFooterComponent={<ListFooterContent />}
        ListHeaderComponent={
          typing ? (
            <View style={[styles.bubbleRow, styles.bubbleRowOther]}>
              <AvatarCircle uri={otherAvatarUrl} name={headerName} size={30} />
              <View style={[styles.bubble, styles.bubbleOther, styles.typingBubble]}>
                <Text style={styles.typingDots}>● ● ●</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* ── Input Bar ── */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Contact Info Side Panel ── */}
      {showInfo && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ContactInfoPanel
            conversation={conversation}
            userRole={user?.role}
            onClose={closeInfoPanel}
            slideAnim={infoPanelAnim}
            onViewVendor={handleViewVendor}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ── Contact Info Panel Styles ── */
const panelStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 12,
    backgroundColor: PRIMARY,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  profile: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  profileAvatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  profileImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  profileInitials: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: `${PRIMARY}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  viewProfileBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rowIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 1,
  },
  rowValue: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
});

/* ── Main Styles ── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CHAT_BG,
  },
  /* ── Custom Top Panel ── */
  topPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  topBack: {
    padding: 6,
    marginRight: 2,
  },
  topAvatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  topAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  topAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  topAvatarInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  topOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  topInfo: {
    flex: 1,
    marginRight: 10,
  },
  topName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  topStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  /* ── Messages ── */
  messageList: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateSep: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateSepText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: '600',
  },
  systemMsg: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  startedText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 1.5,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  msgAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  avatarSpacer: {
    width: 38,  // 30 avatar + 4+4 margin
  },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 8,
  },
  bubbleMe: {
    backgroundColor: PRIMARY,
    borderTopRightRadius: 0,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bubbleText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingBubble: {
    paddingVertical: 10,
  },
  typingDots: {
    fontSize: 14,
    color: '#667781',
    letterSpacing: 2,
  },
  /* ── Input Bar ── */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 6,
    backgroundColor: CHAT_BG,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: '#111',
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
