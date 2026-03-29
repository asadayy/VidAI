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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { chatAPI } from '../../api/chat';

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
  const { socket } = useSocket();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [headerName, setHeaderName] = useState('Chat');
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef(null);

  // Load messages
  const loadMessages = useCallback(async (cursor) => {
    try {
      const params = { limit: 30 };
      if (cursor) params.cursor = cursor;
      const { data } = await chatAPI.getMessages(conversationId, params);
      const msgs = data.data;
      setHasMore(data.hasMore ?? msgs.length === 30);
      if (cursor) {
        setMessages((prev) => [...prev, ...msgs]);
      } else {
        setMessages(msgs);
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
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [conversationId]);

  // Mark as read
  useEffect(() => {
    chatAPI.markAsRead(conversationId).catch(() => {});
  }, [conversationId, messages.length]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_conversation', conversationId);

    const handleNewMessage = (msg) => {
      if (msg.conversation === conversationId) {
        setMessages((prev) => [msg, ...prev]);
        setTyping(false);
        chatAPI.markAsRead(conversationId).catch(() => {});
      }
    };

    const handleTyping = ({ conversationId: cId, userId }) => {
      if (cId === conversationId && userId !== user?._id) {
        setTyping(true);
      }
    };

    const handleStopTyping = ({ conversationId: cId, userId }) => {
      if (cId === conversationId && userId !== user?._id) {
        setTyping(false);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
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
      sender: { _id: user._id },
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
    const isMe = item.sender?._id === user?._id;
    const isSystem = item.messageType === 'system';

    // Date separator
    let showDate = false;
    const next = messages[index + 1];
    if (!next || !isSameDay(item.createdAt, next.createdAt)) {
      showDate = true;
    }

    return (
      <>
        {isSystem ? (
          <View style={styles.systemMsg}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        ) : (
          <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        {showDate && (
          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>{formatDateLabel(item.createdAt)}</Text>
          </View>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: headerName }} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: headerName,
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
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
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ padding: 12 }} color={theme.colors.primary} />
          ) : null
        }
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
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
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
    backgroundColor: theme.colors.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  dateSep: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateSepText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  systemMsg: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingBubble: {
    paddingVertical: 12,
  },
  typingDots: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    letterSpacing: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
