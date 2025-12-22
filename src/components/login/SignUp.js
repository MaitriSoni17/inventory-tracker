import React, { useState } from 'react'
import { Link, useNavigate } from "react-router-dom";
import '../styles/signup.css';

function SignUp(props) {
  const [credentials, setCredentials] = useState({ email: "", password: "", cpassword: "" })
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const passVisibility = () => {
    setShowPassword(prev => !prev);
  }
  const cpassVisibility = () => {
    setShowCPassword(prev => !prev);
  }
  let navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (credentials.password !== credentials.cpassword) {
      props.showAlert("Password and Confirm Password Both are must be same!!", "danger")
    }
    else {
      const { email, password } = credentials;
      const response = await fetch("http://localhost:5000/api/businessowner/createbusinessowner", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const json = await response.json();
      console.log(json);
      console.log(json.success)
      if (json.success) {
        localStorage.setItem('token', json.authtoken);
        navigate("/");
        props.showAlert("Account Created Successfully", "success")
      }
      else {
        props.showAlert("Invalid Credentials", "danger")
      }
    }
  }
  const onChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value })
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

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  id="email"
                  onChange={onChange}
                  name='email'
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <div className='password-input-group'>
                  <input
                    type={showPassword ? "text" : "password"}
                    className='password-input'
                    name='password'
                    id="password"
                    placeholder="••••••••"
                    onChange={onChange}
                    minLength={5}
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

              <div className="form-group">
                <label htmlFor="cPassword" className="form-label">Confirm Password</label>
                <div className='password-input-group'>
                  <input
                    type={showCPassword ? "text" : "password"}
                    name='cpassword'
                    minLength={5}
                    className='password-input'
                    id="cpassword"
                    placeholder="••••••••"
                    onChange={onChange}
                    required
                  />
                  <button
                    type="button"
                    className='password-toggle'
                    onClick={cpassVisibility}
                  >
                    <i className={`bi ${showCPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="signup-button">Create Account</button>
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