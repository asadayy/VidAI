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
  const [headerName, setHeaderName] = useState('Chat');
  const [headerOnline, setHeaderOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef(null);

  // Load messages — API returns chronological, we reverse for inverted FlatList
  const loadMessages = useCallback(async (cursor) => {
    try {
      const { data } = await chatAPI.getMessages(conversationId, cursor);
      const msgs = data.data;
      setHasMore(data.hasMore ?? msgs.length === 30);
      // API returns oldest→newest, inverted list needs newest→oldest
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

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Get conversation info for header
  useEffect(() => {
    (async () => {
      try {
        const { data } = await chatAPI.getConversations();
        const conv = data.data.find((c) => c._id === conversationId);
        if (conv) {
          setHeaderName(conv.vendor?.businessName || conv.otherParticipant?.name || 'Chat');
          const otherId = conv.otherParticipant?._id;
          if (otherId && isOnline) setHeaderOnline(isOnline(otherId));
        }
      } catch (e) {
        // ignore
      }
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
      // Server sends { message: { ... } }
      const msg = payload.message || payload;
      if (msg.conversation === conversationId || msg.conversation?._id === conversationId) {
        setMessages((prev) => {
          // Remove optimistic temp message if this is our own message
          const filtered = prev.filter((m) => !m._optimistic || String(m.sender?._id) !== String(msg.sender?._id) || m.content !== msg.content);
          // Avoid duplicates
          if (filtered.some((m) => m._id === msg._id)) return filtered;
          return [msg, ...filtered];
        });
        setTyping(false);
        chatAPI.markAsRead(conversationId).catch(() => {});
      }
    };

    const handleTyping = ({ conversationId: cId, userId }) => {
      const myId = user?._id || user?.id;
      if (cId === conversationId && userId !== myId) {
        setTyping(true);
      }
    };

    const handleStopTyping = ({ conversationId: cId, userId }) => {
      const myId = user?._id || user?.id;
      if (cId === conversationId && userId !== myId) {
        setTyping(false);
      }
    };

    socket.on('new_message', handleNewMessage);
    // Server emits user_typing / user_stop_typing
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
      socket?.emit('send_message', {
        conversationId,
        content: trimmed,
        messageType: 'text',
      });
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
      typingTimeout.current = setTimeout(() => {
        socket.emit('stop_typing', conversationId);
      }, 2000);
    }
  };

  const loadOlder = () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[messages.length - 1];
    loadMessages(oldest.createdAt);
  };

  const renderMessage = ({ item, index }) => {
    const userId = user?._id || user?.id;
    const senderId = item.sender?._id || item.sender;
    const isMe = String(senderId) === String(userId);
    const isSystem = item.messageType === 'system';

    // Date separator — compare with the NEXT item (older, since data is newest-first)
    let showDate = false;
    const next = messages[index + 1];
    if (!next || !isSameDay(item.createdAt, next.createdAt)) {
      showDate = true;
    }

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
          </View>
        )}
      </>
    );
  };

  // System message for conversation start
  const ListFooterContent = () => {
    if (loadingMore) {
      return <ActivityIndicator style={{ padding: 12 }} color={PRIMARY} />;
    }
    if (!hasMore && messages.length > 0) {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.startedText}>
            Conversation started with {headerName}
          </Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: headerName }} />
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: PRIMARY },
          headerTintColor: '#fff',
          headerTitle: () => (
            <View>
              <Text style={styles.headerTitle}>{headerName}</Text>
              {typing ? (
                <Text style={styles.headerSub}>typing...</Text>
              ) : headerOnline ? (
                <Text style={styles.headerSub}>online</Text>
              ) : null}
            </View>
          ),
        }}
      />

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
              <View style={[styles.bubble, styles.bubbleOther, styles.typingBubble]}>
                <Text style={styles.typingDots}>● ● ●</Text>
              </View>
            </View>
          ) : null
        }
      />

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
    </KeyboardAvoidingView>
  );
}

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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
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
    marginVertical: 1.5,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
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
