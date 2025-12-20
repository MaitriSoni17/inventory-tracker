import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Navigation Bar */}
      <nav className="navbar-home">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">Inline Tracker</span>
          </div>
          <ul className="nav-menu">
            <li><a href="#features" className="nav-link">Features</a></li>
            <li><a href="#about" className="nav-link">About</a></li>
            <li><a href="#contact" className="nav-link">Contact</a></li>
            <li><button onClick={() => navigate('/login')} className="nav-link btn-login-nav">Login</button></li>
          </ul>
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">Welcome to <span className="brand-name">Inline Tracker</span></h1>
          <p className="hero-subtitle">Smart Inventory Management for Modern Businesses</p>
          <p className="hero-description">
            Streamline your inventory operations with our AI-powered management system. Track products, manage orders, and optimize your supply chain effortlessly.
          </p>
          <div className="hero-buttons">
            <button onClick={() => navigate('/login')} className="btn btn-primary-hero">Login Now</button>
            <button onClick={() => navigate('/signup')} className="btn btn-secondary-hero">Get Started</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">Everything you need to manage your inventory efficiently</p>

          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="bi bi-boxes"></i>
              </div>
              <h3>Inventory Management</h3>
              <p>Real-time tracking of products across multiple warehouses. Monitor stock levels, set reorder points, and get low-stock alerts automatically.</p>
              <ul className="feature-list">
                <li>✓ Real-time stock tracking</li>
                <li>✓ Multi-warehouse support</li>
                <li>✓ Low-stock alerts</li>
                <li>✓ Category organization</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="bi bi-clipboard-check"></i>
              </div>
              <h3>Order Management</h3>
              <p>Manage customer orders from creation to delivery. Track order status, set deadlines, and ensure timely fulfillment with ease.</p>
              <ul className="feature-list">
                <li>✓ Order creation & tracking</li>
                <li>✓ Delivery scheduling</li>
                <li>✓ Status monitoring</li>
                <li>✓ Order history</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="bi bi-person-badge"></i>
              </div>
              <h3>Employee Management</h3>
              <p>Manage your team efficiently. Assign tasks, track performance, and optimize workforce productivity with role-based access control.</p>
              <ul className="feature-list">
                <li>✓ Team management</li>
                <li>✓ Task assignment</li>
                <li>✓ Performance tracking</li>
                <li>✓ Role-based access</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="bi bi-truck"></i>
              </div>
              <h3>Supplier Management</h3>
              <p>Streamline supplier relationships and orders. Manage supplier orders, track deliveries, and maintain supply chain efficiency.</p>
              <ul className="feature-list">
                <li>✓ Supplier profiles</li>
                <li>✓ Purchase orders</li>
                <li>✓ Delivery tracking</li>
                <li>✓ Order history</li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="bi bi-building"></i>
              </div>
              <h3>Warehouse Management</h3>
              <p>Organize and manage multiple warehouse locations. Track inventory distribution and optimize storage across your facilities.</p>
              <ul className="feature-list">
                <li>✓ Multi-location tracking</li>
                <li>✓ Location management</li>
                <li>✓ Capacity monitoring</li>
                <li>✓ Distribution optimization</li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="bi bi-chat-dots"></i>
              </div>
              <h3>AI Chatbot Assistant</h3>
              <p>Get instant answers to your inventory questions. Our AI-powered chatbot provides real-time insights and recommendations.</p>
              <ul className="feature-list">
                <li>✓ Natural language queries</li>
                <li>✓ Instant insights</li>
                <li>✓ Smart recommendations</li>
                <li>✓ 24/7 availability</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-container">
          <div className="about-grid">
            <div className="about-content">
              <h2 className="section-title">About Inline Tracker</h2>
              <p className="about-text">
                Inline Tracker is a modern inventory management solution designed specifically for small to medium-sized businesses. We understand the challenges of managing complex supply chains, and we've built a platform that makes it simple.
              </p>
              <p className="about-text">
                Our mission is to empower businesses with intelligent inventory management tools that reduce costs, improve efficiency, and enhance decision-making through real-time data and AI-powered insights.
              </p>

              <div className="stats-grid">
                <div className="stat-card">
                  <h4 className="stat-number">1000+</h4>
                  <p className="stat-label">Active Users</p>
                </div>
                <div className="stat-card">
                  <h4 className="stat-number">50+</h4>
                  <p className="stat-label">Companies</p>
                </div>
                <div className="stat-card">
                  <h4 className="stat-number">99.9%</h4>
                  <p className="stat-label">Uptime</p>
                </div>
                <div className="stat-card">
                  <h4 className="stat-number">24/7</h4>
                  <p className="stat-label">Support</p>
                </div>
              </div>

              <div className="about-values">
                <h3>Our Values</h3>
                <ul className="values-list">
                  <li><span className="value-icon">🎯</span> <strong>Accuracy:</strong> Precise inventory tracking</li>
                  <li><span className="value-icon">⚡</span> <strong>Efficiency:</strong> Streamlined operations</li>
                  <li><span className="value-icon">🔐</span> <strong>Security:</strong> Enterprise-grade protection</li>
                  <li><span className="value-icon">🤝</span> <strong>Support:</strong> Dedicated customer service</li>
                </ul>
              </div>
            </div>

            <div className="about-image">
              <div className="about-visual">
                <div className="visual-shape"></div>
                <div className="visual-content">
                  <div className="visual-item">📊 Analytics</div>
                  <div className="visual-item">📦 Inventory</div>
                  <div className="visual-item">🚚 Logistics</div>
                  <div className="visual-item">💼 Business</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="section-container">
          <h2 className="section-title">Get In Touch</h2>
          <p className="section-subtitle">We're here to help. Contact us for any questions or support.</p>

          <div className="contact-grid">
            {/* Contact Card 1 */}
            <div className="contact-card">
              <div className="contact-icon">
                <i className="bi bi-envelope"></i>
              </div>
              <h3>Email</h3>
              <p className="contact-info">support@inlinetracker.com</p>
              <p className="contact-desc">Send us your queries anytime</p>
            </div>

            {/* Contact Card 2 */}
            <div className="contact-card">
              <div className="contact-icon">
                <i className="bi bi-telephone"></i>
              </div>
              <h3>Phone</h3>
              <p className="contact-info">+1 (555) 123-4567</p>
              <p className="contact-desc">Available Monday to Friday, 9 AM to 6 PM</p>
            </div>

            {/* Contact Card 3 */}
            <div className="contact-card">
              <div className="contact-icon">
                <i className="bi bi-geo-alt"></i>
              </div>
              <h3>Address</h3>
              <p className="contact-info">123 Business Street</p>
              <p className="contact-desc">New York, NY 10001, USA</p>
            </div>

            {/* Contact Card 4 */}
            <div className="contact-card">
              <div className="contact-icon">
                <i className="bi bi-chat-left-text"></i>
              </div>
              <h3>Live Chat</h3>
              <p className="contact-info">Start a conversation</p>
              <p className="contact-desc">Instant support from our team</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-container">
            <h3 className="form-title">Send us a Message</h3>
            <form className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <input type="text" placeholder="Your Name" required />
                </div>
                <div className="form-group">
                  <input type="email" placeholder="Your Email" required />
                </div>
              </div>
              <div className="form-group">
                <input type="text" placeholder="Subject" required />
              </div>
              <div className="form-group">
                <textarea placeholder="Your Message" rows="5" required></textarea>
              </div>
              <button type="submit" className="btn btn-primary-hero">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="section-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Inline Tracker</h4>
              <p>Smart inventory management for modern businesses.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Follow Us</h4>
              <div className="social-links">
                <a href="#" className="social-link"><i className="bi bi-facebook"></i></a>
                <a href="#" className="social-link"><i className="bi bi-twitter"></i></a>
                <a href="#" className="social-link"><i className="bi bi-linkedin"></i></a>
                <a href="#" className="social-link"><i className="bi bi-instagram"></i></a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Inline Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
