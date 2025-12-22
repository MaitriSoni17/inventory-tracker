import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/home.css';

function Features() {
  const navigate = useNavigate();

  return (
    <div className="home-elegant">
      {/* Navigation */}
      <nav className="navbar-elegant">
        <div className="nav-container">
          <button className="nav-logo" onClick={() => navigate('/')}>
            <i className="bi bi-box-seam"></i> Inline Tracker
          </button>
          <ul className="nav-menu">
            <li><button onClick={() => navigate('/features')}>Features</button></li>
            <li><button onClick={() => navigate('/about')}>About</button></li>
            <li><button onClick={() => navigate('/contact')}>Contact</button></li>
            <li><button onClick={() => navigate('/login')}>Login</button></li>
            <li><button onClick={() => navigate('/signup')} className="btn-primary-nav">Get Started</button></li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-elegant">
        <div className="hero-background">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">Powerful Features</h1>
          <p className="hero-subtitle">Everything you need to manage your inventory efficiently</p>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="features-elegant">
        <div className="section-container">
          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card expanded">
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
                <li>✓ Barcode scanning</li>
                <li>✓ Stock history</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="feature-card expanded">
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
                <li>✓ Automated notifications</li>
                <li>✓ Invoice generation</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="feature-card expanded">
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
                <li>✓ Attendance tracking</li>
                <li>✓ Shift management</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="feature-card expanded">
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
                <li>✓ Payment terms</li>
                <li>✓ Rating system</li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="feature-card expanded">
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
                <li>✓ Zone management</li>
                <li>✓ Transfer tracking</li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="feature-card expanded">
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
                <li>✓ Multi-language support</li>
                <li>✓ Learning capability</li>
              </ul>
            </div>

            {/* Feature 7 */}
            <div className="feature-card expanded">
              <div className="feature-icon">
                <i className="bi bi-graph-up"></i>
              </div>
              <h3>Analytics & Reports</h3>
              <p>Gain deep insights into your business operations. Generate detailed reports and visualize key metrics for informed decision-making.</p>
              <ul className="feature-list">
                <li>✓ Real-time dashboards</li>
                <li>✓ Custom reports</li>
                <li>✓ Sales analytics</li>
                <li>✓ Trend analysis</li>
                <li>✓ Export functionality</li>
                <li>✓ Performance KPIs</li>
              </ul>
            </div>

            {/* Feature 8 */}
            <div className="feature-card expanded">
              <div className="feature-icon">
                <i className="bi bi-shield-check"></i>
              </div>
              <h3>Security & Compliance</h3>
              <p>Keep your data safe with enterprise-grade security. We ensure compliance with industry standards and data protection regulations.</p>
              <ul className="feature-list">
                <li>✓ End-to-end encryption</li>
                <li>✓ Role-based access control</li>
                <li>✓ Audit logs</li>
                <li>✓ Data backup</li>
                <li>✓ Two-factor authentication</li>
                <li>✓ GDPR compliant</li>
              </ul>
            </div>

            {/* Feature 9 */}
            <div className="feature-card expanded">
              <div className="feature-icon">
                <i className="bi bi-arrow-repeat"></i>
              </div>
              <h3>Integration & Automation</h3>
              <p>Seamlessly integrate with your existing tools. Automate routine tasks and workflows to boost efficiency.</p>
              <ul className="feature-list">
                <li>✓ API integrations</li>
                <li>✓ Workflow automation</li>
                <li>✓ Email notifications</li>
                <li>✓ Scheduled reports</li>
                <li>✓ Third-party apps</li>
                <li>✓ Webhook support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-elegant">
        <div className="section-container">
          <h2>Ready to Transform Your Inventory Management?</h2>
          <p>Start with a free trial and experience the power of Inline Tracker</p>
          <button onClick={() => navigate('/signup')} className="btn-primary-elegant">Get Started Free</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-elegant">
        <div className="section-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Inline Tracker</h4>
              <p>Smart inventory management for modern businesses.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><button onClick={() => navigate('/features')} className="footer-link">Features</button></li>
                <li><button onClick={() => navigate('/about')} className="footer-link">About</button></li>
                <li><button onClick={() => navigate('/contact')} className="footer-link">Contact</button></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Follow Us</h4>
              <div className="social-links">
                <button className="social-link" aria-label="Facebook"><i className="bi bi-facebook"></i></button>
                <button className="social-link" aria-label="Twitter"><i className="bi bi-twitter"></i></button>
                <button className="social-link" aria-label="LinkedIn"><i className="bi bi-linkedin"></i></button>
                <button className="social-link" aria-label="Instagram"><i className="bi bi-instagram"></i></button>
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

export default Features;
