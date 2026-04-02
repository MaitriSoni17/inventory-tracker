import { useState, useEffect, useRef, useCallback } from 'react';
import { chatbotKnowledge, keywordMappings } from './utils/chatbotKnowledge';
import '../../styles/homepagechatbot.css';

/**
 * Parse formatted text for display (handles **bold**, emojis, bullets)
 */
const parseFormattedText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) return <strong key={idx}>{boldMatch[1]}</strong>;
    return <span key={idx}>{part}</span>;
  });
};

/**
 * Find the best matching FAQ answer for a user query
 */
const findFAQMatch = (userInput) => {
  const lower = userInput.toLowerCase();
  let bestFaq = null;
  let bestScore = 0;

  for (const faqCategory of Object.values(chatbotKnowledge.faqs)) {
    for (const faq of faqCategory) {
      const qWords = faq.q.toLowerCase().split(/\s+/);
      let score = 0;
      qWords.forEach(w => {
        if (w.length > 3 && lower.includes(w)) score++;
      });
      // Bonus for question-type words aligning
      if ((lower.includes('how') && faq.q.toLowerCase().includes('how')) ||
          (lower.includes('what') && faq.q.toLowerCase().includes('what')) ||
          (lower.includes('can') && faq.q.toLowerCase().includes('can'))) {
        score += 0.5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestFaq = faq;
      }
    }
  }

  // Only return if reasonable match (at least 2 keyword matches)
  return bestScore >= 2 ? bestFaq : null;
};

