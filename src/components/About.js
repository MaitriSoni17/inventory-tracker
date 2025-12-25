import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import './styles/home.css';
import Footer from './Footer';
import HomepageChatbot from './HomepageChatbot';

function About() {
  const navigate = useNavigate();

  const team = [
    {
      name: 'John Smith',
      role: 'Founder & CEO',
      image: '👨‍💼'
    },
    {
      name: 'Sarah Johnson',
      role: 'CTO',
      image: '👩‍💻'
    },
    {
      name: 'Michael Chen',
      role: 'Head of Product',
      image: '👨‍💼'
    },
    {
      name: 'Emily Davis',
      role: 'Lead Designer',
      image: '👩‍🎨'
    }
  ];

  return (
    <div className="home-elegant">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="hero-elegant">
        <div className="hero-background">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <div className="hero-content ms-5 mt-5">
          <h1 className="hero-title">About Inline Tracker</h1>
          <p className="hero-subtitle">Empowering businesses with intelligent inventory management</p>
        </div>
      </section>

      {/* Main About Section */}
      <section className="main-about-section">
        <div className="section-container">
          <div className="about-grid">
            <div className="about-content">
              <h2 className="section-title">Our Story</h2>
              <p className="about-text">
                Inline Tracker was born from a simple observation: small and medium-sized businesses were struggling with inventory management. Existing solutions were either too complex, too expensive, or both. We decided to build something different.
              </p>
              <p className="about-text">
                Founded in 2023, our mission has always been to democratize access to enterprise-grade inventory management tools. We believe that every business, regardless of size, deserves powerful tools to manage their supply chain efficiently.
              </p>
              <p className="about-text">
                Today, over 1000+ active users from 50+ companies trust Inline Tracker to manage their inventory operations. We continue to innovate and improve our platform to meet the evolving needs of our customers.
              </p>
            </div>

            <div className="about-image">
              <div className="about-visual">
                <div className="visual-highlights">
                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <i className="bi bi-lightning-fill"></i>
                    </div>
                    <h4>Fast Implementation</h4>
                    <p>Get started in minutes, not months</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <i className="bi bi-shield-check"></i>
                    </div>
                    <h4>Enterprise Security</h4>
                    <p>Bank-level data protection</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <i className="bi bi-graph-up"></i>
                    </div>
                    <h4>Real-time Insights</h4>
                    <p>Data-driven decisions instantly</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="mission-vision-section">
        <div className="section-container">
          <div className="mission-vision-grid">
            <div className="mission-card-full">
              <div className="card-icon-wrapper">
                <div className="card-icon">
                  <i className="bi bi-rocket-takeoff"></i>
                </div>
              </div>
              <h3>Our Mission</h3>
              <p>To empower businesses with intelligent inventory management tools that reduce costs, improve efficiency, and enhance decision-making through real-time data and AI-powered insights.</p>
              <div className="card-accent"></div>
            </div>
            <div className="vision-card-full">
              <div className="card-icon-wrapper">
                <div className="card-icon">
                  <i className="bi bi-eye-fill"></i>
                </div>
              </div>
              <h3>Our Vision</h3>
              <p>To become the leading inventory management platform for small and medium-sized businesses, enabling them to compete with larger enterprises through technology.</p>
              <div className="card-accent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="section-container">
          <h2 className="section-title">Our Impact</h2>
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
            <div className="stat-card">
              <h4 className="stat-number">2+</h4>
              <p className="stat-label">Years Active</p>
            </div>
            <div className="stat-card">
              <h4 className="stat-number">100%</h4>
              <p className="stat-label">Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="section-container">
          <h2 className="section-title">Our Values</h2>
          <div className="values-grid">
            <div className="value-item">
              <div className="value-icon">🎯</div>
              <h3>Accuracy</h3>
              <p>We believe in precision and reliability. Our system ensures accurate inventory tracking at all times.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">⚡</div>
              <h3>Efficiency</h3>
              <p>We focus on streamlining operations and eliminating waste. Every feature is designed for maximum productivity.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">🔐</div>
              <h3>Security</h3>
              <p>Your data security is paramount. We employ enterprise-grade encryption and compliance standards.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">🤝</div>
              <h3>Support</h3>
              <p>We're committed to your success. Our dedicated support team is available 24/7 to help.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">💡</div>
              <h3>Innovation</h3>
              <p>We constantly improve and innovate. AI and machine learning are at the heart of our platform.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">🌍</div>
              <h3>Sustainability</h3>
              <p>We're committed to sustainable business practices and environmental responsibility.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="section-container">
          <h2 className="section-title">Meet Our Team</h2>
          <p className="section-subtitle text-start">Talented professionals dedicated to your success</p>
          <div className="team-grid">
            {team.map((member, index) => (
              <div key={index} className="team-card">
                <div className="team-image">{member.image}</div>
                <h3>{member.name}</h3>
                <p className="team-role">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-elegant">
        <div className="section-container">
          <h2 className='text-white'>Join Thousands of Satisfied Customers</h2>
          <p className='text-muted'>Experience the difference that smart inventory management can make</p>
          <button onClick={() => navigate('/signup')} className="btn btn-primary-elegant p-3 rounded-pill">Start Free Trial</button>
        </div>
      </section>

      <Footer />
      <HomepageChatbot />
    </div>
  );
}

export default About;


