import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { chatAPI } from '../../api';
import MessageBubble, { DateSeparator } from './MessageBubble';
import ChatInput from './ChatInput';
import './ChatWindow.css';

export default function ChatWindow({ conversation, onBack }) {
  const { user } = useAuth();
  const { socket, isOnline } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [typing, setTyping] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isInitialLoad = useRef(true);

  const conversationId = conversation?._id;
  const otherId = conversation?.otherParticipant?._id;
  const otherName =
    user?.role === 'vendor'
      ? conversation?.otherParticipant?.name || 'Customer'
      : conversation?.vendor?.businessName || 'Vendor';
  const otherOnline = otherId && isOnline(otherId);

  // Fetch messages
  const loadMessages = useCallback(
    async (cursor) => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const { data } = await chatAPI.getMessages(conversationId, cursor);
        if (cursor) {
          setMessages((prev) => [...data.data, ...prev]);
        } else {
          setMessages(data.data);
        }
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  // Initial load + mark as read
  useEffect(() => {
    if (!conversationId) return;
    isInitialLoad.current = true;
    loadMessages(null).then(() => {
      isInitialLoad.current = false;
    });
    chatAPI.markAsRead(conversationId).catch(() => {});
  }, [conversationId, loadMessages]);

  // Socket: join room + listen for messages
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', conversationId);

    const handleNewMessage = ({ message }) => {
      if (message.conversation !== conversationId) return;
      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      // Auto-mark as read if window is focused
      if (document.hasFocus()) {
        chatAPI.markAsRead(conversationId).catch(() => {});
        socket.emit('mark_read', conversationId);
      }
    };

    const handleTyping = ({ userId, userName, conversationId: cid }) => {
      if (cid !== conversationId) return;
      setTyping(userName);
      // Clear after 3s
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTyping(null), 3000);
    };

    const handleStopTyping = ({ conversationId: cid }) => {
      if (cid !== conversationId) return;
      setTyping(null);
    };

    const handleMessagesRead = ({ conversationId: cid, readBy }) => {
      if (cid !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.sender?._id === user?.id || msg.sender === user?.id) {
            const alreadyRead = msg.readBy?.some(
              (r) => (r.user?._id || r.user) === readBy
            );
            if (!alreadyRead) {
              return {
                ...msg,
                readBy: [...(msg.readBy || []), { user: readBy, readAt: new Date() }],
              };
            }
          }
          return msg;
        })
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, conversationId, user?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: isInitialLoad.current ? 'auto' : 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSend = (text) => {
    if (!socket || !conversationId) return;
    socket.emit('send_message', {
      conversationId,
      content: text,
      messageType: 'text',
    });
    socket.emit('stop_typing', conversationId);
  };

  // Typing indicator
  const handleTypingInput = () => {
    if (!socket || !conversationId) return;
    socket.emit('typing', conversationId);
  };

  if (!conversation) {
    return (
      <div className="chat-window">
        <div className="cw-empty">
          <MessageSquare size={48} />
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the list to start messaging</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const renderMessages = () => {
    const elements = [];
    let lastDate = null;

    for (const msg of messages) {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== lastDate) {
        elements.push(<DateSeparator key={`date-${msgDate}`} date={msg.createdAt} />);
        lastDate = msgDate;
      }

      const senderId = msg.sender?._id || msg.sender;
      const isOwn = senderId === user?.id;

      elements.push(
        <MessageBubble
          key={msg._id}
          message={msg}
          isOwn={isOwn}
          showReadReceipt={true}
        />
      );
    }

    return elements;
  };

  return (
    <div className="chat-window">
      <div className="cw-header">
        <button className="cw-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="cw-header-avatar">
          {otherName.charAt(0).toUpperCase()}
        </div>
        <div className="cw-header-info">
          <div className="cw-header-name">{otherName}</div>
          <div className={`cw-header-status ${otherOnline ? '' : 'offline'}`}>
            {otherOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="cw-messages">
        {hasMore && (
          <div className="cw-load-more">
            <button onClick={() => loadMessages(nextCursor)} disabled={loading}>
              {loading ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}
        {loading && messages.length === 0 && (
          <div className="cw-messages-loading">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}
        {renderMessages()}
        {typing && (
          <div className="cw-typing">{typing} is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={!socket}
        onTyping={handleTypingInput}
      />
    </div>
  );
}
