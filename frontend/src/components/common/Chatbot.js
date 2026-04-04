import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import axios from 'axios';
import '../../styles/chatbot.css';

/**
 * Memoized message content renderer
 */
const MessageContent = memo(({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      elements.push(<br key={`br-${lineIdx}`} />);
    }

    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const processedParts = parts.map((part, partIdx) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return <strong key={`b-${lineIdx}-${partIdx}`}>{boldMatch[1]}</strong>;
      }
      return <span key={`t-${lineIdx}-${partIdx}`}>{part}</span>;
    });

    const trimmed = line.trim();
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('· ')) {
      elements.push(
        <div key={`li-${lineIdx}`} className="chat-list-item">
          <span className="chat-bullet">•</span>
          <span>{processedParts}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s/);
      elements.push(
        <div key={`nl-${lineIdx}`} className="chat-list-item numbered">
          <span className="chat-number">{numMatch[1]}.</span>
          <span>{processedParts}</span>
        </div>
      );
    } else if (trimmed.length > 0) {
      elements.push(<span key={`line-${lineIdx}`}>{processedParts}</span>);
    }
  });

  return <>{elements}</>;
});

MessageContent.displayName = 'MessageContent';

/**
 * Parse markdown-like formatting (cached version)
 */
const parseFormattedText = (text) => {
  if (!text) return <MessageContent text="" />;
  return <MessageContent text={text} />;
};

/**
 * Quick actions lookup (memoized)
 */
const QUICK_ACTIONS_MAP = {
  businessowner: [
    { label: '📊 Dashboard', text: 'Show my dashboard overview' },
    { label: '📦 Stock', text: 'Show inventory status' },
    { label: '⚠️ Low Stock', text: 'Show low stock alerts' },
    { label: '📋 Orders', text: 'Show order status' },
    { label: '💰 Revenue', text: 'Revenue summary' },
    { label: '👥 Team', text: 'Show employees' },
  ],
  employee: [
    { label: '📋 My Tasks', text: 'Show my dashboard' },
    { label: '🚨 Urgent', text: 'Show urgent tasks' },
    { label: '📦 My Orders', text: 'Show my orders' },
    { label: '💰 Salary', text: 'My salary payments' },
  ],
  supplier: [
    { label: '📦 My Orders', text: 'Show my orders' },
    { label: '⏳ Pending', text: 'Show pending orders' },
    { label: '💰 Revenue', text: 'My total order value' },
    { label: '📊 Overview', text: 'Show dashboard' },
  ],
};

const getQuickActions = (role) => {
  return QUICK_ACTIONS_MAP[role] || QUICK_ACTIONS_MAP.businessowner;
};

/**
 * Get role-aware welcome message
 */
const getWelcomeMessage = (role) => {
  const messages = {
    businessowner: "👋 Hello! I'm your AI Business Assistant. I can help you with inventory, orders, revenue, employees, and more. Try the quick actions below or ask me anything!",
    employee: "👋 Hi there! I'm your AI Assistant. I can help with your tasks, orders, deadlines, and salary info. What would you like to know?",
    supplier: "👋 Hello! I'm your AI Supply Assistant. I can help with order tracking, delivery updates, and supply status. How can I help?",
  };
  return messages[role] || messages.businessowner;
};

/**
 * Memoized chat message component to prevent re-renders
 */
