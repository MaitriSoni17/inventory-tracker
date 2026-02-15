import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall, parseResponse } from '../../../utils/apiClient';
import '../../../styles/validation.css';

const CreateEmployee = (props) => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showCPassword, setShowCPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const passVisibility = () => {
        setShowPassword(prev => !prev);
    }
    const cpassVisibility = () => {
        setShowCPassword(prev => !prev);
    }
    const imageInputRef = useRef(null);
    const [empDetails, setEmpDetails] = useState(
        {
            image: null,
            imagePreview: null,
            fname: "",
            lname: "",
            birthDate: "",
            phone: "",
            gender: "",
            nationality: "",
            country: "",
            state: "",
            city: "",
            address: "",
            about: "",
            jDate: "",
            hireAt: "",
            role: "",
            email: "",
            password: "",
            cpassword: ""
        }
    );
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);

    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const response = await apiCall('http://localhost:5000/api/warehouse/getwarehouse', {
                    method: 'POST'
                });
                
                if (response.isUnauthorized) {
                    setLoadingWarehouses(false);
                    return;
                }
                
                if (!response.ok) {
                    setLoadingWarehouses(false);
                    return;
                }
                const warehouseList = await parseResponse(response);
                setWarehouses(warehouseList);
            } catch (error) {
            } finally {
                setLoadingWarehouses(false);
            }
        };
        fetchWarehouses();
    }, []);

    const handleImageClick = () => {
        imageInputRef.current.click();
    };

    const validateForm = () => {
        const newErrors = {};

        // First name validation
        if (!empDetails.fname.trim()) {
            newErrors.fname = 'First name is required';
        }

        // Email validation
        if (!empDetails.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empDetails.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        // Phone validation
        if (!empDetails.phone.trim()) {
            newErrors.phone = 'Contact number is required';
        } else if (!/^\d{10}$/.test(empDetails.phone.replace(/\D/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
        }

        // Birth date validation
        if (!empDetails.birthDate.trim()) {
            newErrors.birthDate = 'Birth date is required';
        }

        // Gender validation
        if (!empDetails.gender.trim()) {
            newErrors.gender = 'Gender is required';
        }

        // Nationality validation
        if (!empDetails.nationality.trim()) {
            newErrors.nationality = 'Nationality is required';
        }

        // Joining date validation
        if (!empDetails.jDate.trim()) {
            newErrors.jDate = 'Joining date is required';
        }

        // Hire location validation
        if (!empDetails.hireAt.trim()) {
            newErrors.hireAt = 'Warehouse selection is required';
        }

        // Role validation
        if (!empDetails.role.trim()) {
            newErrors.role = 'Role is required';
        }

        // Password validation
        if (!empDetails.password.trim()) {
            newErrors.password = 'Password is required';
        } else if (empDetails.password.length < 5) {
            newErrors.password = 'Password must be at least 5 characters';
        }

        // Confirm password validation
        if (!empDetails.cpassword.trim()) {
            newErrors.cpassword = 'Confirm password is required';
        } else if (empDetails.password !== empDetails.cpassword) {
            newErrors.cpassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (field) => {
        setTouched({ ...touched, [field]: true });
    };

    const isFormValid = () => {
        // Check if all required fields have values
        const requiredFields = ['fname', 'email', 'phone', 'birthDate', 'gender', 'nationality', 'jDate', 'hireAt', 'role', 'password', 'cpassword'];
        
        for (let field of requiredFields) {
            if (!empDetails[field] || !empDetails[field].toString().trim()) {
                return false;
            }
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empDetails.email)) {
            return false;
        }

        // Phone validation - at least 10 digits
        if (!/^\d{10}$/.test(empDetails.phone.replace(/\D/g, ''))) {
            return false;
        }

        // Password length
        if (empDetails.password.length < 5) {
            return false;
        }

        // Password match
        if (empDetails.password !== empDetails.cpassword) {
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form first
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        const { image, fname, lname, birthDate, phone, gender, nationality, country, state, city, address, about, jDate, hireAt, role, email, password } = empDetails;

        // --- Use FormData for sending files ---
        const formData = new FormData();

        // Append all text fields
        formData.append('fname', fname);
        formData.append('lname', lname);
        formData.append('birthDate', birthDate);
        formData.append('phone', phone);
        formData.append('gender', gender);
        formData.append('nationality', nationality);
        formData.append('country', country);
        formData.append('state', state);
        formData.append('city', city);
        formData.append('address', address);
        formData.append('about', about);
        formData.append('jDate', jDate);
        formData.append('hireAt', hireAt);
        formData.append('warehouse', hireAt); // Backend expects 'warehouse' field
        formData.append('role', role);
        formData.append('email', email);
        formData.append('password', password);

        // Append the image file (check if it exists)
        if (image) {
            formData.append('image', image);
        }

        try {
            const response = await apiCall("http://localhost:5000/api/employee/createemployee", {
                method: 'POST',
                body: formData // Send the FormData object
            });

            if (response.isUnauthorized) {
                props.showAlert('Your session has expired. Please login again.', 'danger');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
                return;
            }

            if (!response.ok) {
                const json = await parseResponse(response);
                const errorMsg = json?.errors?.map(e => e.msg).join(', ') || json?.error || `Employee creation failed (Status ${response.status})`;
                props.showAlert(errorMsg, "danger");
                // console.error('Server errors:', json);
                return;
            }
            const json = await parseResponse(response);

            if (json.success) {
                // Clear state on success, including image and imagePreview
                setEmpDetails({
                    image: null,
                    imagePreview: null,
                    fname: "",
                    lname: "",
                    birthDate: "",
                    phone: "",
                    gender: "",
                    nationality: "",
                    country: "",
                    state: "",
                    city: "",
                    address: "",
                    about: "",
                    jDate: "",
                    hireAt: "",
                    role: "",
                    email: "",
                    password: "",
                    cpassword: ""
                });
                // Clear error and touched states
                setErrors({});
                setTouched({});
                props.showAlert("Account Created Successfully", "success");
                // Redirect to employee list after 1.5 seconds
                setTimeout(() => {
                    navigate('/dashboard/employee');
                }, 1500);
            } else {
                props.showAlert(json.message || "Invalid Credentials or server error.", "danger");
            }

        } catch (error) {
            props.showAlert("An unexpected network error occurred.", "danger");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onChange = (e) => {
        if (e.target.name === 'image') {
            const file = e.target.files[0];
            if (file) {
                // 1. Create a URL for image preview
                const previewUrl = URL.createObjectURL(file);

                // 2. Update state with the File object and the preview URL
                setEmpDetails({
                    ...empDetails,
                    image: file,
                    imagePreview: previewUrl,
                });
            } else {
                // Clear state if no file is selected (e.g., user cancels the file dialog)
                setEmpDetails({
                    ...empDetails,
                    image: null,
                    imagePreview: null,
                });
            }
        } else {
            // Handle regular text/select inputs
            const updatedDetails = { ...empDetails, [e.target.name]: e.target.value };
            setEmpDetails(updatedDetails);

            // Clear password errors when user modifies password or confirm password
            if (e.target.name === 'password' || e.target.name === 'cpassword') {
                setErrors(prevErrors => {
                    const newErrors = { ...prevErrors };
                    
                    // Always clear the field that's being edited
                    delete newErrors[e.target.name];
                    
                    // If confirm password is being edited, check if passwords now match
                    if (e.target.name === 'cpassword') {
                        if (updatedDetails.password === updatedDetails.cpassword && updatedDetails.cpassword.trim()) {
                            delete newErrors.cpassword;
                        }
                    }
                    // If password is being edited, check if it now matches confirm password
                    else if (e.target.name === 'password') {
                        if (updatedDetails.password === updatedDetails.cpassword && updatedDetails.password.trim()) {
                            delete newErrors.cpassword;
                        }
                    }
                    
                    return newErrors;
                });
            }
        }
    }

    return (
        <>
            <div className="container-fluid" style={{ background: '#fff', padding: '3rem' }}>
                {/* Header */}
                <div style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#333', marginBottom: '0.5rem' }}>Add Employee</h1>
                    <p style={{ color: '#666', fontSize: '1rem' }}>Create a new employee account in your system</p>
                </div>

                {/* Error Summary */}
                {Object.keys(errors).length > 0 && Object.values(touched).some(v => v) && (
                    <div className="validation-summary" style={{ marginBottom: '2rem' }}>
                        <div className="validation-summary-title">
                            <i className="bi bi-exclamation-circle me-2"></i>Please fix the following errors:
                        </div>
                        <ul className="validation-summary-list">
                            {errors.fname && <li>{errors.fname}</li>}
                            {errors.lname && <li>{errors.lname}</li>}
                            {errors.email && <li>{errors.email}</li>}
                            {errors.phone && <li>{errors.phone}</li>}
                            {errors.birthDate && <li>{errors.birthDate}</li>}
                            {errors.gender && <li>{errors.gender}</li>}
                            {errors.nationality && <li>{errors.nationality}</li>}
                            {errors.jDate && <li>{errors.jDate}</li>}
                            {errors.hireAt && <li>{errors.hireAt}</li>}
                            {errors.role && <li>{errors.role}</li>}
                            {errors.password && <li>{errors.password}</li>}
                            {errors.cpassword && <li>{errors.cpassword}</li>}
                        </ul>
                    </div>
                )}

                {/* Form Container */}
                <div style={{ background: '#fafafa', borderRadius: '16px', padding: '2.5rem', border: '1px solid #f0f0f0' }}>
                    <form onSubmit={handleSubmit}>
                        {/* Row 1: Profile Image & Basic Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Profile Image */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Profile Image
                                </label>
                                <div
                                    className="image-upload-area"
                                    onClick={handleImageClick}
                                    style={{
                                        cursor: 'pointer',
                                        border: '2px dashed #ddd',
                                        borderRadius: '12px',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        minHeight: '200px',
                                        background: '#f9f9f9',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#af50ff'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                                >
                                    {empDetails.imagePreview ? (
                                        <img
                                            src={empDetails.imagePreview}
                                            alt="Profile Preview"
                                            style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px' }}
                                        />
                                    ) : (
                                        <div>
                                            <i className="bi bi-cloud-upload fs-1 text-secondary mb-2" style={{ display: 'block' }}></i>
                                            <p style={{ color: '#666', marginBottom: '0.5rem', fontWeight: '500' }}>Click to upload image</p>
                                            <p style={{ color: '#999', fontSize: '0.85rem', margin: '0' }}>PNG, JPG up to 5MB</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        name='image'
                                        className="d-none"
                                        id="imageUpload"
                                        accept="image/*"
                                        onChange={onChange}
                                        ref={imageInputRef}
                                    />
                                </div>
                            </div>

                            {/* First Name */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    First Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="fname"
                                    placeholder="Enter first name"
                                    value={empDetails.fname}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('fname')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.fname && touched.fname ? 'is-invalid' : ''} ${!errors.fname && touched.fname && empDetails.fname ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.fname && touched.fname && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.fname}</div>}
                            </div>

                            {/* Last Name */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="lname"
                                    placeholder="Enter last name"
                                    value={empDetails.lname}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('lname')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.lname && touched.lname ? 'is-invalid' : ''} ${!errors.lname && touched.lname && empDetails.lname ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.lname && touched.lname && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.lname}</div>}
                            </div>
                        </div>

                        {/* Row 2: Email & Phone */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Email */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Email <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter email address"
                                    value={empDetails.email}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('email')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''} ${!errors.email && touched.email && empDetails.email ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.email && touched.email && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.email}</div>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Contact Number <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter 10-digit phone number"
                                    value={empDetails.phone}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('phone')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.phone && touched.phone ? 'is-invalid' : ''} ${!errors.phone && touched.phone && empDetails.phone ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.phone && touched.phone && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.phone}</div>}
                            </div>

                            {/* Birth Date */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Birth Date <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={empDetails.birthDate}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('birthDate')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.birthDate && touched.birthDate ? 'is-invalid' : ''} ${!errors.birthDate && touched.birthDate && empDetails.birthDate ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.birthDate && touched.birthDate && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.birthDate}</div>}
                            </div>
                        </div>

                        {/* Row 3: Gender, Nationality, Role */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Gender */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Gender <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    name="gender"
                                    value={empDetails.gender}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('gender')}
                                    disabled={isSubmitting}
                                    className={`form-select ${errors.gender && touched.gender ? 'is-invalid' : ''} ${!errors.gender && touched.gender && empDetails.gender ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                >
                                    <option value="" disabled>Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                                {errors.gender && touched.gender && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.gender}</div>}
                            </div>

                            {/* Nationality */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Nationality <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    name="nationality"
                                    value={empDetails.nationality}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('nationality')}
                                    disabled={isSubmitting}
                                    className={`form-select ${errors.nationality && touched.nationality ? 'is-invalid' : ''} ${!errors.nationality && touched.nationality && empDetails.nationality ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                >
                                    <option value="" disabled>Select Nationality</option>
                                    <option value="Indian">Indian</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.nationality && touched.nationality && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.nationality}</div>}
                            </div>

                            {/* Role */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Role <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    name="role"
                                    value={empDetails.role}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('role')}
                                    disabled={isSubmitting}
                                    className={`form-select ${errors.role && touched.role ? 'is-invalid' : ''} ${!errors.role && touched.role && empDetails.role ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                >
                                    <option value="" disabled>Select Role</option>
                                    <option value="employee">Employee</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="manager">Manager</option>
                                </select>
                                {errors.role && touched.role && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.role}</div>}
                            </div>
                        </div>

                        {/* Row 4: Joining Date & Hire Location */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Joining Date */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Joining Date <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    name="jDate"
                                    value={empDetails.jDate}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('jDate')}
                                    disabled={isSubmitting}
                                    className={`form-control ${errors.jDate && touched.jDate ? 'is-invalid' : ''} ${!errors.jDate && touched.jDate && empDetails.jDate ? 'is-valid' : ''}`}
                                    style={{ minHeight: '44px', fontSize: '1rem' }}
                                />
                                {errors.jDate && touched.jDate && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.jDate}</div>}
                            </div>

                            {/* Hire At (Warehouse) */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }} >
                                    Hire At (Warehouse) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <select
                                            name="hireAt"
                                            value={empDetails.hireAt}
                                            onChange={onChange}
                                            onBlur={() => handleBlur('hireAt')}
                                            disabled={loadingWarehouses || isSubmitting}
                                            className={`form-select ${errors.hireAt && touched.hireAt ? 'is-invalid' : ''} ${!errors.hireAt && touched.hireAt && empDetails.hireAt ? 'is-valid' : ''}`}
                                            style={{ minHeight: '44px', fontSize: '1rem', width: '100%' }}
                                        >
                                            <option value="" disabled>{loadingWarehouses ? 'Loading warehouses...' : 'Select Warehouse'}</option>
                                            {warehouses.map((warehouse) => (
                                                <option key={warehouse._id} value={warehouse._id}>{warehouse.wName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <a href="/dashboard/warehouses" className="btn btn-sm w-auto" style={{ background: '#af50ff', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: '1.2rem', lineHeight: '1', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Add new warehouse">+</a>
                                </div>
                                {errors.hireAt && touched.hireAt && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.hireAt}</div>}
                            </div>
                        </div>

                        {/* Row 4.5: Location Information */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Country */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Country
                                </label>
                                <input
                                    type="text"
                                    name="country"
                                    value={empDetails.country}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('country')}
                                    placeholder="Enter country"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.3s'
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#af50ff')}
                                />
                            </div>

                            {/* State */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    State
                                </label>
                                <input
                                    type="text"
                                    name="state"
                                    value={empDetails.state}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('state')}
                                    placeholder="Enter state"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.3s'
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#af50ff')}
                                />
                            </div>

                            {/* City */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    City
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={empDetails.city}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('city')}
                                    placeholder="Enter city"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.3s'
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#af50ff')}
                                />
                            </div>
                        </div>

                        {/* Address and About */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Address */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Address
                                </label>
                                <textarea
                                    name="address"
                                    value={empDetails.address}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('address')}
                                    placeholder="Enter address"
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.3s',
                                        fontFamily: 'inherit'
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#af50ff')}
                                />
                            </div>

                            {/* About */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    About/Bio
                                </label>
                                <textarea
                                    name="about"
                                    value={empDetails.about}
                                    onChange={onChange}
                                    onBlur={() => handleBlur('about')}
                                    placeholder="Enter about/bio"
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.3s',
                                        fontFamily: 'inherit'
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#af50ff')}
                                />
                            </div>
                        </div>

                        {/* Row 5: Password Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Password */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Password <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Enter password"
                                        value={empDetails.password}
                                        onChange={onChange}
                                        onBlur={() => handleBlur('password')}
                                        disabled={isSubmitting}
                                        className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''} ${!errors.password && touched.password && empDetails.password ? 'is-valid' : ''}`}
                                        style={{ minHeight: '44px', fontSize: '1rem', paddingRight: '40px' }}
                                    />
                                    <i
                                        className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"} fs-5 text-secondary`}
                                        onClick={passVisibility}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            cursor: 'pointer'
                                        }}
                                    ></i>
                                </div>
                                {errors.password && touched.password && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.password}</div>}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                                    Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCPassword ? "text" : "password"}
                                        name="cpassword"
                                        placeholder="Re-enter password"
                                        value={empDetails.cpassword}
                                        onChange={onChange}
                                        onBlur={() => handleBlur('cpassword')}
                                        disabled={isSubmitting}
                                        className={`form-control ${errors.cpassword && touched.cpassword ? 'is-invalid' : ''} ${!errors.cpassword && touched.cpassword && empDetails.cpassword ? 'is-valid' : ''}`}
                                        style={{ minHeight: '44px', fontSize: '1rem', paddingRight: '40px' }}
                                    />
                                    <i
                                        className={`bi ${showCPassword ? "bi-eye" : "bi-eye-slash"} fs-5 text-secondary`}
                                        onClick={cpassVisibility}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            cursor: 'pointer'
                                        }}
                                    ></i>
                                </div>
                                {errors.cpassword && touched.cpassword && <div className="error-message" style={{ marginTop: '0.5rem' }}>{errors.cpassword}</div>}
                            </div>
                        </div>

                        {/* Submit & Cancel Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e0e0e0' }}>
                            <button
                                type="submit"
                                disabled={!isFormValid() || isSubmitting}
                                style={{
                                    background: !isFormValid() || isSubmitting ? '#ccc' : '#af50ff',
                                    color: 'white',
                                    padding: '0.75rem 2rem',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: !isFormValid() || isSubmitting ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => isFormValid() && !isSubmitting && (e.target.style.background = '#9939d9')}
                                onMouseLeave={(e) => isFormValid() && !isSubmitting && (e.target.style.background = '#af50ff')}
                            >
                                {isSubmitting ? 'Creating...' : 'Add Employee'}
                            </button>
                            <a
                                href="/dashboard/employee"
                                style={{
                                    background: '#f0f0f0',
                                    color: '#333',
                                    padding: '0.75rem 2rem',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#e0e0e0'}
                                onMouseLeave={(e) => e.target.style.background = '#f0f0f0'}
                            >
                                Cancel
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default CreateEmployee;

