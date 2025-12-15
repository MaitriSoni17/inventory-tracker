import React, { useEffect, useState } from 'react';

const Settings = (props) => {
  const [profileData, setProfileData] = useState({
    fname: '',
    lname: '',
    username: '',
    phone: '',
    email: '',
    country: 'India',
    state: '',
    city: '',
    pincode: '',
    address: '',
    image: ''
  });

  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    companyCountry: 'India',
    companyState: '',
    companyCity: '',
    companyPincode: '',
    companyLogo: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch BusinessOwner data on component mount
  useEffect(() => {
    fetchBusinessOwnerData();
  }, []);

  const fetchBusinessOwnerData = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/businessowner/getbusinessowner', {
        method: 'POST',
        headers
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData({
          fname: data.fname || '',
          lname: data.lname || '',
          username: data.fname || '',
          phone: data.phone || '',
          email: data.email || '',
          country: data.country || 'India',
          state: data.state || '',
          city: data.city || '',
          pincode: data.pincode || '',
          address: data.address || '',
          image: data.image || ''
        });
        setLoading(false);
      } else {
        props.showAlert?.('Failed to load profile data', 'danger');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching business owner data:', error);
      props.showAlert?.('Error loading profile', 'danger');
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleCompanyChange = (e) => {
    const { id, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleProfileImageChange = (e) => {
    setProfileImageFile(e.target.files[0]);
  };

  const handleCompanyLogoChange = (e) => {
    setCompanyLogoFile(e.target.files[0]);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      // Get the current password from database for update (since backend requires it)
      const businessOwnerRes = await fetch('http://localhost:5000/api/businessowner/getbusinessowner', {
        method: 'POST',
        headers
      });
      const currentBusinessOwner = await businessOwnerRes.json();

      const dataToSend = {
        fname: profileData.fname,
        lname: profileData.lname,
        email: profileData.email,
        phone: profileData.phone,
        country: profileData.country,
        state: profileData.state,
        city: profileData.city,
        pincode: profileData.pincode,
        address: profileData.address,
        password: currentBusinessOwner.password || 'tempPassword123'
      };

      const res = await fetch('http://localhost:5000/api/businessowner/updatebusinessowner', {
        method: 'PUT',
        headers,
        body: JSON.stringify(dataToSend)
      });

      if (res.ok) {
        props.showAlert?.('Profile updated successfully', 'success');
        fetchBusinessOwnerData();
      } else {
        const errorData = await res.json();
        console.error('Update error:', errorData);
        props.showAlert?.('Failed to update profile: ' + (errorData.errors?.[0]?.msg || 'Unknown error'), 'danger');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      props.showAlert?.('Error updating profile', 'danger');
    }
  };

  const handleSaveCompany = (e) => {
    e.preventDefault();
    // Company settings would require a separate Company model and endpoints
    props.showAlert?.('Company settings saved (feature coming soon)', 'info');
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      props.showAlert?.('Passwords do not match', 'danger');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const dataToSend = {
        fname: profileData.fname,
        lname: profileData.lname,
        email: profileData.email,
        password: newPassword,
        phone: profileData.phone,
        country: profileData.country,
        state: profileData.state,
        city: profileData.city,
        address: profileData.address
      };

      const res = await fetch('http://localhost:5000/api/businessowner/updatebusinessowner', {
        method: 'PUT',
        headers,
        body: JSON.stringify(dataToSend)
      });

      if (res.ok) {
        props.showAlert?.('Password changed successfully', 'success');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        props.showAlert?.('Failed to change password', 'danger');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      props.showAlert?.('Error changing password', 'danger');
    }
  };

  const handleDeactivateAccount = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account?')) return;

    props.showAlert?.('Account deactivation feature coming soon', 'info');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This action cannot be undone. All your data will be permanently deleted.')) return;

    props.showAlert?.('Account deletion feature coming soon', 'info');
  };

  const filteredSections = searchTerm.toLowerCase() === 'profile' || searchTerm === '' ? 'all' : 'none';

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="page-main" className="container-fluid bg-light p-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="header-left">
            <h1 className="categories-title mb-3">Settings</h1>
            <p className="text-muted last-update-text">Last Update {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-12">
            <div className="input-group input-group-lg search-bar shadow border-3 rounded-pill">
              <span className="input-group-text bg-white border-0 ps-3 rounded-pill">
                <i className="bi bi-search"></i>
              </span>
              <input 
                type="text" 
                className="form-control border-0 rounded-pill shadow-none"
                placeholder="Search settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Profile Settings Section */}
        <div className="container-fluid bg-white shadow border border-2 rounded-3 p-4 pb-4 pt-4 mt-5">
          <h2 className="mb-5">Profile Settings</h2>
          <form className="needs-validation" onSubmit={handleSaveProfile}>
            <div className="row g-4 mb-4">
              <div className="col-md-4">
                <label htmlFor="fname" className="form-label fw-semibold">First Name</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="fname"
                  placeholder="First Name" 
                  value={profileData.fname}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">First name is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="lname" className="form-label fw-semibold">Last Name</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="lname"
                  placeholder="Last Name"
                  value={profileData.lname}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">Last name is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="username" className="form-label fw-semibold">User Name</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="username"
                  placeholder="User Name"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">User name is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="phone" className="form-label fw-semibold">Contact Number</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="phone"
                  placeholder="+91 1234567890"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">Contact Number is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="email" className="form-label fw-semibold">Email</label>
                <input 
                  type="email" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="email"
                  placeholder="user@gmail.com"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">Email is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="country" className="form-label fw-semibold">Country</label>
                <select 
                  className="form-select mt-3 shadow text-secondary" 
                  id="country"
                  value={profileData.country}
                  onChange={handleProfileChange}
                  required
                >
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                </select>
                <div className="invalid-feedback">Please select country.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="state" className="form-label fw-semibold">State</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="state"
                  placeholder="State"
                  value={profileData.state}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">State is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="city" className="form-label fw-semibold">City</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="city"
                  placeholder="City"
                  value={profileData.city}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">City is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="pincode" className="form-label fw-semibold">Pincode</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="pincode"
                  placeholder="123456"
                  value={profileData.pincode}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">Pincode is required.</div>
              </div>
              <div className="col-md-6">
                <label htmlFor="address" className="form-label fw-semibold">Address</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="address"
                  placeholder="Address"
                  value={profileData.address}
                  onChange={handleProfileChange}
                  required
                />
                <div className="invalid-feedback">Address is required.</div>
              </div>
              <div className="col-md-6">
                <label htmlFor="profileImage" className="form-label fw-semibold">Profile Image</label>
                <input 
                  type="file" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="profileImage"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                />
              </div>
            </div>
            <div className="row mt-5">
              <div className="col-12 d-flex justify-content-start">
                <button type="submit" className="btn btn-custom-purple btn-lg me-3 shadow-sm">Save Changes</button>
                <button type="button" className="btn btn-secondary btn-lg shadow-sm" onClick={() => fetchBusinessOwnerData()}>Cancel</button>
              </div>
            </div>
          </form>
        </div>

        {/* Company Settings Section */}
        <div className="container-fluid bg-white shadow border border-2 rounded-3 p-4 pb-4 pt-4 mt-5">
          <h2 className="mb-5">Company Settings</h2>
          <form className="needs-validation" onSubmit={handleSaveCompany}>
            <div className="row g-4 mb-4">
              <div className="col-md-4">
                <label htmlFor="companyName" className="form-label fw-semibold">Company Name</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyName"
                  placeholder="Company Name"
                  value={companyData.companyName}
                  onChange={handleCompanyChange}
                  required
                />
                <div className="invalid-feedback">Company name is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="companyPhone" className="form-label fw-semibold">Company Contact Number</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyPhone"
                  placeholder="+91 1234567890"
                  value={companyData.companyPhone}
                  onChange={handleCompanyChange}
                  required
                />
                <div className="invalid-feedback">Company Contact Number is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="companyEmail" className="form-label fw-semibold">Company Email</label>
                <input 
                  type="email" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyEmail"
                  placeholder="company@gmail.com"
                  value={companyData.companyEmail}
                  onChange={handleCompanyChange}
                  required
                />
                <div className="invalid-feedback">Company Email is required.</div>
              </div>
              <div className="col-md-8">
                <label htmlFor="companyAddress" className="form-label fw-semibold">Address</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyAddress"
                  placeholder="Address"
                  value={companyData.companyAddress}
                  onChange={handleCompanyChange}
                  required
                />
                <div className="invalid-feedback">Address is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="companyCountry" className="form-label fw-semibold">Country</label>
                <select 
                  className="form-select mt-3 shadow text-secondary" 
                  id="companyCountry"
                  value={companyData.companyCountry}
                  onChange={handleCompanyChange}
                  required
                >
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                </select>
                <div className="invalid-feedback">Please select country.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="companyState" className="form-label fw-semibold">State</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyState"
                  placeholder="State"
                  value={companyData.companyState}
                  onChange={handleCompanyChange}
                  required
                />
                <div className="invalid-feedback">State is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="companyCity" className="form-label fw-semibold">City</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyCity"
                  placeholder="City"
                  value={companyData.companyCity}
                  onChange={handleCompanyChange}
                  required
                />
                <div className="invalid-feedback">City is required.</div>
              </div>
              <div className="col-md-4">
                <label htmlFor="companyPincode" className="form-label fw-semibold">Pincode</label>
                <input 
                  type="text" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyPincode"
                  placeholder="123456"
                  value={companyData.companyPincode}
                  onChange={handleCompanyChange}
                  required
                />
                <div className="invalid-feedback">Pincode is required.</div>
              </div>
              <div className="col-md-6">
                <label htmlFor="companyLogo" className="form-label fw-semibold">Company Logo</label>
                <input 
                  type="file" 
                  className="form-control mt-3 shadow text-secondary" 
                  id="companyLogo"
                  accept="image/*"
                  onChange={handleCompanyLogoChange}
                />
              </div>
            </div>
            <div className="row mt-5">
              <div className="col-12 d-flex justify-content-start">
                <button type="submit" className="btn btn-custom-purple btn-lg me-3 shadow-sm">Save Changes</button>
                <button type="button" className="btn btn-secondary btn-lg shadow-sm">Cancel</button>
              </div>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="container-fluid bg-white shadow border border-2 rounded-3 p-4 pb-4 pt-4 mt-5">
          <h2 className="mb-5">Security</h2>
          <div className="list-group list-group-flush">

            <div className="list-group-item security-item">
              <div className="d-flex align-items-center">
                <div className="security-icon-container">
                  <i className="bi bi-eye-slash-fill fs-1 me-2 bg-secondary-subtle rounded-3 p-2"></i>
                </div>
                <div className="security-details flex-grow-1 ms-3">
                  <h5 className="mb-0">Password</h5>
                  <p className="text-muted small mb-0">Manage your account password</p>
                </div>
                <button 
                  type="button"
                  className="btn btn-custom-purple px-5"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Change Password
                </button>
              </div>
            </div>

            <div className="list-group-item security-item">
              <div className="d-flex align-items-center">
                <div className="security-icon-container">
                  <i className="bi bi-ban fs-1 me-2 bg-secondary-subtle rounded-3 p-2"></i>
                </div>
                <div className="security-details flex-grow-1 ms-3">
                  <h5 className="mb-0">Deactivate Account</h5>
                  <p className="text-muted small mb-0">This will shutdown your account. Your account will be reactive when you sign in again</p>
                </div>
                <button 
                  type="button"
                  className="btn btn-custom-purple px-5"
                  onClick={handleDeactivateAccount}
                >
                  Deactivate Account
                </button>
              </div>
            </div>

            <div className="list-group-item security-item border-bottom">
              <div className="d-flex align-items-center">
                <div className="security-icon-container">
                  <i className="bi bi-trash-fill fs-1 me-2 bg-secondary-subtle rounded-3 p-2"></i>
                </div>
                <div className="security-details flex-grow-1 ms-3">
                  <h5 className="mb-0">Delete Account</h5>
                  <p className="text-muted small mb-0">Your account will be permanently deleted.</p>
                </div>
                <button 
                  type="button"
                  className="btn btn-danger custom-red-btn"
                  onClick={handleDeleteAccount}
                >
                  Delete
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Password</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPasswordModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label">New Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="newPassword"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="confirmPassword"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPasswordModal(false)}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-custom-purple" 
                  onClick={handleChangePassword}
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;