const ChatMessage = memo(({ msg, onQuickAction, isLoading, formatTime, userRole }) => {
  if (msg.sender === 'suggestions') {
    return (
      <div className="suggestions-row">
        {msg.suggestions.map((s, i) => (
          <button
            key={i}
            className="suggestion-chip"
            onClick={() => onQuickAction(s.text)}
            disabled={isLoading}
          >
            {s.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
      <div className="message-content">
        {msg.sender === 'bot' && (
          <div className="message-avatar bot-avatar">
            <i className="fas fa-robot"></i>
          </div>
        )}
        <div className="message-bubble">
          <div className="message-text">
            {msg.sender === 'bot' ? parseFormattedText(msg.text) : msg.text}
          </div>
          <span className="message-time">{formatTime(msg.timestamp)}</span>
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  // Resize state
  const [width, setWidth] = useState(380);
  const [height, setHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const userRole = localStorage.getItem('role') || 'user';

  // Load saved dimensions from localStorage
  useEffect(() => {
    const savedSize = localStorage.getItem('chatbotSize');
    if (savedSize) {
      try {
        const { w, h } = JSON.parse(savedSize);
        setWidth(w);
        setHeight(h);
      } catch (e) {
        // Invalid saved data, use defaults
      }
    }
  }, []);

  // Initialize with role-aware welcome
  useEffect(() => {
    setMessages([
      {
        id: 1,
        text: getWelcomeMessage(userRole),
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  }, [userRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;

    const userId = localStorage.getItem('userId') || '';
    const authToken = localStorage.getItem('token') || '';

    if (!authToken) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: '🔒 Authentication error: Please login again.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
      return;
    }

    // Add user message
    const userMsg = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      const response = await axios.post('/api/chatbot/message', {
        message: messageText,
        role: userRole,
        userId: userId
      }, {
        headers: {
          'auth-token': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: response.data.message,
          sender: 'bot',
          timestamp: new Date()
        }]);

        // Extract and show contextual suggestions
        const suggestions = getContextualSuggestions(messageText, userRole);
        if (suggestions.length > 0) {
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            suggestions: suggestions,
            sender: 'suggestions',
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      let errorText = '❌ Sorry, I encountered an error. Please try again.';
      if (error.response?.status === 401) {
        errorText = '🔒 Authentication failed. Please login again.';
      } else if (error.response?.status === 400) {
        errorText = '⚠️ Invalid request. Please rephrase your question.';
      } else if (error.response?.status === 500) {
        errorText = '🔧 Server error. Please try again in a moment.';
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: errorText,
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [userRole]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        text: getWelcomeMessage(userRole),
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
    setShowQuickActions(true);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isMinimized) setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Handle resize start
  const handleResizeStart = (e) => {
    if (isMinimized) return;
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: width,
      height: height
    });
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      // For left-side resize: drag left = wider, drag right = narrower
      let newWidth = resizeStart.width - deltaX;
      let newHeight = resizeStart.height + deltaY;

      // Enforce minimum sizes
      const minWidth = 280;
      const maxWidth = window.innerWidth - 48;
      const minHeight = 200;
      const maxHeight = window.innerHeight - 120;

      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

      setWidth(newWidth);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Save size to localStorage
      localStorage.setItem('chatbotSize', JSON.stringify({ w: width, h: height }));
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeStart, width, height]);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickActions = useMemo(() => getQuickActions(userRole), [userRole]);

  const handleQuickActionClick = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button 
          className="chatbot-button"
          onClick={toggleChat}
          title="Open AI Assistant"
          aria-label="Open AI Assistant"
        >
          <i className="fas fa-comments"></i>
          <span className="pulse-dot"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          ref={containerRef}
          className={`chatbot-container ${isMinimized ? 'minimized' : ''}`}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            cursor: isResizing ? 'sw-resize' : 'auto'
          }}
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <h3 className="chatbot-title">
                <i className="fas fa-robot me-2"></i>AI Assistant
              </h3>
              <p className="chatbot-subtitle">
                {userRole === 'businessowner' ? 'Operations Assistant' :
                 userRole === 'employee' ? 'Task Helper' :
                 userRole === 'supplier' ? 'Supply Manager' : 'Always here to help'}
              </p>
            </div>
            <div className="chatbot-controls">
              <button 
                className="control-btn minimize-btn"
                onClick={toggleMinimize}
                title={isMinimized ? "Expand" : "Minimize"}
                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
              >
                <i className={`fas fa-${isMinimized ? 'expand' : 'compress'}`}></i>
              </button>
              <button 
                className="control-btn close-btn"
                onClick={toggleChat}
                title="Close chat"
                aria-label="Close chat"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div className="chatbot-messages">
                {messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id}
                    msg={msg}
                    onQuickAction={handleQuickActionClick}
                    isLoading={isLoading}
                    formatTime={formatTime}
                    userRole={userRole}
                  />
                ))}

                {/* Quick Actions on first load */}
                {showQuickActions && messages.length <= 1 && (
                  <div className="quick-actions-container">
                    <p className="quick-actions-label">Quick Actions:</p>
                    <div className="quick-actions-grid">
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          className="quick-action-btn"
                          onClick={() => handleQuickActionClick(action.text)}
                          disabled={isLoading}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="message bot">
                    <div className="message-content">
                      <div className="message-avatar bot-avatar">
                        <i className="fas fa-robot"></i>
                      </div>
                      <div className="message-bubble typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="chatbot-input-form">
                <div className="chatbot-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    className="chatbot-input"
                    placeholder="Ask me anything..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isLoading}
                    aria-label="Chat message input"
                  />
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={handleClearChat}
                    title="Clear chat"
                    aria-label="Clear chat history"
                  >
                    <i className="fas fa-redo"></i>
                  </button>
                  <button
                    type="submit"
                    className="send-btn"
                    disabled={isLoading || !inputMessage.trim()}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Resize Handle */}
          {!isMinimized && (
            <div
              className="chatbot-resize-handle"
              onMouseDown={handleResizeStart}
              title="Drag to resize"
              aria-label="Resize chatbot"
            >
              <i className="fas fa-grip-vertical"></i>
            </div>
          )}
        </div>
      )}
    </>
  );
};

/**
 * Generate contextual follow-up suggestions based on what the user asked
 */
const getContextualSuggestions = (userMessage, role) => {
  const msg = userMessage.toLowerCase();

  if (msg.includes('dashboard') || msg.includes('overview')) {
    if (role === 'businessowner') {
      return [
        { label: '⚠️ Low Stock', text: 'Show low stock alerts' },
        { label: '📋 Orders', text: 'Show recent orders' },
        { label: '💰 Revenue', text: 'Revenue summary' },
      ];
    }
    return [];
  }

  if (msg.includes('order') || msg.includes('delivery')) {
    if (role === 'businessowner') {
      return [
        { label: '⏳ Pending Only', text: 'Show pending orders only' },
        { label: '🏆 Top Products', text: 'Show top selling products' },
      ];
    }
    return [];
  }

  if (msg.includes('stock') || msg.includes('inventory')) {
    return [
      { label: '🏢 Warehouses', text: 'Show warehouse details' },
      { label: '📂 Categories', text: 'Show categories' },
    ];
  }

  if (msg.includes('employee') || msg.includes('team')) {
    return [
      { label: '💰 Salary', text: 'Salary overview' },
    ];
  }

  if (msg.includes('help')) {
    return [];
  }

  return [];
};

export default Chatbot;



