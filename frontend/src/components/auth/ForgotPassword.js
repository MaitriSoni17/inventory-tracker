import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/login.css';
import '../../styles/validation.css';

function ForgotPassword(props) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      props.showAlert?.('Please enter your email address', 'warning');
      return;
    }

    setIsSubmitting(true);
    setInfoMessage('');
    setDevResetLink('');
    setPreviewUrl('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: normalizedEmail })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const message = data.message || 'If an account exists, a reset link has been sent to your email.';
        setInfoMessage(message);
        if (data.resetLink) {
          setDevResetLink(data.resetLink);
        }
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
        props.showAlert?.(message, 'success');
      } else {
        const message = data.error || data.message || 'Unable to process request right now. Please try again.';
        setInfoMessage(message);
        props.showAlert?.(message, 'danger');
      }
    } catch (error) {
      const message = 'Could not connect to the server. Please try again.';
      setInfoMessage(message);
      props.showAlert?.(message, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper w-100 min-vh-100 d-flex align-items-center justify-content-center">
      <div className="login-container d-flex">
        <div className="login-card w-100 justify-content-center">
          <div className="login-content">
            <h1 className="login-title">Forgot Password</h1>
            <p className="login-subtitle">Enter your email to receive reset instructions.</p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {infoMessage && (
                <div className="success-message" style={{ marginBottom: '1rem' }}>
                  {infoMessage}
                </div>
              )}

              {devResetLink && (
                <div className="validation-summary" style={{ marginBottom: '1rem' }}>
                  <div className="validation-summary-title">Development Reset Link</div>
                  <a href={devResetLink} className="link" style={{ wordBreak: 'break-all' }}>
                    {devResetLink}
                  </a>
                </div>
              )}

              {previewUrl && (
                <div className="validation-summary" style={{ marginBottom: '1rem' }}>
                  <div className="validation-summary-title">Email Preview (Development)</div>
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="link" style={{ wordBreak: 'break-all' }}>
                    {previewUrl}
                  </a>
                </div>
              )}

              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="login-footer">
              <p>
                Remembered your password? <Link to="/login" className="link highlight-link">Back to login</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="login-decoration">
          <div className="decoration-shape shape-1"></div>
          <div className="decoration-shape shape-2"></div>
          <div className="decoration-shape shape-3"></div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
