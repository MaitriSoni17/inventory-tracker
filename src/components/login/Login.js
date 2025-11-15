import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
        console.log(json);
        console.log(credentials.email)
        if (json.success) {
            localStorage.setItem('token', json.authtoken);
            // props.showAlert("Loged in Successfully", "success")
            history("/signup");
        }
        else {
            // props.showAlert("Invalid Details", "danger")
        }
    }
    const onChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value })
    }
    return (
        <div className='container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-login'>
            <div className="scene-container w-75 p-5 d-flex align-items-center justify-content-center rounded-3 shadow-lg">

                <div className="abstract-shape shape-1"></div>
                <div className="abstract-shape shape-2"></div>
                <div className="abstract-shape shape-3"></div>
                <div className="abstract-shape shape-4"></div>

                <div className="login-card p-5 rounded-5 w-50 my-5 position-relative">

                    <h1 className="logo-font text-white text-center mb-4 fw-semibold">
                        Inline Tracker
                    </h1>

                    <h2 className="text-white h5 mb-4 text-center fw-normal">
                        Login
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label small text-secondary mb-1">Email</label>
                            <input type="email" name='email' id="email" placeholder="username@gmail.com" onChange={onChange}
                                className="form-control bg-white text-secondary p-2 rounded-3 border-1" required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="password" className="form-label small text-secondary mb-1">Password</label>
                            <div className='input-group mb-3'>
                                <input type={showPassword ? "text" : "password"} onChange={onChange} className='form-control' name='password' id="password" placeholder="••••••••" required/><i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"} fs-4 text-primary input-group-text bg-white`} onClick={passVisibility}></i>
                            </div>
                        </div>

                        <div className="text-end mb-3">
                            <a href="#" className="small text-secondary text-decoration-none">Forgot Password?</a>
                        </div>

                        <input type="submit" className="btn btn-primary w-100 py-2" value='Sign in'/>
                    </form>

                    <div className="text-center mt-4 small text-secondary">Don't have an account yet?
                        <span><a href='/signup' className="text-decoration-none">Register for free</a></span>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default Login;