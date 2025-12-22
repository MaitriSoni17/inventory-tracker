import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom';

const EditEmployee = (props) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const imageInputRef = useRef(null);
    const [formData, setFormData] = useState({
        fname: '',
        lname: '',
        email: '',
        birthDate: '',
        gender: '',
        jDate: '',
        nationality: '',
        country: '',
        state: '',
        city: '',
        hireAt: '',
        phone: '',
        address: '',
        about: '',
        role: '',
        image: null,
        imagePreview: null,
        currentImage: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployee();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchEmployee = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/employee/getallemployees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const employees = await response.json();
                const employee = employees.find(e => e._id === id);
                
                if (employee) {
                    // Extract filename from image path (handle both old and new formats)
                    let imagePath = null;
                    if (employee.image) {
                        // If path contains /, extract the filename part
                        imagePath = employee.image.includes('/') 
                            ? employee.image.split('/').pop() 
                            : employee.image;
                    }
                    
                    setFormData({
                        fname: employee.fname || '',
                        lname: employee.lname || '',
                        email: employee.email || '',
                        birthDate: employee.birthDate ? employee.birthDate.split('T')[0] : '',
                        gender: employee.gender || '',
                        jDate: employee.jDate ? employee.jDate.split('T')[0] : '',
                        nationality: employee.nationality || '',
                        country: employee.country || '',
                        state: employee.state || '',
                        city: employee.city || '',
                        hireAt: employee.hireAt || '',
                        phone: employee.phone || '',
                        address: employee.address || '',
                        about: employee.about || '',
                        role: employee.role || '',
                        image: null,
                        imagePreview: null,
                        currentImage: imagePath
                    });
                } else {
                    props.showAlert('Employee not found', 'danger');
                    navigate('/dashboard/employee');
                }
            } else {
                props.showAlert('Failed to fetch employee', 'danger');
            }
        } catch (error) {
            console.error('Error fetching employee:', error);
            props.showAlert('Error fetching employee', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleImageClick = () => {
        imageInputRef.current.click();
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    image: file,
                    imagePreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setFormData(prev => ({
            ...prev,
            image: null,
            imagePreview: null,
            currentImage: null
        }));
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        // Extract just the filename if path contains /
        const filename = imagePath.includes('/') ? imagePath.split('/').pop() : imagePath;
        return `http://localhost:5000/uploads/${filename}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.fname || !formData.email) {
            props.showAlert('Please fill all required fields', 'danger');
            return;
        }

        try {
            // Use FormData if image is present
            let body;
            let headers = {
                'auth-token': localStorage.getItem('token')
            };

            if (formData.image) {
                const multipartFormData = new FormData();
                multipartFormData.append('fname', formData.fname);
                multipartFormData.append('lname', formData.lname);
                multipartFormData.append('email', formData.email);
                multipartFormData.append('birthDate', formData.birthDate);
                multipartFormData.append('gender', formData.gender);
                multipartFormData.append('jDate', formData.jDate);
                multipartFormData.append('nationality', formData.nationality);
                multipartFormData.append('country', formData.country);
                multipartFormData.append('state', formData.state);
                multipartFormData.append('city', formData.city);
                multipartFormData.append('hireAt', formData.hireAt);
                multipartFormData.append('phone', formData.phone);
                multipartFormData.append('address', formData.address);
                multipartFormData.append('about', formData.about);
                multipartFormData.append('role', formData.role);
                multipartFormData.append('image', formData.image);

                body = multipartFormData;
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(formData);
            }

            const response = await fetch(`http://localhost:5000/api/employee/updateemployee/${id}`, {
                method: 'PUT',
                headers,
                body
            });

            const data = await response.json();

            if (response.ok) {
                props.showAlert('Employee updated successfully', 'success');
                navigate('/dashboard/employee');
            } else {
                props.showAlert(data.errors?.[0]?.msg || 'Failed to update employee', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            props.showAlert('Error updating employee', 'danger');
        }
    };

    const handleCancel = () => {
        navigate('/dashboard/employee');
    };

    if (loading) {
        return (
            <div className="container-fluid p-5">
                <div className="row">
                    <div className="col-12 text-center">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container-fluid p-5">
                <div className="row mb-4">
                    <div className="col-12 ms-5">
                        <h1 className="display-5 fw-normal">Edit Employee</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    {/* Profile Photo Card */}
                    <div className="mb-5 text-center">
                        <div className="d-inline-block position-relative">
                            {formData.imagePreview ? (
                                <img src={formData.imagePreview} alt="Preview" className="rounded-2" width="120" height="120" style={{ objectFit: 'cover', display: 'block', boxShadow: '0 10px 30px rgba(115, 0, 255, 0.15)', border: '1px solid rgba(115, 0, 255, 0.1)' }} />
                            ) : formData.currentImage ? (
                                <img src={getImageUrl(formData.currentImage)} alt="Current" className="rounded-2" width="120" height="120" style={{ objectFit: 'cover', display: 'block', boxShadow: '0 10px 30px rgba(115, 0, 255, 0.15)', border: '1px solid rgba(115, 0, 255, 0.1)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                                <div className="rounded-2 d-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px', backgroundColor: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)', border: '1px solid rgba(115, 0, 255, 0.08)', boxShadow: '0 10px 30px rgba(115, 0, 255, 0.08)' }}>
                                    <i className="bi bi-person fs-2 text-muted" style={{ color: '#a8adc7' }}></i>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={imageInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            <button 
                                type="button" 
                                className="btn btn-sm btn-custom-purple rounded-circle position-absolute bottom-0 end-0"
                                onClick={handleImageClick}
                                style={{ width: '40px', height: '40px', padding: '0' }}
                            >
                                <i className="bi bi-camera-fill"></i>
                            </button>
                        </div>
                        {(formData.imagePreview || formData.currentImage) && (
                            <div className="mt-3">
                                <button type="button" className="btn btn-sm btn-outline-danger rounded-2" onClick={removeImage}>
                                    <i className="bi bi-trash me-1"></i>Remove Photo
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Personal Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Personal Information</h5>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="fname" className="form-label fw-semibold mb-2">First Name *</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="fname" placeholder="Enter first name" value={formData.fname} onChange={handleChange} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="lname" className="form-label fw-semibold mb-2">Last Name</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="lname" placeholder="Enter last name" value={formData.lname} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="email" className="form-label fw-semibold mb-2">Email *</label>
                                    <input type="email" className="form-control rounded-3 shadow-sm" id="email" placeholder="Enter email" value={formData.email} onChange={handleChange} required disabled />
                                </div>
                            </div>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="phone" className="form-label fw-semibold mb-2">Phone</label>
                                    <input type="number" className="form-control rounded-3 shadow-sm" id="phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="gender" className="form-label fw-semibold mb-2">Gender</label>
                                    <select className="form-select rounded-3 shadow-sm" id="gender" value={formData.gender} onChange={handleChange}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="birthDate" className="form-label fw-semibold mb-2">Birth Date</label>
                                    <input type="date" className="form-control rounded-3 shadow-sm" id="birthDate" value={formData.birthDate} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employment Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Employment Information</h5>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="jDate" className="form-label fw-semibold mb-2">Joining Date</label>
                                    <input type="date" className="form-control rounded-3 shadow-sm" id="jDate" value={formData.jDate} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="role" className="form-label fw-semibold mb-2">Role</label>
                                    <select className="form-select rounded-3 shadow-sm" id="role" value={formData.role} onChange={handleChange}>
                                        <option value="">Select Role</option>
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="supervisor">Supervisor</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="hireAt" className="form-label fw-semibold mb-2">Hire Location</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="hireAt" placeholder="Enter hire location" value={formData.hireAt} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Location Information</h5>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="nationality" className="form-label fw-semibold mb-2">Nationality</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="nationality" placeholder="Enter nationality" value={formData.nationality} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="country" className="form-label fw-semibold mb-2">Country</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="country" placeholder="Enter country" value={formData.country} onChange={handleChange} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="state" className="form-label fw-semibold mb-2">State</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="state" placeholder="Enter state" value={formData.state} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="city" className="form-label fw-semibold mb-2">City</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="city" placeholder="Enter city" value={formData.city} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information Card */}
                    <div className="card border-0 shadow-sm mb-4 rounded-4">
                        <div className="card-body p-5">
                            <h5 className="card-title display-6 mb-4">Additional Information</h5>
                            <div className="row g-4 mb-4">
                                <div className="col-md-12">
                                    <label htmlFor="address" className="form-label fw-semibold mb-2">Address</label>
                                    <textarea className="form-control rounded-3 shadow-sm" id="address" rows="3" placeholder="Enter address" value={formData.address} onChange={handleChange}></textarea>
                                </div>
                                <div className="col-md-12">
                                    <label htmlFor="about" className="form-label fw-semibold mb-2">About/Bio</label>
                                    <textarea className="form-control rounded-3 shadow-sm" id="about" rows="3" placeholder="Enter about/bio" value={formData.about} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-4 ms-1 mb-5 pb-5">
                        <div className="col-12 d-flex gap-3 justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg rounded-3 px-5 shadow-sm">Update Employee</button>
                            <button type="button" className="btn btn-outline-secondary btn-lg rounded-3 px-5 shadow-sm" onClick={handleCancel}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default EditEmployee
