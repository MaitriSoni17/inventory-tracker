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
                    <div className="col-12">
                        <h1 className="display-5 fw-normal">Edit Employee</h1>
                    </div>
                </div>

                <form className="needs-validation" onSubmit={handleSubmit} noValidate>
                    <div className="row g-4 mb-4">
                        <div className="col-md-12 text-center mb-4">
                            <div className="mb-3">
                                {formData.imagePreview ? (
                                    <img src={formData.imagePreview} alt="Preview" className="rounded-circle" width="150" height="150" style={{ objectFit: 'cover', border: '3px solid #ccc' }} />
                                ) : formData.currentImage ? (
                                    <img src={getImageUrl(formData.currentImage)} alt="Current" className="rounded-circle" width="150" height="150" style={{ objectFit: 'cover', border: '3px solid #ccc' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                    <div className="rounded-circle d-flex align-items-center justify-content-center" width="150" height="150" style={{ width: '150px', height: '150px', border: '3px solid #ccc', backgroundColor: '#f0f0f0' }}>
                                        <i className="bi bi-person-fill fs-1 text-secondary"></i>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={imageInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            <button type="button" className="btn btn-sm btn-custom-purple me-2" onClick={handleImageClick}>
                                <i className="bi bi-camera me-1"></i> Change Photo
                            </button>
                            {(formData.imagePreview || formData.currentImage) && (
                                <button type="button" className="btn btn-sm btn-danger" onClick={removeImage}>
                                    <i className="bi bi-trash me-1"></i> Remove
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="fname" className="form-label fw-semibold">First Name *</label>
                            <input type="text" className="form-control mt-3" id="fname" placeholder="Enter first name" value={formData.fname} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="lname" className="form-label fw-semibold">Last Name</label>
                            <input type="text" className="form-control mt-3" id="lname" placeholder="Enter last name" value={formData.lname} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="email" className="form-label fw-semibold">Email *</label>
                            <input type="email" className="form-control mt-3" id="email" placeholder="Enter email" value={formData.email} onChange={handleChange} required disabled />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="phone" className="form-label fw-semibold">Phone</label>
                            <input type="number" className="form-control mt-3" id="phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="gender" className="form-label fw-semibold">Gender</label>
                            <select className="form-select mt-3" id="gender" value={formData.gender} onChange={handleChange}>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="role" className="form-label fw-semibold">Role</label>
                            <select className="form-select mt-3" id="role" value={formData.role} onChange={handleChange}>
                                <option value="">Select Role</option>
                                <option value="employee">Employee</option>
                                <option value="manager">Manager</option>
                                <option value="supervisor">Supervisor</option>
                            </select>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="birthDate" className="form-label fw-semibold">Birth Date</label>
                            <input type="date" className="form-control text-secondary mt-3" id="birthDate" value={formData.birthDate} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="jDate" className="form-label fw-semibold">Joining Date</label>
                            <input type="date" className="form-control text-secondary mt-3" id="jDate" value={formData.jDate} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="hireAt" className="form-label fw-semibold">Hire Location</label>
                            <input type="text" className="form-control mt-3" id="hireAt" placeholder="Enter hire location" value={formData.hireAt} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="nationality" className="form-label fw-semibold">Nationality</label>
                            <input type="text" className="form-control mt-3" id="nationality" placeholder="Enter nationality" value={formData.nationality} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="country" className="form-label fw-semibold">Country</label>
                            <input type="text" className="form-control mt-3" id="country" placeholder="Enter country" value={formData.country} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="state" className="form-label fw-semibold">State</label>
                            <input type="text" className="form-control mt-3" id="state" placeholder="Enter state" value={formData.state} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="city" className="form-label fw-semibold">City</label>
                            <input type="text" className="form-control mt-3" id="city" placeholder="Enter city" value={formData.city} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <label htmlFor="address" className="form-label fw-semibold">Address</label>
                            <textarea className="form-control mt-3" id="address" rows="3" placeholder="Enter address" value={formData.address} onChange={handleChange}></textarea>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <label htmlFor="about" className="form-label fw-semibold">About</label>
                            <textarea className="form-control mt-3" id="about" rows="3" placeholder="Enter about/bio" value={formData.about} onChange={handleChange}></textarea>
                        </div>
                    </div>

                    <div className="row mt-5">
                        <div className="col-12 d-flex justify-content-start">
                            <button type="submit" className="btn btn-custom-purple btn-lg me-3 shadow-sm">Update Employee</button>
                            <button type="button" className="btn btn-secondary btn-lg shadow-sm" onClick={handleCancel}>Cancel</button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default EditEmployee
