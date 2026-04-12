import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useConversations } from '../../hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import ContactInfoPanel from '../../components/chat/ContactInfoPanel';
import './Messages.css';

export default function Messages() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: initialConversations, isLoading: loading } = useConversations();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);

  // Sync query data into local state (for socket-driven updates)
  useEffect(() => {
    if (initialConversations) {
      setConversations(initialConversations);
    }
  }, [initialConversations]);

  const loadConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

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
          // New conversation — reload list
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
        // Only increment unread if not the active conversation
        if (activeConv?._id !== conversationId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
        updated.splice(idx, 1);
        updated.unshift(conv); // Move to top
        return updated;
      });
    };

    const handleUnreadUpdate = ({ conversationId, unreadCount }) => {
      if (activeConv?._id === conversationId) return; // Currently viewing
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

  const [showContactInfo, setShowContactInfo] = useState(false);

  const handleSelect = (conv) => {
    setActiveConv(conv);
    setShowContactInfo(false);
    setConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleBack = () => {
    setActiveConv(null);
    setShowContactInfo(false);
  };

  return (
    <div className={`messages-page ${activeConv ? 'has-active' : ''} ${showContactInfo ? 'has-contact-info' : ''}`}>
      <div className="messages-sidebar">
        <ConversationList
          conversations={conversations}
          activeId={activeConv?._id}
          onSelect={handleSelect}
          userRole={user?.role}
        />
      </div>
      <div className="messages-main">
        <ChatWindow
          conversation={activeConv}
          onBack={handleBack}
          onToggleContactInfo={() => setShowContactInfo((v) => !v)}
        />
      </div>
      {showContactInfo && activeConv && (
        <ContactInfoPanel
          conversation={activeConv}
          userRole={user?.role}
          onClose={() => setShowContactInfo(false)}
        />
      )}
    </div>
  );
}
