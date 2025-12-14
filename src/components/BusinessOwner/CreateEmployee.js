import React, { useRef, useState } from 'react';

const CreateEmployee = (props) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showCPassword, setShowCPassword] = useState(false);
    const passVisibility = () => {
        setShowPassword(prev => !prev);
    }
    const cpassVisibility = () => {
        setShowCPassword(prev => !prev);
    }
    const imageInputRef = useRef(null);
    const [empDetails, setEmpDetails] = useState(
        {
            image: null, // Will hold the File object
            imagePreview: null,
            fname: "",
            lname: "",
            birthDate: "",
            phone: "",
            gender: "",
            nationality: "",
            jDate: "",
            hireAt: "",
            role: "",
            email: "",
            password: "",
            cpassword: ""
        }
    )

    const handleImageClick = () => {
        imageInputRef.current.click();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (empDetails.password !== empDetails.cpassword) {
            props.showAlert("Password and Confirm Password must be the same!", "danger");
            return;
        }

        const { image, fname, lname, birthDate, phone, gender, nationality, jDate, hireAt, role, email, password } = empDetails;

        // --- Use FormData for sending files ---
        const formData = new FormData();

        // Append all text fields
        formData.append('fname', fname);
        formData.append('lname', lname);
        formData.append('birthDate', birthDate);
        formData.append('phone', phone);
        formData.append('gender', gender);
        formData.append('nationality', nationality);
        formData.append('jDate', jDate);
        formData.append('hireAt', hireAt);
        formData.append('role', role);
        formData.append('email', email);
        formData.append('password', password);

        // Append the image file (check if it exists)
        if (image) {
            formData.append('image', image);
        }

        try {
            const response = await fetch("http://localhost:5000/api/employee/createemployee", {
                method: 'POST',
                headers: {
                    'auth-token': localStorage.getItem('token')
                },
                body: formData // Send the FormData object
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error: Status ${response.status}`, errorText);
                props.showAlert(`Employee creation failed (Status ${response.status}). Check server logs.`, "danger");
                return;
            }
            const json = await response.json();

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
                    jDate: "",
                    hireAt: "",
                    role: "",
                    email: "",
                    password: "",
                    cpassword: ""
                });
                props.showAlert("Account Created Successfully", "success");
            } else {
                props.showAlert(json.message || "Invalid Credentials or server error.", "danger");
            }

        } catch (error) {
            console.error("Network or Parsing Error:", error);
            props.showAlert("An unexpected network error occurred.", "danger");
        }
    }

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
            setEmpDetails({ ...empDetails, [e.target.name]: e.target.value });
        }
    }

    return (
        <div className="container-fluid p-5">
            <h1 className="display-5 fw-normal mb-4">Add Employee</h1>

            <form className="needs-validation" onSubmit={handleSubmit}>
                <div className="row g-4 mb-4">

                    {/* Profile Image Upload (UPDATED) */}
                    <div className="col-md-3">
                        <label htmlFor="imageUpload" className="form-label fw-semibold">Profile Image</label>
                        <div
                            className="image-upload-area text-center d-flex flex-column justify-content-center align-items-center shadow p-3 rounded-4 mt-3 h-75"
                            style={{ cursor: 'pointer', overflow: 'hidden' }}
                            onClick={handleImageClick} // Trigger file dialog on click
                        >
                            {empDetails.imagePreview ? (
                                // Show image preview if available
                                <img
                                    src={empDetails.imagePreview}
                                    alt="Profile Preview"
                                    className="w-25 rounded-2"
                                />
                            ) : (
                                // Show placeholder icon if no image
                                <i className="bi bi-images fs-2 text-secondary p-4 border border-3 rounded-4 w-100">
                                    <br />
                                    <span className="fs-6">Click to Select Image</span>
                                </i>
                            )}
                            <input
                                type="file"
                                name='image'
                                className="form-control-file d-none"
                                id="imageUpload"
                                accept="image/*"
                                onChange={onChange}
                                ref={imageInputRef} // Attach the ref
                            />
                        </div>
                    </div>

                    {/* First Name & Email */}
                    <div className="col-md-4 ms-5 me-5">
                        <label htmlFor="fname" className="form-label fw-semibold">First Name</label>
                        <input
                            type="text"
                            name='fname'
                            className="form-control mt-3"
                            id="fname"
                            required
                            onChange={onChange} value={empDetails.fname}
                        />
                        <div className="invalid-feedback">First name is required.</div>

                        <div className="col mt-5">
                            <label htmlFor="email" className="form-label fw-semibold">Email</label>
                            <input
                                type="email"
                                name='email'
                                className="form-control mt-3"
                                id="email"
                                required
                                onChange={onChange} value={empDetails.email}
                            />
                            <div className="invalid-feedback">Email is required.</div>
                        </div>
                    </div>

                    {/* Last Name & Contact Number */}
                    <div className="col-md-4 mt-4">
                        <label htmlFor="lname" className="form-label fw-semibold">Last Name</label>
                        <input
                            type="text"
                            name='lname'
                            className="form-control mt-3"
                            id="lname"
                            onChange={onChange} value={empDetails.lname}
                        />
                        <div className="invalid-feedback">Last name is required.</div>

                        <div className="col mt-5">
                            <label htmlFor="phone" className="form-label fw-semibold">Contact Number</label>
                            <input
                                type="text"
                                name='phone'
                                className="form-control mt-3"
                                id="phone"
                                onChange={onChange} value={empDetails.phone}
                            />
                            <div className="invalid-feedback">Contact Number is required.</div>
                        </div>
                    </div>
                </div>

                {/* Second Row of Fields (Dates, Gender, Nationality) */}
                <div className="row g-4 mb-4">
                    <div className="col-md-4">
                        <label htmlFor="birthDate" className="form-label fw-semibold">Birth Date</label>
                        <div className="input-group mt-3">
                            <input
                                name='birthDate'
                                type="text"
                                className="form-control"
                                id="birthDate" // Controlled component
                                placeholder="DD/MM/YYYY"
                                onFocus={(e) => e.target.type = 'date'}
                                onBlur={(e) => e.target.type = 'text'}
                                onChange={onChange} value={empDetails.birthDate}
                            />
                        </div>
                        <div className="invalid-feedback">Birth date is required.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="gender" className="form-label fw-semibold">Gender</label>
                        <select
                            className="form-select mt-3"
                            id="gender"
                            name='gender' onChange={onChange} value={empDetails.gender}
                        >
                            <option value="" disabled>Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        <div className="invalid-feedback">Please select gender.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="nationality" className="form-label fw-semibold">Nationality</label>
                        <select
                            className="form-select mt-3"
                            id="nationality"
                            name='nationality' onChange={onChange} value={empDetails.nationality}
                        >
                            <option value="" disabled>Select Nationality</option>
                            <option value="Indian">Indian</option>
                            <option value="Other">Other</option>
                        </select>
                        <div className="invalid-feedback">Please select nationality.</div>
                    </div>
                </div>

                {/* Third Row of Fields (Joining Date, Hire At, Role) */}
                <div className="row g-4 mb-4">
                    <div className="col-md-4">
                        <label htmlFor="jDate" className="form-label fw-semibold">Joining Date</label>
                        <div className="input-group mt-3">
                            <input
                                type="text"
                                name='jDate'
                                className="form-control"
                                id="jDate" // Controlled component
                                placeholder="DD/MM/YYYY"
                                onFocus={(e) => e.target.type = 'date'}
                                onBlur={(e) => e.target.type = 'text'}
                                onChange={onChange} value={empDetails.jDate}
                            />
                        </div>
                        <div className="invalid-feedback">Joining date is required.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="hireAt" className="form-label fw-semibold">Hire At</label>
                        <select
                            className="form-select mt-3"
                            id="hireAt"
                            name='hireAt' onChange={onChange} value={empDetails.hireAt}
                        >
                            <option value="" disabled>Select Warehouse</option>
                            <option value="Warehouse1">Warehouse1</option>
                            <option value="Warehouse2">Warehouse2</option>
                        </select>
                        <div className="invalid-feedback">Please select warehouse.</div>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="role" className="form-label fw-semibold">Role</label>
                        <select
                            className="form-select mt-3"
                            id="role"
                            name='role' onChange={onChange} value={empDetails.role}
                        >
                            <option value="" disabled>Select Role</option>
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                        </select>
                        <div className="invalid-feedback">Please select role.</div>
                    </div>
                </div>


                {/* Password Fields */}
                <div className="row g-4 mb-4">
                    <div className="col-md-6">
                        <label htmlFor="password" className="form-label fw-semibold">Password</label>
                        <div className='input-group mb-3'>
                            <input type={showPassword ? "text" : "password"} value={empDetails.password} className='form-control' name='password' id="password" placeholder="••••••••" onChange={onChange} minLength={5} /><i className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white`} onClick={passVisibility}></i>
                        </div>
                        <div className="invalid-feedback">Password is required.</div>
                    </div>

                    <div className="col-md-6">
                        <label htmlFor="cPassword" className="form-label fw-semibold">Confirm Password</label>
                        <div className='input-group mb-3'>
                            <input type={showCPassword ? "text" : "password"} name='cpassword' minLength={5} className='form-control' id="cpassword" value={empDetails.cpassword} placeholder="••••••••" onChange={onChange} required /><i className={`bi ${showCPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white`} onClick={cpassVisibility}></i>
                        </div>
                        <div className="invalid-feedback">Confirm Password is required.</div>
                    </div>
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="row mt-5">
                    <div className="col-12 d-flex justify-content-start">
                        <input
                            type="submit"
                            className="btn btn-custom-purple me-3 px-2 shadow-sm"
                            value='Add Employee' />
                        <a href="/dashboard/employee" type="button" className="btn btn-secondary btn-lg shadow-sm text-center px-3">
                            Cancel
                        </a>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateEmployee;