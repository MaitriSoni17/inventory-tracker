import React, { useState } from 'react';

function CreateSupplier(props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showCPassword, setShowCPassword] = useState(false);
    const passVisibility = () => {
        setShowPassword(prev => !prev);
    }
    const cpassVisibility = () => {
        setShowCPassword(prev => !prev);
    }
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

        const { fname, lname, phone, nationality, about, address, country, state, city, email, password } = supplierDetails

        if (supplierDetails.password !== supplierDetails.cpassword) {
            props.showAlert("Password and Confirm Password must be the same!", "danger");
            return;
        }
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
                const errorText = await response.text();
                console.error(`API Error: Status ${response.status}`, errorText);
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
        e.preventDefault()
        setSupplierDetails({ ...supplierDetails, [e.target.name]: e.target.value });
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
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="firstName" placeholder="Enter first name" required name='fname' value={supplierDetails.fname} onChange={onChange}/>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="lastName" className="form-label fw-semibold mb-2">Last Name</label>
                                    <input type="text" className="form-control rounded-3 shadow-sm" id="lastName" placeholder="Enter last name" name='lname' value={supplierDetails.lname} onChange={onChange}/>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="email" className="form-label fw-semibold mb-2">Email *</label>
                                    <input type="email" className="form-control rounded-3 shadow-sm" id="email" placeholder="Enter email" required name='email' value={supplierDetails.email} onChange={onChange}/>
                                </div>
                            </div>
                            <div className="d-flex gap-4 mb-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="contactNumber" className="form-label fw-semibold mb-2">Contact Number</label>
                                    <input type="text" value={supplierDetails.phone} className="form-control rounded-3 shadow-sm" id="contactNumber" placeholder="Enter phone number" name='phone' onChange={onChange}/>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="nationality" className="form-label fw-semibold mb-2">Nationality</label>
                                    <select className="form-select rounded-3 shadow-sm" value={supplierDetails.nationality} id="nationality" name='nationality' onChange={onChange}>
                                        <option value="" disabled>Select Nationality</option>
                                        <option>Indian</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="country" className="form-label fw-semibold mb-2">Country</label>
                                    <select className="form-select rounded-3 shadow-sm" value={supplierDetails.country} id="country" name='country' onChange={onChange}>
                                        <option value="" disabled>Select Country</option>
                                        <option>India</option>
                                    </select>
                                </div>
                            </div>
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="state" className="form-label fw-semibold mb-2">State</label>
                                    <select className="form-select rounded-3 shadow-sm" id="state" name='state' value={supplierDetails.state} onChange={onChange}>
                                        <option value="" disabled>Select State</option>
                                        <option>Gujarat</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="city" className="form-label fw-semibold mb-2">City</label>
                                    <select className="form-select rounded-3 shadow-sm" id="city" name='city' value={supplierDetails.city} onChange={onChange}>
                                        <option value="" disabled>Select City</option>
                                        <option>Mumbai</option>
                                    </select>
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
                            <div className="d-flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="password" className="form-label fw-semibold mb-2">Password *</label>
                                    <div className='input-group mb-3 gap-0'>
                                        <input type={showPassword ? "text" : "password"} value={supplierDetails.password} className='form-control rounded-start-3 shadow-sm' name='password' id="password" placeholder="••••••••" onChange={onChange} minLength={5} required/><i className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white rounded-end-3`} onClick={passVisibility}></i>
                                    </div>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cPassword" className="form-label fw-semibold mb-2">Confirm Password *</label>
                                    <div className='input-group mb-3 gap-0'>
                                        <input type={showCPassword ? "text" : "password"} name='cpassword' minLength={5} className='form-control rounded-start-3 shadow-sm' id="cpassword" value={supplierDetails.cpassword} placeholder="••••••••" onChange={onChange} required /><i className={`bi ${showCPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white rounded-end-3`} onClick={cpassVisibility}></i>
                                    </div>
                                </div>

                                <div style={{ flex: 1 }}>
                                </div>
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