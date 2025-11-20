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
                    <div className="col-9">
                        <h1 className="display-5 fw-normal mb-3">Add Supplier</h1>
                    </div>
                </div>
                <form className="needs-validation" onSubmit={handleSubmit}>
                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <label htmlFor="firstName" className="form-label fw-semibold">First Name</label>
                            <input type="text" className="form-control mt-3" id="firstName" placeholder="" required name='fname' value={supplierDetails.fname} onChange={onChange}/>
                            <div className="invalid-feedback">
                                First name is required.
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="lastName" className="form-label fw-semibold">Last Name</label>
                            <input type="text" className="form-control mt-3" id="lastName" placeholder="" name='lname' value={supplierDetails.lname} onChange={onChange}/>
                            <div className="invalid-feedback">
                                Last name is required.
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="email" className="form-label fw-semibold">Email</label>
                            <input type="email" className="form-control mt-3" id="email" placeholder="" required name='email' value={supplierDetails.email} onChange={onChange}/>
                            <div className="invalid-feedback">
                                Email is required.
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="contactNumber" className="form-label fw-semibold">Contact Number</label>
                            <input type="text" value={supplierDetails.phone} className="form-control mt-3" id="contactNumber" placeholder="" name='phone' onChange={onChange}/>
                            <div className="invalid-feedback">
                                Contact Number is required.
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="nationality" className="form-label fw-semibold">Nationality</label>
                            <select className="form-select mt-3" value={supplierDetails.nationality} id="nationality" name='nationality' onChange={onChange}>
                                <option value="" disabled>Select Nationality</option>
                                <option>Indian</option>
                            </select>
                            <div className="invalid-feedback">
                                Please select a nationality.
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="country" className="form-label fw-semibold">Country</label>
                            <select className="form-select mt-3" value={supplierDetails.country} id="country" name='country' onChange={onChange}>
                                <option value="" disabled>Select Country</option>
                                <option>India</option>
                            </select>
                            <div className="invalid-feedback">
                                Please select a country.
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="city" className="form-label fw-semibold">City</label>
                            <select className="form-select mt-3" id="city" name='city' value={supplierDetails.city} onChange={onChange}>
                                <option value="" disabled>Select City</option>
                                <option>Mumbai</option>
                            </select>
                            <div className="invalid-feedback">
                                Please select a city.
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="state" className="form-label fw-semibold">State</label>
                            <select className="form-select mt-3" id="state" name='state' value={supplierDetails.state} onChange={onChange}>
                                <option value="" disabled>Select State</option>
                                <option>Gujarat</option>
                            </select>
                            <div className="invalid-feedback">
                                Please select a city.
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col-md-12">
                                <label htmlFor="about" className="form-label fw-semibold">About</label>
                                <textarea className="form-control mt-3" id="about" rows="5" name='about' value={supplierDetails.about} onChange={onChange}></textarea>
                                <div className="invalid-feedback">
                                    About is required.
                                </div>
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col-md-12">
                                <label htmlFor="address" className="form-label fw-semibold">Address</label>
                                <textarea className="form-control mt-3" id="address" rows="1" name='address' value={supplierDetails.address} onChange={onChange}></textarea>
                                <div className="invalid-feedback">
                                    Address is required.
                                </div>
                            </div>
                        </div>

                        <div className="row g-4 mt-3 mb-3">
                            <div className="col-md-6">
                                <label htmlFor="password" className="form-label fw-semibold">Password</label>
                                <div className='input-group mb-3'>
                                    <input type={showPassword ? "text" : "password"} value={supplierDetails.password} className='form-control' name='password' id="password" placeholder="••••••••" onChange={onChange} minLength={5} /><i className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white`} onClick={passVisibility}></i>
                                </div>
                                <div className="invalid-feedback">Password is required.</div>
                            </div>

                            <div className="col-md-6">
                                <label htmlFor="cPassword" className="form-label fw-semibold">Confirm Password</label>
                                <div className='input-group mb-3'>
                                    <input type={showCPassword ? "text" : "password"} name='cpassword' minLength={5} className='form-control' id="cpassword" value={supplierDetails.cpassword} placeholder="••••••••" onChange={onChange} required /><i className={`bi ${showCPassword ? "bi-eye" : "bi-eye-slash"} fs-4 text-primary input-group-text bg-white`} onClick={cpassVisibility}></i>
                                </div>
                                <div className="invalid-feedback">Confirm Password is required.</div>
                            </div>

                        </div>

                    </div>
                    <div className="row mt-4">
                        <div className="col-12 d-flex justify-content-start">
                            <input type="submit" className="btn btn-custom-purple btn-lg me-3 shadow-sm" value="Add Supplier" />
                            <a href="suppliers.html" type="button" className="btn btn-secondary btn-lg shadow-sm">Cancel</a>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default CreateSupplier