import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './ConversationList.css';

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
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  userRole,
}) {
  const [search, setSearch] = useState('');
  const { isOnline } = useSocket();

  const filtered = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = userRole === 'vendor'
      ? conv.otherParticipant?.name
      : conv.vendor?.businessName;
    return name?.toLowerCase().includes(s);
  });

  return (
    <div className="conversation-list">
      <div className="cl-header">
        <h2>Messages</h2>
        <input
          className="cl-search"
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cl-items">
        {filtered.length === 0 ? (
          <div className="cl-empty">
            <MessageSquare size={40} />
            <p>
              {search
                ? 'No conversations match your search'
                : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const name =
              userRole === 'vendor'
                ? conv.otherParticipant?.name || 'Customer'
                : conv.vendor?.businessName || 'Vendor';
            const initial = name.charAt(0).toUpperCase();
            const otherId = conv.otherParticipant?._id;
            const online = otherId && isOnline(otherId);
            const avatarUrl =
              userRole === 'vendor'
                ? conv.otherParticipant?.avatar?.url
                : conv.vendor?.coverImage?.url || conv.vendor?.coverImage;

            return (
              <div
                key={conv._id}
                className={`cl-item ${conv._id === activeId ? 'active' : ''}`}
                onClick={() => onSelect(conv)}
              >
                <div className="cl-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="cl-avatar-img" />
                  ) : (
                    initial
                  )}
                  {online && <span className="cl-online-dot" />}
                </div>
                <div className="cl-info">
                  <div className="cl-name-row">
                    <span className="cl-name">{name}</span>
                    <span className="cl-time">
                      {formatTimeAgo(conv.lastMessage?.createdAt || conv.updatedAt)}
                    </span>
                  </div>
                  <div className="cl-preview-row">
                    <span className="cl-preview">
                      {conv.lastMessage?.text || 'No messages yet'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="cl-unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
