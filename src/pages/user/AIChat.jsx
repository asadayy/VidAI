import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import './AIChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AI wedding planner. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // The API likely expects the conversation history *excluding* the latest user message 
      // if we were appending it inside the backend, but usually we send the whole history.
      // The prompt says: client.post('/ai/chat', { message, conversationHistory: messages })
      // "message" being the current input, and "conversationHistory" being the previous messages.
      
      const response = await client.post('/ai/chat', {
        message: userMessage.content,
        conversationHistory: messages
      });

      // Backend returns: { success: true, data: { response: "..." } }
      const assistantMessage = { 
        role: 'assistant', 
        content: response.data.data?.response || response.data.response || "I'm not sure how to respond to that." 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response from AI assistant');
      // Optionally remove the user message if it failed, but better to just show error.
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2 className="chat-title">Wedding Assistant</h2>
      </div>

      <div className="messages-list">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            {msg.content}
          </div>
        ))}
        {isTyping && (
          <div className="message-bubble assistant typing">
            Typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about venues, budget, or ideas..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
        />
        <button type="submit" className="send-button" disabled={!input.trim() || isTyping}>
          <Send className="send-icon" />
        </button>
      </form>
    </div>
  );
};

export default AIChat;
