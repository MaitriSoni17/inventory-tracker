import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/login.css';
import '../../styles/validation.css';

function ResetPassword(props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      props.showAlert?.('Reset token is missing. Please request a new link.', 'danger');
      return;
    }

    if (password.length < 6) {
      props.showAlert?.('Password must be at least 6 characters', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      props.showAlert?.('Passwords do not match', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, password, confirmPassword })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setShowSuccess(true);
        props.showAlert?.(data.message || 'Password reset successful. Please log in.', 'success');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        props.showAlert?.(data.error || data.message || 'Unable to reset password', 'danger');
      }
    } catch (error) {
      props.showAlert?.('Could not connect to the server. Please try again.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper w-100 min-vh-100 d-flex align-items-center justify-content-center">
      <div className="login-container d-flex">
        <div className="login-card w-100 justify-content-center">
          <div className="login-content">
            <h1 className="login-title">Reset Password</h1>
            <p className="login-subtitle">Set a new password for your account.</p>

            {!token && (
              <div className="validation-summary" style={{ marginBottom: '1rem' }}>
                <div className="validation-summary-title">This reset link is invalid.</div>
              </div>
            )}

            {showSuccess ? (
              <div className="success-message" style={{ marginBottom: '1rem' }}>
                Password changed successfully. Redirecting to login...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    New Password <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting || !token}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting || !token}
                  />
                </div>

                <button type="submit" className="login-button" disabled={isSubmitting || !token}>
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <div className="login-footer">
              <p>
                Back to <Link to="/login" className="link highlight-link">Login</Link>
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

export default ResetPassword;
