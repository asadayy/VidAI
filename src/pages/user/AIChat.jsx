import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, User, RefreshCw, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import client from '../../api/client';
import './AIChat.css';

const SUGGESTIONS = [
  'What vendors do I need for my wedding?',
  'Help me create a wedding budget plan',
  'How do I choose the perfect venue?',
  'Give me a wedding planning checklist',
];

function fmtTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const SESSION_KEY = 'vidai_chat_history';

const INITIAL_MSG = {
  role: 'assistant',
  content: "Hello! I'm your AI wedding planner 💍 I can help with venues, budgets, vendor selection, timelines, and more. What would you like to plan today?",
  time: new Date(),
};

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [INITIAL_MSG];
    const parsed = JSON.parse(raw);
    // Rehydrate time strings back to Date objects
    return parsed.map((m) => ({ ...m, time: new Date(m.time) }));
  } catch {
    return [INITIAL_MSG];
  }
}

function saveSession(msgs) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs));
  } catch { /* quota exceeded — ignore */ }
}

const AIChat = () => {
  const [messages, setMessages] = useState(() => loadSession());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Persist to sessionStorage whenever messages change
  useEffect(() => { saveSession(messages); }, [messages]);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  const handleSend = async (text) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMsg = { role: 'user', content, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    inputRef.current?.focus();

    // Placeholder for the streaming assistant message
    const assistantMsg = { role: 'assistant', content: '', time: new Date() };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Get auth token for the fetch request
      const token = localStorage.getItem('vidai_access_token');
      const baseUrl = client.defaults.baseURL;

      const response = await fetch(`${baseUrl}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accumulated,
                  };
                  return updated;
                });
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) throw e;
            }
          }
        }
      }

      // If stream returned nothing, set a fallback
      if (!accumulated) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "I'm not sure how to respond to that.",
          };
          return updated;
        });
      }
    } catch {
      // Remove the empty assistant placeholder and show error
      setMessages((prev) => prev.filter((m) => m !== assistantMsg));
      toast.error('Failed to get response from AI assistant');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); handleSend(); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleReset = () => {
    const fresh = [{ ...INITIAL_MSG, time: new Date() }];
    setMessages(fresh);
    saveSession(fresh);
  };

  const showSuggestions = messages.length === 1;

  return (
    <div className="ac-page">

      {/* Header */}
      <div className="ac-header">
        <div className="ac-header-left">
          <div className="ac-avatar ac-avatar--ai">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="ac-header-title">Wedding AI Assistant</h1>
            <span className="ac-status">
              <span className="ac-status-dot" />
              Online &amp; ready to help
            </span>
          </div>
        </div>
        <button className="ac-reset-btn" onClick={handleReset} title="New conversation">
          <RefreshCw size={15} />
          <span>New chat</span>
        </button>
      </div>

      {/* Messages */}
      <div className="ac-messages" ref={listRef} onScroll={handleScroll}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          // Hide empty assistant bubble while streaming (typing dots replace it)
          if (!isUser && !msg.content && isTyping) return null;
          return (
            <div key={i} className={`ac-row ${isUser ? 'ac-row--user' : 'ac-row--ai'}`}>
              {!isUser && (
                <div className="ac-avatar ac-avatar--ai ac-avatar--sm"><Bot size={14} /></div>
              )}
              <div className="ac-bubble-wrap">
                <div className={`ac-bubble ${isUser ? 'ac-bubble--user' : 'ac-bubble--ai'}`}>
                  {isUser ? msg.content : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p:      ({ children }) => <p className="ac-md-p">{children}</p>,
                        strong: ({ children }) => <strong className="ac-md-strong">{children}</strong>,
                        em:     ({ children }) => <em className="ac-md-em">{children}</em>,
                        ul:     ({ children }) => <ul className="ac-md-ul">{children}</ul>,
                        ol:     ({ children }) => <ol className="ac-md-ol">{children}</ol>,
                        li:     ({ children }) => <li className="ac-md-li">{children}</li>,
                        h1:     ({ children }) => <h1 className="ac-md-h">{children}</h1>,
                        h2:     ({ children }) => <h2 className="ac-md-h ac-md-h2">{children}</h2>,
                        h3:     ({ children }) => <h3 className="ac-md-h ac-md-h3">{children}</h3>,
                        code:   ({ inline, children }) => inline
                          ? <code className="ac-md-code">{children}</code>
                          : <pre className="ac-md-pre"><code>{children}</code></pre>,
                        hr:     () => <hr className="ac-md-hr" />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
                <span className="ac-time">{fmtTime(msg.time)}</span>
              </div>
              {isUser && (
                <div className="ac-avatar ac-avatar--user ac-avatar--sm"><User size={14} /></div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="ac-row ac-row--ai">
            <div className="ac-avatar ac-avatar--ai ac-avatar--sm"><Bot size={14} /></div>
            <div className="ac-bubble ac-bubble--ai ac-bubble--typing">
              <span className="ac-dot" />
              <span className="ac-dot" />
              <span className="ac-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button className="ac-scroll-btn" onClick={() => scrollToBottom()}>
          <ChevronDown size={18} />
        </button>
      )}

      {/* Suggestions */}
      {showSuggestions && (
        <div className="ac-suggestions">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="ac-suggestion" onClick={() => handleSend(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form className="ac-input-bar" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="ac-input"
          rows={1}
          placeholder="Ask about venues, budget, vendors…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
        />
        <button type="submit" className="ac-send-btn" disabled={!input.trim() || isTyping} aria-label="Send">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default AIChat;
