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
    <>
      <div className='main-container d-flex justify-content-center align-items-center'>
        <div className="signup-card p-4 shadow-lg w-50 p-5 rounded-5 border-1 m-5">

          <h1 className="text-center mb-4 app-title">Inline Tracker</h1>
          <p className="text-center fs-5 mb-4">Sign up</p>

          <form  onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input type="email" className="form-control text-secondary p-2 rounded-3 border-1" id="email" onChange={onChange} name='email'
                placeholder="Email address" required />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label small text-secondary mb-1">Password</label>
              <div className='input-group mb-3 gap-0'>
                <input type={showPassword ? "text" : "password"} className='form-control' name='password' id="password" placeholder="••••••••" onChange={onChange} minLength={5} /><i className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white`} onClick={passVisibility}></i>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="cPassword" className="form-label small text-secondary mb-1">Confirm Password</label>
              <div className='input-group mb-3 gap-0'>
                <input type={showCPassword ? "text" : "password"} name='cpassword' minLength={5} className='form-control' id="cpassword" placeholder="••••••••" onChange={onChange} /><i className={`bi ${showCPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white`} onClick={cpassVisibility}></i>
              </div>
            </div>

            <div className="d-grid gap-2">
              <input type="submit"
                className="btn btn-custom-purple btn-lg" value="Sign Up" />
            </div>

            <div className="text-center mt-3 login-link-container">
              Already have an account? <Link to='/' className="login-link">Login Now!!</Link>
            </div>
          </form>
        </div>

      </div>
    </>
  )
}

export default SignUp