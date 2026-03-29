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

  // Fetch unread count on mount
  useEffect(() => {
    chatAPI.getUnreadCount()
      .then(({ data }) => setUnreadCount(data.data.totalUnread))
      .catch(() => {});
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
      if (notif.type === 'new_message') {
        setNotifications((prev) => [
          {
            id: notif.message._id,
            type: 'new_message',
            title: `${notif.message.sender.name}`,
            body: notif.message.content,
            conversationId: notif.conversationId,
            createdAt: notif.createdAt,
            isRead: false,
          },
          ...prev,
        ].slice(0, 20)); // Keep latest 20
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleUnreadUpdate = ({ unreadCount: count }) => {
      // This fires on individual conversation updates; refresh total
      chatAPI.getUnreadCount()
        .then(({ data }) => setUnreadCount(data.data.totalUnread))
        .catch(() => {});
    };

    socket.on('notification', handleNotification);
    socket.on('unread_update', handleUnreadUpdate);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('unread_update', handleUnreadUpdate);
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
    if (notif.type === 'new_message' && notif.conversationId) {
      navigate(`${messagesPath}?conversation=${notif.conversationId}`);
    }
    // Mark as read locally
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setIsOpen(false);
  };

  const markAllRead = () => {
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
