import React, { useState } from 'react'
import { Link, useNavigate } from "react-router-dom";
import validationRules from '../../utils/validationHelper';
import '../styles/signup.css';
import '../styles/validation.css';

function SignUp(props) {
  const [credentials, setCredentials] = useState({ email: "", password: "", cpassword: "" })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passVisibility = () => {
    setShowPassword(prev => !prev);
  }
  const cpassVisibility = () => {
    setShowCPassword(prev => !prev);
  }

  let navigate = useNavigate();

  const validateEmail = (email) => {
    const emailError = validationRules.required(email, 'Email');
    if (emailError) return emailError;
    return validationRules.email(email);
  };

  const validatePassword = (password) => {
    const requiredError = validationRules.required(password, 'Password');
    if (requiredError) return requiredError;
    const lengthError = validationRules.minLength(password, 6, 'Password');
    if (lengthError) return lengthError;
    return '';
  };

  const validateConfirmPassword = (password, cpassword) => {
    return validationRules.confirmPassword(password, cpassword);
  };

  const validateForm = () => {
    const newErrors = {};

    const emailError = validateEmail(credentials.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(credentials.password);
    if (passwordError) newErrors.password = passwordError;

    const cpasswordError = validateConfirmPassword(credentials.password, credentials.cpassword);
    if (cpasswordError) newErrors.cpassword = cpasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      props.showAlert("Please fix the errors in the form", "danger");
      return;
    }

    setIsSubmitting(true);
    try {
      const { email, password } = credentials;
      const response = await fetch("http://localhost:5000/api/businessowner/createbusinessowner", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const json = await response.json();

      if (json.success) {
        localStorage.setItem('token', json.authtoken);
        navigate("/login");
        props.showAlert("Account Created Successfully", "success")
      }
      else {
        props.showAlert(json.message || "Invalid Credentials", "danger")
      }
    } catch (error) {
      props.showAlert("Connection error. Please try again.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value })
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  }

  const onBlur = (fieldName) => {
    setTouched({ ...touched, [fieldName]: true });

    // Validate on blur
    if (fieldName === 'email') {
      const error = validateEmail(credentials.email);
      if (error) {
        setErrors({ ...errors, email: error });
      }
    } else if (fieldName === 'password') {
      const error = validatePassword(credentials.password);
      if (error) {
        setErrors({ ...errors, password: error });
      }
    } else if (fieldName === 'cpassword') {
      const error = validateConfirmPassword(credentials.password, credentials.cpassword);
      if (error) {
        setErrors({ ...errors, cpassword: error });
      }
    }
  }

  return (
    <div className='signup-wrapper w-100 min-vh-100 d-flex align-items-center justify-content-center'>
      <div className="signup-container d-flex">
        <div className="signup-card w-100 justify-content-center">
          <div className="signup-header">
            <button className="logo-button" onClick={() => navigate('/')}>
              <i className="bi bi-box-seam"></i>
              <span>Inline Tracker</span>
            </button>
          </div>

          <div className="signup-content">
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">Join us and start managing your inventory efficiently</p>

            {Object.keys(errors).length > 0 && (touched.email || touched.password || touched.cpassword) && (
              <div className="validation-summary">
                <div className="validation-summary-title">
                  Please fix the following errors:
                </div>
                <ul className="validation-summary-list">
                  {errors.email && <li>{errors.email}</li>}
                  {errors.password && <li>{errors.password}</li>}
                  {errors.cpassword && <li>{errors.cpassword}</li>}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  className={`form-input ${errors.email && touched.email ? 'is-invalid' : ''} ${!errors.email && touched.email && credentials.email ? 'is-valid' : ''}`}
                  id="email"
                  onChange={onChange}
                  onBlur={() => onBlur('email')}
                  name='email'
                  placeholder="you@example.com"
                  value={credentials.email}
                  disabled={isSubmitting}
                />
                {errors.email && touched.email && (
                  <div className="error-message">{errors.email}</div>
                )}
                {!errors.email && touched.email && credentials.email && (
                  <div className="success-message">Email looks good!</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password <span className="required">*</span>
                </label>
                <p className="info-message" style={{ marginBottom: '0.5rem' }}>
                  Minimum 6 characters
                </p>
                <div className='password-input-group'>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`password-input ${errors.password && touched.password ? 'is-invalid' : ''} ${!errors.password && touched.password && credentials.password ? 'is-valid' : ''}`}
                    name='password'
                    id="password"
                    placeholder="••••••••"
                    onChange={onChange}
                    onBlur={() => onBlur('password')}
                    minLength={6}
                    value={credentials.password}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className='password-toggle'
                    onClick={passVisibility}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
                {errors.password && touched.password && (
                  <div className="error-message">{errors.password}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="cPassword" className="form-label">
                  Confirm Password <span className="required">*</span>
                </label>
                <div className='password-input-group'>
                  <input
                    type={showCPassword ? "text" : "password"}
                    name='cpassword'
                    minLength={6}
                    className={`password-input ${errors.cpassword && touched.cpassword ? 'is-invalid' : ''} ${!errors.cpassword && touched.cpassword && credentials.cpassword ? 'is-valid' : ''}`}
                    id="cpassword"
                    placeholder="••••••••"
                    onChange={onChange}
                    onBlur={() => onBlur('cpassword')}
                    value={credentials.cpassword}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className='password-toggle'
                    onClick={cpassVisibility}
                  >
                    <i className={`bi ${showCPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
                {errors.cpassword && touched.cpassword && (
                  <div className="error-message">{errors.cpassword}</div>
                )}
                {!errors.cpassword && touched.cpassword && credentials.cpassword && (
                  <div className="success-message">Passwords match!</div>
                )}
              </div>

              <button type="submit" className="signup-button" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="signup-footer">
              <p>Already have an account? <Link to='/login' className="link highlight-link">Sign in here</Link></p>
            </div>
          </div>
        </div>

        <div className="signup-decoration">
          <div className="decoration-shape shape-1"></div>
          <div className="decoration-shape shape-2"></div>
          <div className="decoration-shape shape-3"></div>
        </div>
      </div>
    </div>
  )
}

export default SignUp

