import React, { useState, useEffect, useRef } from 'react';
import { chatbotKnowledge, keywordMappings } from './utils/chatbotKnowledge';
import './styles/homepagechatbot.css';

const HomepageChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hello! I'm your AI Assistant. I can help you with information about Inline Tracker, our features, pricing, and FAQs. What would you like to know?",
      sender: 'bot',
      timestamp: new Date(),
      isList: false
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

  // Function to match keywords and find relevant response
  const findMatchingResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    let bestMatch = null;
    let matchScore = 0;

    // Check keyword mappings
    for (const [keywords, category] of Object.entries(keywordMappings)) {
      const keywordArray = keywords.split('|');
      let score = 0;
      
      keywordArray.forEach(keyword => {
        if (lowerInput.includes(keyword.trim())) {
          score += 1;
        }
      });

      if (score > matchScore) {
        matchScore = score;
        bestMatch = category;
      }
    }

    return { category: bestMatch, score: matchScore };
  };

  // Function to format response as a list
  const formatResponseAsList = (items, title = '') => {
    if (!items || items.length === 0) return null;

    return {
      title: title,
      items: Array.isArray(items) ? items : [items],
      isList: true
    };
  };

  // Function to generate response based on user input
  const generateResponse = (userInput) => {
    const { category } = findMatchingResponse(userInput);
    const lowerInput = userInput.toLowerCase();

    // Direct feature lookup
    if (category === 'inventory' || lowerInput.includes('inventory')) {
      return formatResponseAsList(
        chatbotKnowledge.features.inventory.benefits,
        '📦 Inventory Management Features:'
      );
    }

    if (category === 'orders' || lowerInput.includes('order')) {
      return formatResponseAsList(
        chatbotKnowledge.features.orders.benefits,
        '📋 Order Management Features:'
      );
    }

    if (category === 'employees' || lowerInput.includes('employee')) {
      return formatResponseAsList(
        chatbotKnowledge.features.employees.benefits,
        '👥 Employee Management Features:'
      );
    }

    if (category === 'suppliers' || lowerInput.includes('supplier')) {
      return formatResponseAsList(
        chatbotKnowledge.features.suppliers.benefits,
        '🚚 Supplier Management Features:'
      );
    }

    if (category === 'warehouses' || lowerInput.includes('warehouse')) {
      return formatResponseAsList(
        chatbotKnowledge.features.warehouses.benefits,
        '🏭 Warehouse Management Features:'
      );
    }

    if (category === 'chatbot' || lowerInput.includes('chatbot')) {
      return formatResponseAsList(
        chatbotKnowledge.features.chatbot.benefits,
        '🤖 AI Chatbot Assistant Features:'
      );
    }

    if (category === 'analytics' || lowerInput.includes('analytics') || lowerInput.includes('report')) {
      return formatResponseAsList(
        chatbotKnowledge.features.analytics.benefits,
        '📊 Analytics & Reports Features:'
      );
    }

    if (category === 'security' || lowerInput.includes('security')) {
      return formatResponseAsList(
        chatbotKnowledge.features.security.benefits,
        '🔒 Security & Compliance Features:'
      );
    }

    if (category === 'integration' || lowerInput.includes('integration')) {
      return formatResponseAsList(
        chatbotKnowledge.features.integration.benefits,
        '🔗 Integration & Automation Features:'
      );
    }

    // Why choose us
    if (lowerInput.includes('why') || lowerInput.includes('choose') || lowerInput.includes('advantage') || lowerInput.includes('benefit')) {
      return formatResponseAsList(
        chatbotKnowledge.whyChooseUs.reasons,
        '⭐ Why Choose Inline Tracker?'
      );
    }

    // Pricing
    if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('plan') || lowerInput.includes('subscription')) {
      return formatResponseAsList(
        chatbotKnowledge.pricing.plans,
        '💰 Our Pricing Plans:'
      );
    }

    // Support
    if (lowerInput.includes('support') || lowerInput.includes('help') || lowerInput.includes('contact')) {
      const supportInfo = [
        `📧 Email: ${chatbotKnowledge.support.email}`,
        `📞 Phone: ${chatbotKnowledge.support.phone}`,
        `⏰ Hours: ${chatbotKnowledge.support.hours}`,
        `💬 Live Chat: ${chatbotKnowledge.support.liveChat}`
      ];
      return formatResponseAsList(supportInfo, '📞 Contact & Support:');
    }

    // All features
    if (lowerInput.includes('all feature') || lowerInput.includes('what features') || lowerInput.includes('feature list')) {
      const allFeatures = Object.values(chatbotKnowledge.features).map(f => f.title);
      return formatResponseAsList(allFeatures, '✨ All Available Features:');
    }

    // Default response with suggestions
    return {
      text: 'I can help you with information about Inline Tracker! Here are some things you can ask me about:',
      suggestions: [
        'Features available',
        'Why choose us',
        'Pricing plans',
        'Getting started',
        'Support & contact'
      ]
    };
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate bot thinking
    setTimeout(() => {
      const response = generateResponse(inputMessage);
      
      if (response.isList) {
        // Format as list
        const botMessage = {
          id: messages.length + 2,
          title: response.title,
          items: response.items,
          sender: 'bot',
          timestamp: new Date(),
          isList: true
        };
        setMessages(prev => [...prev, botMessage]);
      } else if (response.suggestions) {
        // Format with suggestions
        const botMessage = {
          id: messages.length + 2,
          text: response.text,
          suggestions: response.suggestions,
          sender: 'bot',
          timestamp: new Date(),
          hasSuggestions: true
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Regular text response
        const botMessage = {
          id: messages.length + 2,
          text: response.text || "I'm not sure about that. Please ask me about our features, pricing, or support.",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      }
      
      setIsLoading(false);
    }, 500);
  };

  const handleSuggestion = (suggestion) => {
    setInputMessage(suggestion);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        text: "👋 Hello! I'm your AI Assistant. I can help you with information about Inline Tracker, our features, pricing, and FAQs. What would you like to know?",
        sender: 'bot',
        timestamp: new Date(),
        isList: false
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
                    className={`message ${msg.sender}`}
                  >
                    <div className="message-content">
                      {msg.sender === 'bot' && (
                        <div className="message-avatar bot-avatar">
                          <i className="fas fa-robot"></i>
                        </div>
                      )}
                      <div className="message-bubble">
                        {msg.isList ? (
                          <div className="list-response">
                            <p className="list-title">{msg.title}</p>
                            <ul className="response-list">
                              {msg.items.map((item, idx) => (
                                <li key={idx} className="list-item">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <>
                            <p>{msg.text}</p>
                            {msg.hasSuggestions && (
                              <div className="suggestions">
                                {msg.suggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    className="suggestion-btn"
                                    onClick={() => handleSuggestion(suggestion)}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
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
                    placeholder="Ask me anything about Inline Tracker..."
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

export default HomepageChatbot;
