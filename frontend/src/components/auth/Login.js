import { useState } from 'react'
import { Link, useNavigate } from "react-router-dom";
import validationRules from '../../utils/validationHelper';
import { useRole } from '../../context/RoleContext';
import '../../styles/login.css';
import '../../styles/validation.css';

function Login(props) {
    const [credentials, setCredentials] = useState({ email: "", password: "" })
    const [errors, setErrors] = useState({})
    const [touched, setTouched] = useState({})
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { setRole, fetchUserRole } = useRole();

    const passVisibility = () => {
        setShowPassword(prev => !prev);
    }

    let history = useNavigate();

    const validateEmail = (email) => {
        const emailError = validationRules.required(email, 'Email');
        if (emailError) return emailError;
        return validationRules.email(email);
    };

    const validatePassword = (password) => {
        return validationRules.required(password, 'Password');
    };

    const validateForm = () => {
        const newErrors = {};
        
        const emailError = validateEmail(credentials.email);
        if (emailError) newErrors.email = emailError;

        const passwordError = validatePassword(credentials.password);
        if (passwordError) newErrors.password = passwordError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) {
            return;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const normalizedPassword = credentials.password;

        if (normalizedEmail !== credentials.email) {
            setCredentials((prev) => ({ ...prev, email: normalizedEmail }));
        }
        
        if (!validateForm()) {
            props.showAlert("Please fix the errors in the form", "danger");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword })
            });
            const json = await response.json();

            if (response.ok && json.success) {
                localStorage.setItem('token', json.authtoken);
                localStorage.setItem('role', json.role);
                localStorage.setItem('userId', json.userId || '');
                if (json.mustChangePassword === true && json.role !== 'businessowner') {
                    localStorage.setItem('forcePasswordChange', 'true');
                } else {
                    localStorage.removeItem('forcePasswordChange');
                }
                // Update role in context immediately and fetch full user data
                setRole(json.role);
                await fetchUserRole();
                if (json.reactivated === true) {
                    props.showAlert("Your account has been reactivated and you are logged in successfully", "success");
                } else {
                    props.showAlert("Logged in Successfully", "success");
                }
                history("/dashboard");
            }
            else {
                // Handle specific error codes
                if (json?.code === 'ACCOUNT_DEACTIVATED') {
                    props.showAlert(
                        `Your ${json.userRole} account has been deactivated. Please contact your Business Owner to reactivate it.`,
                        "warning"
                    );
                } else {
                    const apiError = json?.error || json?.message;
                    const validationError = Array.isArray(json?.errors) ? json.errors[0]?.msg : null;
                    props.showAlert(apiError || validationError || "Invalid Email or Password", "danger")
                }
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
        }
    }

    return (
        <div className='login-wrapper w-100 min-vh-100 d-flex align-items-center justify-content-center'>
            <div className="login-container d-flex">
                <div className="login-card w-100 justify-content-center">
                    <div className="login-header">
                        <button className="logo-button" onClick={() => history('/')}>
                            <i className="bi bi-box-seam"></i>
                            <span>Inline Tracker</span>
                        </button>
                    </div>

                    <div className="login-content">
                        <h1 className="login-title">Welcome Back</h1>
                        <p className="login-subtitle">Sign in to your account to continue</p>

                        {Object.keys(errors).length > 0 && touched.email && (
                            <div className="validation-summary">
                                <div className="validation-summary-title">
                                    Please fix the following errors:
                                </div>
                                <ul className="validation-summary-list">
                                    {errors.email && <li>{errors.email}</li>}
                                    {errors.password && <li>{errors.password}</li>}
                                </ul>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">
                                    Email Address <span className="required">*</span>
                                </label>
                                <input
                                    type="email"
                                    name='email'
                                    id="email"
                                    placeholder="you@example.com"
                                    value={credentials.email}
                                    onChange={onChange}
                                    onBlur={() => onBlur('email')}
                                    className={`form-input ${errors.email && touched.email ? 'is-invalid' : ''} ${!errors.email && touched.email && credentials.email ? 'is-valid' : ''}`}
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
                                <div className='password-input-group'>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        onChange={onChange}
                                        onBlur={() => onBlur('password')}
                                        className={`password-input ${errors.password && touched.password ? 'is-invalid' : ''} ${!errors.password && touched.password && credentials.password ? 'is-valid' : ''}`}
                                        name='password'
                                        id="password"
                                        placeholder="••••••••"
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

                            <div className="forgot-password-link">
                                <Link to="/forgot-password" className="link">Forgot Password?</Link>
                            </div>

                            <button type="submit" className="login-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p>Don't have an account? <Link to='/signup' className="link highlight-link">Sign up for free</Link></p>
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

export default Login;

