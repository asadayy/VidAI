import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { chatAPI } from '../api';
import './NotificationDropdown.css';

function formatTimeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export default function NotificationDropdown({ messagesPath = '/user/messages' }) {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Fetch persisted notifications + unread count on mount
  useEffect(() => {
    chatAPI.getNotifications(30)
      .then(({ data }) => {
        const mapped = data.data.map((n) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          body: n.message,
          conversationId: n.relatedModel === 'Conversation' ? n.relatedId : null,
          createdAt: n.createdAt,
          isRead: n.isRead,
        }));
        setNotifications(mapped);
        setUnreadCount(mapped.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
      if (notif.type === 'new_message') {
        setNotifications((prev) => [
          {
            id: notif.message._id + '_rt',
            type: 'new_message',
            title: `${notif.message.sender.name}`,
            body: notif.message.content,
            conversationId: notif.conversationId,
            createdAt: notif.createdAt || new Date().toISOString(),
            isRead: false,
          },
          ...prev,
        ].slice(0, 30));
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = (notif) => {
    // Mark as read in DB and locally
    if (!notif.isRead) {
      chatAPI.markNotificationRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    // Navigate to the conversation
    if (notif.conversationId) {
      navigate(`${messagesPath}?conversation=${notif.conversationId}`);
    }
  };

  const markAllRead = () => {
    chatAPI.markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={() => setIsOpen(!isOpen)} title="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-items">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="notif-item-icon">
                    <MessageSquare size={14} />
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-title">{notif.title}</div>
                    <div className="notif-item-body">{notif.body}</div>
                    <div className="notif-item-time">
                      {formatTimeAgo(notif.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
