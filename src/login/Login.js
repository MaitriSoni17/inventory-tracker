import React, { useState } from 'react'

import '../styles/login.css';
function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const passVisibility = () => {
        setShowPassword(prev => !prev);
    }
    return (
        <>
            <div className='d-flex align-items-center justify-content-center min-vh-100 ms-5 me-5'>
                <div className="scene-container w-75 p-5 d-flex align-items-center justify-content-center rounded-3 m-5">

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

                        <form>
                            <div className="mb-3">
                                <label for="email" className="form-label small text-secondary mb-1">Email</label>
                                <input type="email" id="email" placeholder="username@gmail.com"
                                    className="form-control bg-white text-secondary p-2 rounded-3 border-1"
                                />
                            </div>

                            <div className="mb-4">
                                <label for="password" className="form-label small text-secondary mb-1">Password</label>
                                <div className='input-group mb-3'>
                                    <input type={showPassword ? "text" : "password"} className='form-control' id="password" placeholder="••••••••" /><i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"} fs-4 text-primary input-group-text bg-white`} onClick={passVisibility}></i>
                                </div>
                            </div>

                            <div className="text-end mb-3">
                                <a href="#" className="small text-secondary text-decoration-none">Forgot Password?</a>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 py-2">Sign in</button>
                        </form>

                        <div className="text-center mt-4 small text-secondary">Don't have an account yet?
                            <span><a href="signup.html" className="text-decoration-none">Register for free</a></span>
                        </div>

                    </div>

                </div>
            </div>
        </>
    );
}

export default Login;