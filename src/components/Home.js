import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomepageChatbot from './HomepageChatbot';
import Navigation from './Navigation';
import './styles/home.css';
import Footer from './Footer';

function Home() {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: 'Sarah Johnson',
      company: 'Tech Supplies Co.',
      text: 'Reduced inventory errors by 80% and gained complete warehouse visibility.',
      avatar: 'SJ'
    },
    {
      name: 'Mike Chen',
      company: 'Retail Plus',
      text: 'AI chatbot saves us hours every week with instant insights.',
      avatar: 'MC'
    },
    {
      name: 'Emily Rodriguez',
      company: 'Logistics Experts',
      text: 'Seamless implementation with fantastic support.',
      avatar: 'ER'
    }
  ];

  return (
    <div className="home-elegant">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="hero-elegant">
        <div className="hero-content">
          <h1>Inventory Management<br/><span className="highlight">Simplified</span></h1>
          <p>Smart, AI-powered inventory tracking that saves time and reduces costs. Perfect for businesses of all sizes.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary-elegant" onClick={() => navigate('/signup')}>Start Free Trial</button>
            <button className="btn btn-secondary-elegant" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-elegant">
        <h2>Why Choose Inline Tracker?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><i className="bi bi-speedometer2"></i></div>
            <h3>Real-time Tracking</h3>
            <p>Track inventory across all locations instantly with our intuitive dashboard.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="bi bi-robot"></i></div>
            <h3>AI Assistant</h3>
            <p>Get intelligent insights and recommendations powered by advanced AI.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="bi bi-graph-up"></i></div>
            <h3>Smart Analytics</h3>
            <p>Make data-driven decisions with comprehensive reports and forecasting.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><i className="bi bi-shield-check"></i></div>
            <h3>Enterprise Security</h3>
            <p>Your data is protected with bank-level encryption and compliance.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Sign Up</h3>
            <p>Create your account in seconds</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Connect</h3>
            <p>Integrate with your systems</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Track</h3>
            <p>Monitor inventory in real-time</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Optimize</h3>
            <p>Use AI insights to improve</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-elegant">
        <h2>What Our Customers Say</h2>
        <div className="testimonial-container">
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>"{testimonials[currentTestimonial].text}"</p>
            <div className="customer-info">
              <div className="avatar">{testimonials[currentTestimonial].avatar}</div>
              <div>
                <h4>{testimonials[currentTestimonial].name}</h4>
                <small>{testimonials[currentTestimonial].company}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="testimonial-dots">
          {testimonials.map((_, idx) => (
            <hr 
              key={idx} 
              className={`dot shadow ${idx === currentTestimonial ? 'active' : ''}`}
              onClick={() => setCurrentTestimonial(idx)}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-elegant">
        <h2>Simple, Transparent Pricing</h2>
        <div className="pricing-cards">
          <div className="price-card">
            <h3>Starter</h3>
            <p className="price">Free</p>
            <ul>
              <li>✓ Up to 1,000 items</li>
              <li>✓ Basic dashboard</li>
              <li>✓ Email support</li>
            </ul>
            <button className="btn btn-outline" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
          <div className="price-card featured">
            <h3>Professional</h3>
            <p className="price">$49<span>/month</span></p>
            <ul>
              <li>✓ Unlimited items</li>
              <li>✓ Advanced analytics</li>
              <li>✓ AI chatbot</li>
              <li>✓ Priority support</li>
            </ul>
            <button className="btn btn-primary-elegant" onClick={() => navigate('/signup')}>Start Trial</button>
          </div>
          <div className="price-card">
            <h3>Enterprise</h3>
            <p className="price">Custom</p>
            <ul>
              <li>✓ Everything in Pro</li>
              <li>✓ Custom integrations</li>
              <li>✓ Dedicated account manager</li>
              <li>✓ SLA guarantee</li>
            </ul>
            <button className="btn btn-outline" onClick={() => navigate('/contact')}>Contact Us</button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-elegant">
        <h2 className='text-white'>Ready to Transform Your Inventory?</h2>
        <p className='text-muted'>Join hundreds of businesses using Inline Tracker</p>
        <div className="cta-buttons">
          <button className="btn btn-primary-elegant" onClick={() => navigate('/signup')}>Start Free 14-Day Trial</button>
          <button className="btn btn-secondary-elegant" onClick={() => navigate('/login')}>Already a member? Sign In</button>
        </div>
      </section>

      <Footer />  

      <HomepageChatbot />
    </div>
  );
}

export default Home;


