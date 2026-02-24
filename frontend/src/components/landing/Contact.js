import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import validationRules from '../../utils/validationHelper';
import '../../styles/home.css';
import '../../styles/validation.css';
import Footer from '../common/Footer';
import HomepageChatbot from './HomepageChatbot';

function Contact() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [chatOpen, setChatOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [submitStatus, setSubmitStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors = {};

        const nameError = validationRules.required(formData.name, 'Name');
        if (nameError) newErrors.name = nameError;

        const emailError = validationRules.required(formData.email, 'Email');
        if (emailError) {
            newErrors.email = emailError;
        } else {
            const emailValidError = validationRules.email(formData.email);
            if (emailValidError) newErrors.email = emailValidError;
        }

        const subjectError = validationRules.required(formData.subject, 'Subject');
        if (subjectError) newErrors.subject = subjectError;

        const messageError = validationRules.required(formData.message, 'Message');
        if (messageError) {
            newErrors.message = messageError;
        } else {
            const lengthError = validationRules.minLength(formData.message, 10, 'Message');
            if (lengthError) newErrors.message = lengthError;
        }

        if (formData.phone) {
            const phoneError = validationRules.phone(formData.phone);
            if (phoneError) newErrors.phone = phoneError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleBlur = (fieldName) => {
        setTouched({ ...touched, [fieldName]: true });

        // Validate individual field
        let error = '';
        if (fieldName === 'name') {
            error = validationRules.required(formData.name, 'Name');
        } else if (fieldName === 'email') {
            error = validationRules.required(formData.email, 'Email');
            if (!error) error = validationRules.email(formData.email);
        } else if (fieldName === 'phone' && formData.phone) {
            error = validationRules.phone(formData.phone);
        } else if (fieldName === 'subject') {
            error = validationRules.required(formData.subject, 'Subject');
        } else if (fieldName === 'message') {
            error = validationRules.required(formData.message, 'Message');
            if (!error) error = validationRules.minLength(formData.message, 10, 'Message');
        }

        if (error) {
            setErrors({ ...errors, [fieldName]: error });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            setSubmitStatus('error');
            setTimeout(() => setSubmitStatus(null), 3000);
            return;
        }

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setSubmitStatus('success');
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
            });
            setTouched({});
            setIsSubmitting(false);
            setTimeout(() => setSubmitStatus(null), 3000);
        }, 1000);
    };

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
                <div className="hero-content ms-4 mt-5">
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
                            <button className="contact-link" onClick={() => setChatOpen(true)}>Open Chat</button>
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
                            <div className="validation-summary" style={{ backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' }}>
                                <div className="validation-summary-title" style={{ color: '#065f46' }}>
                                    Success!
                                </div>
                                <p style={{ color: '#047857', margin: 0 }}>Thank you! Your message has been sent successfully. We'll get back to you soon.</p>
                            </div>
                        )}

                        {submitStatus === 'error' && Object.keys(errors).length > 0 && (
                            <div className="validation-summary">
                                <div className="validation-summary-title">
                                    Please fix the following errors:
                                </div>
                                <ul className="validation-summary-list">
                                    {errors.name && <li>{errors.name}</li>}
                                    {errors.email && <li>{errors.email}</li>}
                                    {errors.phone && <li>{errors.phone}</li>}
                                    {errors.subject && <li>{errors.subject}</li>}
                                    {errors.message && <li>{errors.message}</li>}
                                </ul>
                            </div>
                        )}

                        <form className="contact-form" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="name">Full Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        placeholder="Your Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('name')}
                                        className={`form-control ${errors.name && touched.name ? 'is-invalid' : ''} ${!errors.name && touched.name && formData.name ? 'is-valid' : ''}`}
                                        disabled={isSubmitting}
                                    />
                                    {errors.name && touched.name && (
                                        <div className="error-message">{errors.name}</div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email Address <span className="required">*</span></label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="your@email.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('email')}
                                        className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''} ${!errors.email && touched.email && formData.email ? 'is-valid' : ''}`}
                                        disabled={isSubmitting}
                                    />
                                    {errors.email && touched.email && (
                                        <div className="error-message">{errors.email}</div>
                                    )}
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
                                        onBlur={() => handleBlur('phone')}
                                        className={`form-control ${errors.phone && touched.phone ? 'is-invalid' : ''} ${!errors.phone && touched.phone && formData.phone ? 'is-valid' : ''}`}
                                        disabled={isSubmitting}
                                    />
                                    {errors.phone && touched.phone && (
                                        <div className="error-message">{errors.phone}</div>
                                    )}
                                    {!errors.phone && !touched.phone && (
                                        <div className="info-message">Optional - 10 digit number</div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="subject">Subject <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        placeholder="How can we help?"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('subject')}
                                        className={`form-control ${errors.subject && touched.subject ? 'is-invalid' : ''} ${!errors.subject && touched.subject && formData.subject ? 'is-valid' : ''}`}
                                        disabled={isSubmitting}
                                    />
                                    {errors.subject && touched.subject && (
                                        <div className="error-message">{errors.subject}</div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="message">Message <span className="required">*</span></label>
                                <textarea
                                    id="message"
                                    name="message"
                                    placeholder="Tell us more about your inquiry..."
                                    rows="6"
                                    value={formData.message}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('message')}
                                    className={`form-control ${errors.message && touched.message ? 'is-invalid' : ''} ${!errors.message && touched.message && formData.message ? 'is-valid' : ''}`}
                                    disabled={isSubmitting}
                                ></textarea>
                                {errors.message && touched.message && (
                                    <div className="error-message">{errors.message}</div>
                                )}
                                {!errors.message && formData.message && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                        {formData.message.length} characters
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn btn-primary-elegant" disabled={isSubmitting}>
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

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
                    <h2 className='text-white'>Ready to Get Started?</h2>
                    <p className='text-muted'>Join thousands of businesses using Inline Tracker</p>
                    <button onClick={() => navigate('/signup')} className="btn btn-primary-elegant p-3 rounded-pill">Start Free Trial</button>
                </div>
            </section>

            <Footer />
            <HomepageChatbot externalOpen={chatOpen} onExternalOpenHandled={() => setChatOpen(false)} />
        </div>
    );
}

export default Contact;


