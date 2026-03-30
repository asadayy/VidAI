import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { chatAPI } from '../../api/chat';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDay < 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isOnline } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Socket: listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNotification = ({ type, conversationId, message }) => {
      if (type !== 'new_message') return;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === conversationId);
        if (idx === -1) {
          loadConversations();
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = {
          text: message.content,
          sender: message.sender._id,
          createdAt: new Date().toISOString(),
        };
        conv.unreadCount = (conv.unreadCount || 0) + 1;
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket, loadConversations]);

  const filtered = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const name = conv.vendor?.businessName || conv.otherParticipant?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const renderItem = ({ item: conv }) => {
    const name = conv.vendor?.businessName || conv.otherParticipant?.name || 'Chat';
    const initial = name.charAt(0).toUpperCase();
    const otherId = conv.otherParticipant?._id;
    const online = otherId && isOnline(otherId);
    const hasUnread = conv.unreadCount > 0;
    const timeStr = formatTimeAgo(conv.lastMessage?.createdAt || conv.updatedAt);
    const isSentByMe = String(conv.lastMessage?.sender) === String(user?._id || user?.id);
    const previewText = conv.lastMessage?.text || 'No messages yet';

    return (
      <TouchableOpacity
        style={styles.item}
        activeOpacity={0.7}
        onPress={() => router.push(`/chat/${conv._id}`)}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, online && styles.avatarOnline]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>{timeStr}</Text>
          </View>
          <View style={styles.previewRow}>
            <View style={styles.previewLeft}>
              {isSentByMe && (
                <Ionicons
                  name="checkmark-done"
                  size={16}
                  color={hasUnread ? '#9ca3af' : theme.colors.primary}
                  style={{ marginRight: 2 }}
                />
              )}
              <Text
                style={[styles.preview, hasUnread && styles.previewBold]}
                numberOfLines={1}
              >
                {previewText}
              </Text>
            </View>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{conv.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadConversations();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={52} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>
              {search ? 'No conversations match' : 'No conversations yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              Message a vendor to get started
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#111',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOnline: {},
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9edef',
    paddingBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  timeUnread: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  preview: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  previewBold: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: theme.colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 14,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