const HomepageChatbot = ({ externalOpen, onExternalOpenHandled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (externalOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      if (onExternalOpenHandled) onExternalOpenHandled();
    }
  }, [externalOpen, onExternalOpenHandled]);

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hello! I'm the **Inline Tracker** Assistant. I can help you learn about our features, pricing, and how to get started.",
      sender: 'bot',
      timestamp: new Date(),
      hasSuggestions: true,
      suggestions: ['📋 Features', '💰 Pricing', '🚀 Getting Started', '📞 Support']
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

  // Enhanced keyword matching with scoring
  const findMatchingResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [keywords, category] of Object.entries(keywordMappings)) {
      const keywordArray = keywords.split('|');
      let score = 0;
      
      keywordArray.forEach(keyword => {
        if (lowerInput.includes(keyword.trim())) {
          score += keyword.trim().length > 4 ? 2 : 1; // Longer keywords score higher
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    }

    return { category: bestMatch, score: bestScore };
  };

  // Generate response with follow-up suggestions
  const generateResponse = useCallback((userInput) => {
    const { category, score } = findMatchingResponse(userInput);
    const lowerInput = userInput.toLowerCase();

    // Check for greetings
    if (/^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening)\b/.test(lowerInput)) {
      return {
        text: "👋 Hello! Welcome to **Inline Tracker**. I'm here to help you learn about our inventory management solution. What interests you?",
        suggestions: ['📋 All Features', '💰 Pricing', '⭐ Why Choose Us', '📞 Contact'],
        hasSuggestions: true
      };
    }

    // Check for thanks
    if (/\b(thank|thanks|appreciate|great|awesome|perfect)\b/.test(lowerInput)) {
      return {
        text: "You're welcome! 😊 Is there anything else you'd like to know about Inline Tracker?",
        suggestions: ['📋 Features', '💰 Pricing', '📞 Support'],
        hasSuggestions: true
      };
    }

    // Check for "getting started" / "how to start"
    if (lowerInput.includes('start') || lowerInput.includes('begin') || lowerInput.includes('sign up') || lowerInput.includes('register') || lowerInput.includes('create account')) {
      return {
        text: "🚀 **Getting Started with Inline Tracker:**",
        items: [
          "1. **Sign up** — Create your free account in seconds",
          "2. **Set up your business** — Add your company details",
          "3. **Add products** — Import or manually add your inventory",
          "4. **Invite team** — Add employees and assign roles",
          "5. **Start managing** — Track orders, stock, and analytics"
        ],
        followUp: "We offer a **14-day free trial** with full access to all features!",
        suggestions: ['💰 Pricing', '📋 Features', '📞 Support'],
        isList: true,
        hasSuggestions: true
      };
    }

    // FAQ matching
    const faqMatch = findFAQMatch(userInput);
    if (faqMatch && score < 2) {
      return {
        text: `**Q: ${faqMatch.q}**\n\n${faqMatch.a}`,
        suggestions: ['📋 More Features', '💰 Pricing', '📞 Support'],
        hasSuggestions: true
      };
    }

    // Feature lookups with follow-up suggestions
    const featureMap = {
      inventory: { key: 'inventory', icon: '📦', followSuggestions: ['📋 Orders', '🏭 Warehouses', '📊 Analytics'] },
      orders: { key: 'orders', icon: '📋', followSuggestions: ['📦 Inventory', '🚚 Suppliers', '📊 Reports'] },
      employees: { key: 'employees', icon: '👥', followSuggestions: ['🔒 Security', '📊 Analytics', '💰 Pricing'] },
      suppliers: { key: 'suppliers', icon: '🚚', followSuggestions: ['📋 Orders', '🏭 Warehouses'] },
      warehouses: { key: 'warehouses', icon: '🏭', followSuggestions: ['📦 Inventory', '📊 Reports'] },
      chatbot: { key: 'chatbot', icon: '🤖', followSuggestions: ['📋 Features', '💰 Pricing'] },
      analytics: { key: 'analytics', icon: '📊', followSuggestions: ['📦 Inventory', '📋 Orders'] },
      security: { key: 'security', icon: '🔒', followSuggestions: ['👥 Employees', '📋 Features'] },
      integration: { key: 'integration', icon: '🔗', followSuggestions: ['📊 Analytics', '💰 Pricing'] },
    };

    // Direct feature checks (category match or keyword in input)
    for (const [matchKey, config] of Object.entries(featureMap)) {
      const featureKeywords = {
        inventory: ['inventory', 'stock', 'product tracking'],
        orders: ['order'],
        employees: ['employee', 'team', 'staff'],
        suppliers: ['supplier', 'vendor'],
        warehouses: ['warehouse'],
        chatbot: ['chatbot', 'ai assistant'],
        analytics: ['analytics', 'report', 'dashboard'],
        security: ['security', 'encryption'],
        integration: ['integration', 'api'],
      };
      
      if (category === matchKey || featureKeywords[matchKey].some(kw => lowerInput.includes(kw))) {
        const feature = chatbotKnowledge.features[config.key];
        if (feature) {
          return {
            title: `${config.icon} ${feature.title}:`,
            items: feature.benefits,
            isList: true,
            suggestions: config.followSuggestions,
            hasSuggestions: true
          };
        }
      }
    }

    // Why choose us
    if (category === 'whyChooseUs' || lowerInput.includes('why') || lowerInput.includes('advantage') || lowerInput.includes('benefit')) {
      return {
        title: '⭐ Why Choose Inline Tracker?',
        items: chatbotKnowledge.whyChooseUs.reasons,
        isList: true,
        suggestions: ['💰 Pricing', '🚀 Get Started', '📞 Support'],
        hasSuggestions: true
      };
    }

    // Pricing
    if (category === 'pricing' || lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('plan')) {
      return {
        title: '💰 Pricing Plans:',
        items: [
          ...chatbotKnowledge.pricing.plans,
          '',
          '✅ 14-day free trial available!',
          '💡 Up to 20% discount for annual billing'
        ].filter(Boolean),
        isList: true,
        suggestions: ['📋 Features', '🚀 Get Started', '📞 Contact'],
        hasSuggestions: true
      };
    }

    // Support / Contact
    if (category === 'support' || lowerInput.includes('contact') || lowerInput.includes('support') || lowerInput.includes('help me')) {
      return {
        title: '📞 Contact & Support:',
        items: [
          `📧 Email: ${chatbotKnowledge.support.email}`,
          `📞 Phone: ${chatbotKnowledge.support.phone}`,
          `⏰ Hours: ${chatbotKnowledge.support.hours}`,
          `💬 Live Chat: ${chatbotKnowledge.support.liveChat}`,
          '',
          '💡 We respond within 2 hours for urgent issues!'
        ].filter(Boolean),
        isList: true,
        suggestions: ['📋 Features', '💰 Pricing'],
        hasSuggestions: true
      };
    }

    // All features list
    if (lowerInput.includes('all feature') || lowerInput.includes('feature list') || lowerInput.includes('what feature') ||
        (lowerInput.includes('feature') && !Object.keys(featureMap).some(k => lowerInput.includes(k)))) {
      const allFeatures = Object.values(chatbotKnowledge.features).map(f => `${f.title} — ${f.description}`);
      return {
        title: '✨ All Inline Tracker Features:',
        items: allFeatures,
        isList: true,
        suggestions: ['📦 Inventory', '📋 Orders', '👥 Employees', '💰 Pricing'],
        hasSuggestions: true
      };
    }

    // FAQ fallback
    if (faqMatch) {
      return {
        text: `**Q: ${faqMatch.q}**\n\n${faqMatch.a}`,
        suggestions: ['📋 Features', '💰 Pricing', '📞 Support'],
        hasSuggestions: true
      };
    }

    // Default response
    return {
      text: "I'd love to help! Here are some popular topics you can ask about:",
      suggestions: ['📋 All Features', '💰 Pricing Plans', '⭐ Why Choose Us', '🚀 Getting Started', '📞 Contact Us'],
      hasSuggestions: true
    };
  }, []);

  const processMessage = useCallback((messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate bot thinking
    setTimeout(() => {
      const response = generateResponse(messageText);
      
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        timestamp: new Date(),
        ...response
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 400 + Math.random() * 300);
  }, [generateResponse]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    processMessage(inputMessage);
  };

  // Click suggestion to send immediately
  const handleSuggestion = (suggestion) => {
    // Strip emoji prefix for cleaner query
    const cleanText = suggestion.replace(/^[^\w\s]+\s*/, '').trim();
    processMessage(cleanText);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        text: "👋 Hello! I'm the **Inline Tracker** Assistant. I can help you learn about our features, pricing, and how to get started.",
        sender: 'bot',
        timestamp: new Date(),
        hasSuggestions: true,
        suggestions: ['📋 Features', '💰 Pricing', '🚀 Getting Started', '📞 Support']
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
              <h3 className="chatbot-title text-white">
                <i className="fas fa-robot me-2"></i>Inline Tracker
              </h3>
              <p className="chatbot-subtitle">Your inventory assistant</p>
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
                            <p className="list-title">{parseFormattedText(msg.title)}</p>
                            <ul className="response-list">
                              {msg.items.map((item, idx) => (
                                <li key={idx} className="list-item">
                                  {parseFormattedText(item)}
                                </li>
                              ))}
                            </ul>
                            {msg.followUp && (
                              <p className="follow-up-text">{parseFormattedText(msg.followUp)}</p>
                            )}
                          </div>
                        ) : (
                          <div className="message-text">
                            {msg.text && parseFormattedText(msg.text)}
                          </div>
                        )}
                        {msg.hasSuggestions && msg.suggestions && (
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


