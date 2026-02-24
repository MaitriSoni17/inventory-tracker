import { useState } from 'react';

function CreateSupplier(props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showCPassword, setShowCPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const passVisibility = () => {
        setShowPassword(prev => !prev);
    }
    const cpassVisibility = () => {
        setShowCPassword(prev => !prev);
    }

    // Validation helper functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone) => {
        const phoneRegex = /^[0-9]{10}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    };

    const validatePassword = (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
        return {
            isValid: password.length >= 5,
            strength: [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length
        };
    };

    const validateForm = () => {
        const newErrors = {};

        // First Name validation
        if (!supplierDetails.fname.trim()) {
            newErrors.fname = "First name is required";
        }

        // Email validation
        if (!supplierDetails.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!validateEmail(supplierDetails.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        // Phone validation
        if (supplierDetails.phone.trim() && !validatePhone(supplierDetails.phone)) {
            newErrors.phone = "Phone number must be 10 digits";
        }

        // Password validation
        if (!supplierDetails.password) {
            newErrors.password = "Password is required";
        } else {
            const passwordValidation = validatePassword(supplierDetails.password);
            if (!passwordValidation.isValid) {
                newErrors.password = "Password must be at least 5 characters";
            } else if (passwordValidation.strength < 2) {
                newErrors.password = "Password must contain mix of letters and numbers";
            }
        }

        // Confirm Password validation
        if (!supplierDetails.cpassword) {
            newErrors.cpassword = "Please confirm your password";
        } else if (supplierDetails.password !== supplierDetails.cpassword) {
            newErrors.cpassword = "Passwords do not match";
        }

        // Nationality validation
        if (!supplierDetails.nationality.trim()) {
            newErrors.nationality = "Nationality is required";
        }

        // Country validation
        if (!supplierDetails.country.trim()) {
            newErrors.country = "Country is required";
        }

        // State validation
        if (!supplierDetails.state.trim()) {
            newErrors.state = "State is required";
        }

        // City validation
        if (!supplierDetails.city.trim()) {
            newErrors.city = "City is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const [supplierDetails, setSupplierDetails] = useState(
        {
            fname: "",
            lname: "",
            phone: "",
            nationality: "",
            about: "",
            address: "",
            country: "",
            state: "",
            city: "",
            email: "",
            password: "",
            cpassword: ""
        }
    )

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form before submission
        if (!validateForm()) {
            props.showAlert("Please fix the errors in the form", "danger");
            return;
        }

        const { fname, lname, phone, nationality, about, address, country, state, city, email, password } = supplierDetails

        try {
            const response = await fetch("http://localhost:5000/api/supplier/createsupplier", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify({ fname, lname, phone, nationality, about, address, country, state, city, email, password })
            });

            if (!response.ok) {
                props.showAlert(`Supplier creation failed (Status ${response.status}). Check server logs.`, "danger");
                return;
            }
            const json = await response.json();

            if (json.success) {
                // Clear state on success, including image and imagePreview
                setSupplierDetails({
                    fname: "",
                    lname: "",
                    phone: "",
                    nationality: "",
                    about: "",
                    address: "",
                    country: "",
                    state: "",
                    city: "",
                    email: "",
                    password: "",
                    cpassword: ""
                });
                setErrors({});
                props.showAlert("Account Created Successfully", "success");
            } else {
                props.showAlert(json.message || "Invalid Credentials or server error.", "danger");
            }

        } catch (error) {
            props.showAlert("An unexpected network error occurred.", "danger");
        }
    }

    const onChange = (e) => {
        e.preventDefault()
        const { name, value } = e.target;
        setSupplierDetails({ ...supplierDetails, [name]: value });
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    }
    return (
        <>
            <div className="container-fluid p-5">
                <div className="row mb-3">
                    <div className="col-9 ms-5">
                        <h1 className="display-5 fw-normal mb-3">Add Supplier</h1>
                    </div>
                </div>
                <form className="needs-validation" onSubmit={handleSubmit}>
                    {/* Basic Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Basic Information</h5>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="firstName" className="form-label fw-semibold mb-2">First Name *</label>
                                    <input type="text" className={`form-control rounded-3 shadow-sm ${errors.fname ? 'is-invalid' : ''}`} id="firstName" placeholder="Enter first name" required name='fname' value={supplierDetails.fname} onChange={onChange}/>
                                    {errors.fname && <div className="invalid-feedback d-block">{errors.fname}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="lastName" className="form-label fw-semibold mb-2">Last Name</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="lastName" placeholder="Enter last name" name='lname' value={supplierDetails.lname} onChange={onChange}/>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="email" className="form-label fw-semibold mb-2">Email *</label>
                                    <input type="email" className={`form-control rounded-3 shadow-sm ${errors.email ? 'is-invalid' : ''}`} id="email" placeholder="Enter email" required name='email' value={supplierDetails.email} onChange={onChange}/>
                                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                                </div>
                            </div>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="contactNumber" className="form-label fw-semibold mb-2">Contact Number</label>
                                    <input type="text" value={supplierDetails.phone} className={`form-control rounded-3 shadow-sm ${errors.phone ? 'is-invalid' : ''}`} id="contactNumber" placeholder="Enter phone number" name='phone' onChange={onChange}/>
                                    {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="nationality" className="form-label fw-semibold mb-2">Nationality *</label>
                                    <input type='text' className={`form-control rounded-3 shadow-sm ${errors.nationality ? 'is-invalid' : ''}`} id="nationality" name='nationality' placeholder='Enter nationality' value={supplierDetails.nationality} onChange={onChange}/>
                                    {errors.nationality && <div className="invalid-feedback d-block">{errors.nationality}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="country" className="form-label fw-semibold mb-2">Country *</label>
                                    <input type='text' className={`form-control rounded-3 shadow-sm ${errors.country ? 'is-invalid' : ''}`} id="country" name='country' placeholder='Enter country' value={supplierDetails.country} onChange={onChange}/>
                                    {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                                </div>
                            </div>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="state" className="form-label fw-semibold mb-2">State *</label>
                                    <input type='text' className={`form-control rounded-3 shadow-sm ${errors.state ? 'is-invalid' : ''}`} id="state" name='state' placeholder='Enter state' value={supplierDetails.state} onChange={onChange}/>
                                    {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="city" className="form-label fw-semibold mb-2">City *</label>
                                    <input type='text' className={`form-control rounded-3 shadow-sm ${errors.city ? 'is-invalid' : ''}`} id="city" name='city' placeholder='Enter city' value={supplierDetails.city} onChange={onChange}/>
                                    {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Additional Information</h5>
                            <div className="mb-4">
                                <label htmlFor="about" className="form-label fw-semibold mb-2">About</label>
                                <textarea className="form-control rounded-3 shadow-sm" id="about" rows="4" placeholder="Enter details about the supplier" name='about' value={supplierDetails.about} onChange={onChange}></textarea>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="address" className="form-label fw-semibold mb-2">Address</label>
                                <textarea className="form-control rounded-3 shadow-sm" id="address" rows="2" placeholder="Enter full address" name='address' value={supplierDetails.address} onChange={onChange}></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Security Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Security Information</h5>
                            <div className="mb-4">
                                <label htmlFor="password" className="form-label fw-semibold mb-3">Password *</label>
                                <div className="position-relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={supplierDetails.password} 
                                        className={`form-control rounded-3 shadow-sm pe-5 ${errors.password ? 'is-invalid' : ''}`}
                                        name='password' 
                                        id="password" 
                                        placeholder="Enter password" 
                                        onChange={onChange} 
                                        minLength={5} 
                                        required
                                        style={{ borderColor: '#e0e0e0' }}
                                    />
                                    <button 
                                        type="button"
                                        className="btn position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent" 
                                        onClick={passVisibility}
                                        tabIndex="-1"
                                        style={{ marginRight: '12px' }}
                                    >
                                        <i className={`bi ${showPassword ? "bi-eye-fill" : "bi-eye-slash-fill"} text-secondary`}></i>
                                    </button>
                                </div>
                                {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                                {supplierDetails.password && !errors.password && (
                                    <small className="text-muted d-block mt-2">
                                        Password strength: {validatePassword(supplierDetails.password).strength >= 3 ? '✓ Strong' : validatePassword(supplierDetails.password).strength === 2 ? '◐ Medium' : '✗ Weak'}
                                    </small>
                                )}
                            </div>

                            <div>
                                <label htmlFor="cpassword" className="form-label fw-semibold mb-3">Confirm Password *</label>
                                <div className="position-relative">
                                    <input 
                                        type={showCPassword ? "text" : "password"} 
                                        name='cpassword' 
                                        minLength={5} 
                                        className={`form-control rounded-3 shadow-sm pe-5 ${errors.cpassword ? 'is-invalid' : ''}`}
                                        id="cpassword" 
                                        value={supplierDetails.cpassword} 
                                        placeholder="Confirm password" 
                                        onChange={onChange} 
                                        required
                                        style={{ borderColor: '#e0e0e0' }}
                                    />
                                    <button 
                                        type="button"
                                        className="btn position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent" 
                                        onClick={cpassVisibility}
                                        tabIndex="-1"
                                        style={{ marginRight: '12px' }}
                                    >
                                        <i className={`bi ${showCPassword ? "bi-eye-fill" : "bi-eye-slash-fill"} text-secondary`}></i>
                                    </button>
                                </div>
                                {errors.cpassword && <div className="invalid-feedback d-block">{errors.cpassword}</div>}
                            </div>
                        </div>
                    </div>
                    <div className="row mt-4 ms-1 mb-5 pb-5">
                        <div className="col-12 d-flex justify-content-start">
                            <input type="submit" className="btn btn-custom-purple btn-lg me-3 shadow-sm" value="Add Supplier" />
                            <a href="/dashboard/suppliers" type="button" className="btn btn-secondary btn-lg shadow-sm text-decoration-none">Cancel</a>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default CreateSupplier

