import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../styles/chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI Assistant. How can I help you with your inventory management today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    const userRole = localStorage.getItem('role') || 'user';
    const userId = localStorage.getItem('userId') || '';
    const authToken = localStorage.getItem('token') || '';

    // Check if token exists
    if (!authToken) {
      const errorMessage = {
        id: messages.length + 1,
        text: 'Authentication error: Please login again.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Add user message to chat
    const newUserMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/chatbot/message', {
        message: inputMessage,
        role: userRole,
        userId: userId
      }, {
        headers: {
          'auth-token': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const botMessage = {
          id: messages.length + 2,
          text: response.data.message,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      let errorText = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response?.status === 401) {
        errorText = 'Authentication failed. Please login again.';
      } else if (error.response?.status === 400) {
        errorText = 'Invalid request. Please check your input.';
      } else if (error.response?.status === 500) {
        errorText = 'Server error. Please try again later.';
      }
      
      const errorMessage = {
        id: messages.length + 2,
        text: errorText,
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm your AI Assistant. How can I help you with your inventory management today?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isMinimized) setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
        <div className={`chatbot-container ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <h3 className="chatbot-title">
                <i className="fas fa-robot me-2"></i>AI Assistant
              </h3>
              <p className="chatbot-subtitle">Always here to help</p>
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
                  <div 
                    key={msg.id} 
                    className={`message ${msg.sender} ${msg.isError ? 'error' : ''}`}
                  >
                    <div className="message-content">
                      {msg.sender === 'bot' && (
                        <div className="message-avatar bot-avatar">
                          <i className="fas fa-robot"></i>
                        </div>
                      )}
                      <div className="message-bubble">
                        <p>{msg.text}</p>
                        <span className="message-time">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
                    placeholder="Type your question..."
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
        </div>
      )}
    </>
  );
};

export default Chatbot;



