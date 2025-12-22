import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/home.css';

function Contact() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [submitStatus, setSubmitStatus] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Here you would typically send the form data to a backend
        console.log('Form submitted:', formData);
        setSubmitStatus('success');
        setFormData({
            name: '',
            email: '',
            phone: '',
            subject: '',
            message: ''
        });
        setTimeout(() => setSubmitStatus(null), 3000);
    };

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
                    <h1 className="hero-title">Get In Touch</h1>
                    <p className="hero-subtitle">We're here to help. Reach out to us anytime</p>
                </div>
            </section>

            {/* Contact Info Cards */}
            <section className="contact-info-section">
                <div className="section-container">
                    <div className="contact-cards-grid">
                        {/* Email Card */}
                        <div className="contact-info-card">
                            <div className="contact-icon">
                                <i className="bi bi-envelope"></i>
                            </div>
                            <h3>Email</h3>
                            <p className="contact-value">support@inlinetracker.com</p>
                            <p className="contact-desc">Send us your queries anytime</p>
                            <a href="mailto:support@inlinetracker.com" className="contact-link">Send Email</a>
                        </div>

                        {/* Phone Card */}
                        <div className="contact-info-card">
                            <div className="contact-icon">
                                <i className="bi bi-telephone"></i>
                            </div>
                            <h3>Phone</h3>
                            <p className="contact-value">+1 (555) 123-4567</p>
                            <p className="contact-desc">Monday to Friday, 9 AM to 6 PM EST</p>
                            <a href="tel:+15551234567" className="contact-link">Call Now</a>
                        </div>

                        {/* Address Card */}
                        <div className="contact-info-card">
                            <div className="contact-icon">
                                <i className="bi bi-geo-alt"></i>
                            </div>
                            <h3>Office Address</h3>
                            <p className="contact-value">123 Business Street</p>
                            <p className="contact-desc">New York, NY 10001, USA</p>
                            <button className="contact-link border-0 bg-transparent p-0" onClick={() => window.open('https://maps.google.com')}>Get Directions</button>
                        </div>

                        {/* Live Chat Card */}
                        <div className="contact-info-card">
                            <div className="contact-icon">
                                <i className="bi bi-chat-left-text"></i>
                            </div>
                            <h3>Live Chat</h3>
                            <p className="contact-value">Start a conversation</p>
                            <p className="contact-desc">Instant support from our team</p>
                            <button className="contact-link">Open Chat</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Form Section */}
            <section className="contact-form-section">
                <div className="section-container">
                    <div className="form-container">
                        <div className="form-header">
                            <h2>Send Us a Message</h2>
                            <p>We'll get back to you as soon as possible</p>
                        </div>

                        {submitStatus === 'success' && (
                            <div className="success-message">
                                <i className="bi bi-check-circle"></i>
                                <span>Thank you! Your message has been sent successfully.</span>
                            </div>
                        )}

                        <form className="contact-form" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="name">Full Name *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        placeholder="Your Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email Address *</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="your@email.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        placeholder="+1 (555) 123-4567"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="subject">Subject *</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        placeholder="How can we help?"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="message">Message *</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    placeholder="Tell us more about your inquiry..."
                                    rows="6"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                            </div>

                            <button type="submit" className="btn-primary-elegant">Send Message</button>
                        </form>
                    </div>

                    {/* FAQ Section */}
                    <div className="faq-container">
                        <h2 className="faq-title">Frequently Asked Questions</h2>
                        <div className="faq-grid">
                            <div className="faq-item">
                                <div className="faq-icon">
                                    <i className="bi bi-clock"></i>
                                </div>
                                <h4>How quickly will I hear back?</h4>
                                <p>We aim to respond to all inquiries within 24 hours. For urgent matters, please call our phone number.</p>
                            </div>
                            <div className="faq-item">
                                <div className="faq-icon">
                                    <i className="bi bi-headset"></i>
                                </div>
                                <h4>What's your customer support availability?</h4>
                                <p>Our support team is available Monday to Friday, 9 AM to 6 PM EST. We also provide 24/7 support for premium customers.</p>
                            </div>
                            <div className="faq-item">
                                <div className="faq-icon">
                                    <i className="bi bi-calendar-check"></i>
                                </div>
                                <h4>Can I schedule a demo?</h4>
                                <p>Absolutely! Please contact us via email or phone to schedule a personalized demo with our team.</p>
                            </div>
                            <div className="faq-item">
                                <div className="faq-icon">
                                    <i className="bi bi-book"></i>
                                </div>
                                <h4>Do you offer training?</h4>
                                <p>Yes, we provide comprehensive training and onboarding for all new customers. Contact us for details.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section className="map-section">
                <div className="section-container">
                    <h2>Find Us</h2>
                    <div className="map-container">
                        <iframe
                            title="Inline Tracker Location"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.1234567890!2d-74.0060!3d40.7128!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a27ba5db9ab%3A0x0!2s123%20Business%20Street%2C%20New%20York%2C%20NY%2010001!5e0!3m2!1sen!2sus!4v1234567890"
                            width="100%"
                            height="400"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-elegant">
                <div className="section-container">
                    <h2>Ready to Get Started?</h2>
                    <p>Join thousands of businesses using Inline Tracker</p>
                    <button onClick={() => navigate('/signup')} className="btn-primary-elegant">Start Free Trial</button>
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

export default Contact;
