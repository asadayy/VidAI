import { CheckCheck, Check } from 'lucide-react';
import './MessageBubble.css';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DateSeparator({ date }) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label;
  if (d.toDateString() === today.toDateString()) {
    label = 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    label = 'Yesterday';
  } else {
    label = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }

  return (
    <div className="mb-date-separator">
      <span>{label}</span>
    </div>
  );
}

export default function MessageBubble({ message, isOwn, showReadReceipt }) {
  if (message.messageType === 'system') {
    return (
      <div className="message-bubble system">
        <div className="mb-content">
          <span className="mb-text">{message.content}</span>
        </div>
      </div>
    );
  }

  const isRead = message.readBy && message.readBy.length > 1;

  return (
    <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
      <div className="mb-content">
        <span className="mb-text">{message.content}</span>
        <div className="mb-meta">
          <span className="mb-time">{formatTime(message.createdAt)}</span>
          {isOwn && showReadReceipt && (
            <span className={`mb-read-icon ${isRead ? 'read' : 'unread'}`}>
              {isRead ? <CheckCheck size={14} /> : <Check size={14} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
