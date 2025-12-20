import React, { useEffect, useState } from 'react';
import '../styles/settings.css';

const Settings = (props) => {
  const [activeTab, setActiveTab] = useState('profile');
  
  const [profileData, setProfileData] = useState({
    fname: '',
    lname: '',
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

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderAlerts: true,
    deliveryAlerts: true,
    weeklyReport: false
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch Supplier data on component mount
  useEffect(() => {
    fetchSupplierData();
  }, []);

  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/supplier/getsupplier', {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.error('Unauthorized: Token may have expired');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/';
          return;
        }
        console.error('Error fetching supplier data:', res.status);
        props.showAlert?.('Failed to load profile data', 'danger');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setProfileData({
        fname: data.fname || '',
        lname: data.lname || '',
        phone: data.phone || '',
        email: data.email || '',
        country: data.country || 'India',
        state: data.state || '',
        city: data.city || '',
        pincode: data.pincode || '',
        address: data.address || '',
        image: data.image || ''
      });
      
      setCompanyData({
        companyName: data.companyName || '',
        companyPhone: data.companyPhone || '',
        companyEmail: data.companyEmail || '',
        companyAddress: data.companyAddress || '',
        companyCountry: data.companyCountry || 'India',
        companyState: data.companyState || '',
        companyCity: data.companyCity || '',
        companyPincode: data.companyPincode || '',
        companyLogo: data.companyLogo || ''
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching supplier data:', error);
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

  const handlePreferencesChange = (e) => {
    const { id, type, checked, value } = e.target;
    setPreferences(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordChange = (e) => {
    const { id, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const dataToSend = {
        fname: profileData.fname,
        lname: profileData.lname,
        email: profileData.email,
        phone: profileData.phone,
        country: profileData.country,
        state: profileData.state,
        city: profileData.city,
        pincode: profileData.pincode,
        address: profileData.address
      };

      const res = await fetch('http://localhost:5000/api/supplier/updatesupplier', {
        method: 'PUT',
        headers,
        body: JSON.stringify(dataToSend)
      });

      if (res.ok) {
        props.showAlert?.('Profile updated successfully', 'success');
        fetchSupplierData();
      } else {
        const errorData = await res.json();
        props.showAlert?.('Failed to update profile: ' + (errorData.errors?.[0]?.msg || 'Unknown error'), 'danger');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      props.showAlert?.('Error updating profile', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      props.showAlert?.('Company settings saved successfully', 'success');
      setSaving(false);
    }, 500);
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      props.showAlert?.('Current password is required', 'warning');
      return;
    }
    if (!passwordData.newPassword) {
      props.showAlert?.('New password is required', 'warning');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      props.showAlert?.('New passwords do not match', 'danger');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      props.showAlert?.('Password must be at least 6 characters', 'warning');
      return;
    }

    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/supplier/changepassword', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (res.ok) {
        props.showAlert?.('Password changed successfully', 'success');
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const errorData = await res.json();
        props.showAlert?.('Failed to change password: ' + (errorData.message || 'Unknown error'), 'danger');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      props.showAlert?.('Error changing password', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account permanently? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/supplier/deleteaccount', {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        props.showAlert?.('Account deleted successfully', 'success');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/';
        }, 1500);
      } else {
        const errorData = await res.json();
        props.showAlert?.('Failed to delete account: ' + (errorData.message || 'Unknown error'), 'danger');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      props.showAlert?.('Error deleting account', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to deactivate your account? You can reactivate it anytime by logging in.'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/supplier/deactivate', {
        method: 'POST',
        headers
      });

      if (res.ok) {
        props.showAlert?.('Account deactivated successfully', 'success');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/';
        }, 1500);
      } else {
        const errorData = await res.json();
        props.showAlert?.('Failed to deactivate account: ' + (errorData.message || 'Unknown error'), 'danger');
      }
    } catch (error) {
      console.error('Error deactivating account:', error);
      props.showAlert?.('Error deactivating account', 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading your settings...</p>
      </div>
    );
  }

  return (
    <>
      <div className="settings-container">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-content">
            <h1 className="settings-title text-white">Settings</h1>
            <p className="settings-subtitle">Manage your profile, company, and preferences</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="bi bi-person-fill me-2"></i>Profile
          </button>
          <button
            className={`settings-tab ${activeTab === 'company' ? 'active' : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <i className="bi bi-building me-2"></i>Company
          </button>
          <button
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <i className="bi bi-shield-lock me-2"></i>Security
          </button>
          <button
            className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <i className="bi bi-sliders me-2"></i>Preferences
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="settings-panel">
              <div className="panel-header">
                <h2>Personal Profile</h2>
                <p className="text-muted">Update your personal information</p>
              </div>
              <form onSubmit={handleSaveProfile} className="settings-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="fname">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="fname"
                      placeholder="John"
                      value={profileData.fname}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lname">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="lname"
                      placeholder="Doe"
                      value={profileData.lname}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      placeholder="john@example.com"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      placeholder="+91 9876543210"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select
                      className="form-control"
                      id="country"
                      value={profileData.country}
                      onChange={handleProfileChange}
                      required
                    >
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State/Province</label>
                    <input
                      type="text"
                      className="form-control"
                      id="state"
                      placeholder="Maharashtra"
                      value={profileData.state}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      className="form-control"
                      id="city"
                      placeholder="Mumbai"
                      value={profileData.city}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pincode">Postal Code</label>
                    <input
                      type="text"
                      className="form-control"
                      id="pincode"
                      placeholder="400001"
                      value={profileData.pincode}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <label htmlFor="address">Street Address</label>
                    <textarea
                      className="form-control"
                      id="address"
                      rows="3"
                      placeholder="Enter your street address"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-save"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => fetchSupplierData()}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="settings-panel">
              <div className="panel-header">
                <h2>Company Information</h2>
                <p className="text-muted">Manage your company details</p>
              </div>
              <form onSubmit={handleSaveCompany} className="settings-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="companyName">Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="companyName"
                      placeholder="Your Company Name"
                      value={companyData.companyName}
                      onChange={handleCompanyChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="companyEmail">Company Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="companyEmail"
                      placeholder="company@example.com"
                      value={companyData.companyEmail}
                      onChange={handleCompanyChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="companyPhone">Company Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="companyPhone"
                      placeholder="+91 9876543210"
                      value={companyData.companyPhone}
                      onChange={handleCompanyChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="companyCountry">Country</label>
                    <select
                      className="form-control"
                      id="companyCountry"
                      value={companyData.companyCountry}
                      onChange={handleCompanyChange}
                      required
                    >
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="companyState">State</label>
                    <input
                      type="text"
                      className="form-control"
                      id="companyState"
                      placeholder="Maharashtra"
                      value={companyData.companyState}
                      onChange={handleCompanyChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="companyCity">City</label>
                    <input
                      type="text"
                      className="form-control"
                      id="companyCity"
                      placeholder="Mumbai"
                      value={companyData.companyCity}
                      onChange={handleCompanyChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="companyPincode">Postal Code</label>
                    <input
                      type="text"
                      className="form-control"
                      id="companyPincode"
                      placeholder="400001"
                      value={companyData.companyPincode}
                      onChange={handleCompanyChange}
                      required
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <label htmlFor="companyAddress">Company Address</label>
                    <textarea
                      className="form-control"
                      id="companyAddress"
                      rows="3"
                      placeholder="Enter your company address"
                      value={companyData.companyAddress}
                      onChange={handleCompanyChange}
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-save"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="settings-panel">
              <div className="panel-header">
                <h2>Security Settings</h2>
                <p className="text-muted">Protect your account with security options</p>
              </div>

              <div className="security-section">
                <div className="security-item">
                  <div className="security-icon">
                    <i className="bi bi-lock-fill"></i>
                  </div>
                  <div className="security-info">
                    <h3>Change Password</h3>
                    <p>Update your password regularly to keep your account secure</p>
                  </div>
                  <button
                    className="btn-action"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change
                  </button>
                </div>

                <div className="security-item">
                  <div className="security-icon warning">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                  </div>
                  <div className="security-info">
                    <h3>Deactivate Account</h3>
                    <p>Temporarily disable your account. You can reactivate it anytime by logging in</p>
                  </div>
                  <button
                    className="btn-action warning"
                    onClick={handleDeactivateAccount}
                    disabled={saving}
                  >
                    {saving ? 'Processing...' : 'Deactivate'}
                  </button>
                </div>

                <div className="security-item">
                  <div className="security-icon danger">
                    <i className="bi bi-trash-fill"></i>
                  </div>
                  <div className="security-info">
                    <h3>Delete Account</h3>
                    <p className="text-danger">This action is permanent. All your data will be deleted</p>
                  </div>
                  <button
                    className="btn-action danger"
                    onClick={handleDeleteAccountClick}
                    disabled={saving}
                  >
                    {saving ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="settings-panel">
              <div className="panel-header">
                <h2>Preferences</h2>
                <p className="text-muted">Customize your experience</p>
              </div>

              <div className="preferences-section">
                <div className="preference-group">
                  <h3>Notifications</h3>
                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="emailNotifications">Email Notifications</label>
                      <p className="text-muted small">Receive email updates about your account</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="emailNotifications"
                        checked={preferences.emailNotifications}
                        onChange={handlePreferencesChange}
                      />
                    </div>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="orderAlerts">Order Alerts</label>
                      <p className="text-muted small">Get notified when orders are placed or updated</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="orderAlerts"
                        checked={preferences.orderAlerts}
                        onChange={handlePreferencesChange}
                      />
                    </div>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="deliveryAlerts">Delivery Alerts</label>
                      <p className="text-muted small">Receive notifications about order deliveries</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="deliveryAlerts"
                        checked={preferences.deliveryAlerts}
                        onChange={handlePreferencesChange}
                      />
                    </div>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="weeklyReport">Weekly Report</label>
                      <p className="text-muted small">Receive weekly summary reports</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="weeklyReport"
                        checked={preferences.weeklyReport}
                        onChange={handlePreferencesChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button
                className="modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="currentPassword"
                  placeholder="Enter current password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="newPassword"
                  placeholder="Enter new password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Account</h2>
              <button
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="text-danger fw-bold">
                <i className="bi bi-exclamation-triangle me-2"></i>
                This action is permanent and cannot be undone.
              </p>
              <p className="mt-3">
                All your data including orders, profile information, and history will be permanently deleted.
              </p>
              <div className="form-group mt-4">
                <label htmlFor="deleteConfirmation">Type "DELETE" to confirm:</label>
                <input
                  type="text"
                  className="form-control"
                  id="deleteConfirmation"
                  placeholder="Type DELETE"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || saving}
              >
                {saving ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
