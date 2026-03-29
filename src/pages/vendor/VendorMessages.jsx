import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { chatAPI } from '../../api';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import '../../pages/user/Messages.css';

export default function VendorMessages() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle ?conversation=xxx param
  useEffect(() => {
    const convId = searchParams.get('conversation');
    if (convId && conversations.length > 0) {
      const conv = conversations.find((c) => c._id === convId);
      if (conv) {
        setActiveConv(conv);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, conversations, setSearchParams]);

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
        if (activeConv?._id !== conversationId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    };

    const handleUnreadUpdate = ({ conversationId, unreadCount }) => {
      if (activeConv?._id === conversationId) return;
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId ? { ...c, unreadCount } : c
        )
      );
    };

    socket.on('notification', handleNotification);
    socket.on('unread_update', handleUnreadUpdate);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('unread_update', handleUnreadUpdate);
    };
  }, [socket, activeConv, loadConversations]);

  const handleSelect = (conv) => {
    setActiveConv(conv);
    setConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleBack = () => setActiveConv(null);

  return (
    <div className={`messages-page ${activeConv ? 'has-active' : ''}`}>
      <div className="messages-sidebar">
        <ConversationList
          conversations={conversations}
          activeId={activeConv?._id}
          onSelect={handleSelect}
          userRole="vendor"
        />
      </div>
      <div className="messages-main">
        <ChatWindow
          conversation={activeConv}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
