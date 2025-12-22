import React, { useState } from 'react'
import { Link, useNavigate } from "react-router-dom";
import '../styles/login.css';

function Login(props) {
    const [credentials, setCredentials] = useState({ email: "", password: "" })
    const [showPassword, setShowPassword] = useState(false);
    const passVisibility = () => {
        setShowPassword(prev => !prev);
    }
    let history = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch("http://localhost:5000/api/auth/login", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: credentials.email, password: credentials.password })
        });
        const json = await response.json();
        // console.log(json);
        if (json.success) {
            localStorage.setItem('token', json.authtoken);
            localStorage.setItem('role', json.role);
            localStorage.setItem('userId', json.userId || '');
            props.showAlert("Loged in Successfully", "success")
            // console.log(json.role)
            history("/dashboard");

        }
        else {
            props.showAlert("Invalid Details", "danger")
        }
    }
    const onChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value })
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

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    name='email'
                                    id="email"
                                    placeholder="you@example.com"
                                    onChange={onChange}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Password</label>
                                <div className='password-input-group'>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        onChange={onChange}
                                        className='password-input'
                                        name='password'
                                        id="password"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className='password-toggle'
                                        onClick={passVisibility}
                                    >
                                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="forgot-password-link">
                                <Link to="/" className="link">Forgot Password?</Link>
                            </div>

                            <button type="submit" className="login-button">Sign In</button>
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