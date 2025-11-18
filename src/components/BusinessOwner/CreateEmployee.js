import React, { useRef, useState } from 'react';

const CreateEmployee = () => {
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        fname: '',
        lname: '',
        email: '',
        password: '',
        cPassword: '',
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
        image: '',
        role: 'employee'
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);

    const handleImageClick = () => fileInputRef.current?.click();

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedImages(files);
        setFormData({ ...formData, image: files[0]?.name || '' });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.cPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/employee/createemployee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(formData)
            });

            const json = await response.json();
            if (!response.ok) {
                setError(json.error || 'Something went wrong.');
            } else {
                setSuccess('Employee created successfully!');
                setFormData({
                    fname: '',
                    lname: '',
                    email: '',
                    password: '',
                    cPassword: '',
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
                    image: '',
                    role: 'employee'
                });
                setSelectedImages([]);
            }
        } catch (err) {
            setError('Server error. Please try again later.');
        }
    };

    return (
        <div className="container-fluid p-5">
            <h1 className="display-5 fw-normal mb-4">Add Employee</h1>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form className="needs-validation" noValidate onSubmit={handleSubmit}>
                <div className="row g-4 mb-4">
                    <div className="col-md-3">
                        <label htmlFor="profileImage" className="form-label fw-semibold">Profile Images</label>
                        <div
                            className="image-upload-area text-center d-flex flex-column justify-content-center align-items-center shadow p-3 rounded-4 mt-3"
                            onClick={handleImageClick}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="bi bi-images fs-2 text-secondary p-4 border border-3 rounded-4 w-100">
                                <br />
                                <span className="fs-6">Drop or Select Multiple Images</span>
                            </i>
                            <input
                                type="file"
                                name='image'
                                className="form-control-file d-none"
                                id="productImages"
                                multiple
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>
                    <div className="col-md-4 ms-5 me-5">
                        <label htmlFor="firstName" className="form-label fw-semibold">First Name</label>
                        <input type="text" name='fname' className="form-control mt-3" id="firstName" required />
                        <div className="invalid-feedback">First name is required.</div>

                        <div className="col mt-5">
                            <label htmlFor="email" className="form-label fw-semibold">Email</label>
                            <input type="email" name='email' className="form-control mt-3" id="email" required />
                            <div className="invalid-feedback">Email is required.</div>
                        </div>
                    </div>

                    <div className="col-md-4 mt-4">
                        <label htmlFor="lastName" className="form-label fw-semibold">Last Name</label>
                        <input type="text" name='lname' className="form-control mt-3" id="lastName" />
                        <div className="invalid-feedback">Last name is required.</div>

                        <div className="col mt-5">
                            <label htmlFor="contactNumber" className="form-label fw-semibold">Contact Number</label>
                            <input type="text" name='phone' className="form-control mt-3" id="contactNumber"  />
                            <div className="invalid-feedback">Contact Number is required.</div>
                        </div>
                    </div>
                    <div className="col-md-4 mt-4">
                        <label htmlFor="birthDate" className="form-label fw-semibold">Birth Date</label>
                        <div className="input-group mt-3">
                            <input name='birthDate'
                                type="text"
                                className="form-control"
                                id="birthDate"
                                placeholder="DD/MM/YYYY"
                                onFocus={(e) => e.target.type = 'date'}
                                onBlur={(e) => e.target.type = 'text'}
                                
                            />
                            <span className="input-group-text"><i className="bi bi-calendar"></i></span>
                        </div>
                        <div className="invalid-feedback">Birth date is required.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="gender" className="form-label fw-semibold">Gender</label>
                        <select className="form-select mt-3" id="gender" name='gender'>
                            <option value="" disabled selected>Select Gender</option>
                            <option>Male</option>
                            <option>Female</option>
                        </select>
                        <div className="invalid-feedback">Please select gender.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="nationality" className="form-label fw-semibold">Nationality</label>
                        <select className="form-select mt-3" id="nationality" name='nationality'>
                            <option value="" disabled selected>Select Nationality</option>
                            <option>Indian</option>
                        </select>
                        <div className="invalid-feedback">Please select nationality.</div>
                    </div>
                    <div className="col-md-4 mt-4">
                        <label htmlFor="joiningDate" className="form-label fw-semibold">Joining Date</label>
                        <div className="input-group mt-3">
                            <input
                                type="text"
                                name='jDate'
                                className="form-control"
                                id="joiningDate"
                                placeholder="DD/MM/YYYY"
                                onFocus={(e) => e.target.type = 'date'}
                                onBlur={(e) => e.target.type = 'text'}
                                
                            />
                            <span className="input-group-text"><i className="bi bi-calendar"></i></span>
                        </div>
                        <div className="invalid-feedback">Joining date is required.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="hireAt" className="form-label fw-semibold">Hire At</label>
                        <select className="form-select mt-3" id="hireAt" name='hireAt'>
                            <option value="" disabled selected>Select Warehouse</option>
                            <option>Warehouse1</option>
                            <option>Warehouse2</option>
                        </select>
                        <div className="invalid-feedback">Please select warehouse.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="role" className="form-label fw-semibold">Role</label>
                        <select className="form-select mt-3" id="role">
                            <option value="" disabled selected>Select Role</option>
                            <option>Role1</option>
                            <option>Role2</option>
                        </select>
                        <div className="invalid-feedback">Please select role.</div>
                    </div>


                </div>


                <div className="row g-4 mb-4">
                    <div className="col-md-6">
                        <label htmlFor="password" className="form-label fw-semibold">Password</label>
                        <input
                            type="password"
                            name='password'
                            className="form-control mt-3"
                            id="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <div className="invalid-feedback">Password is required.</div>
                    </div>

                    <div className="col-md-6">
                        <label htmlFor="cPassword" className="form-label fw-semibold">Confirm Password</label>
                        <input
                            type="password"
                            name='cPassword'
                            className="form-control mt-3"
                            id="cPassword"
                            value={formData.cPassword}
                            onChange={handleChange}
                            required
                        />
                        <div className="invalid-feedback">Confirm Password is required.</div>
                    </div>
                </div>

                <div className="row mt-5 mx-2">
                    <div className="col-12 d-flex justify-content-start">
                        <input
                            type="submit"
                            className="btn btn-custom-purple btn-lg me-3 shadow-sm"
                            value="Add Employee"
                        />
                        <a href="/createemployee" type="button" className="btn btn-secondary btn-lg shadow-sm">
                            Cancel
                        </a>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateEmployee;