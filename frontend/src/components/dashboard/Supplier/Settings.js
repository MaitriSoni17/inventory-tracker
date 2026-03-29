import { useEffect, useState } from 'react';
import '../../../styles/settings.css';
import AccountDeletionModal from '../../common/Modal/AccountDeletionModal';

const isValidPhoneNumber = (value) => {
  if (!value) return false;
  const cleanValue = String(value).replace(/[^\d+]/g, '');

  // India: +91 followed by 10 digits, first digit 6,7,8,9
  const indiaRegex = /^\+91[6789]\d{9}$/;

  // USA/Canada: +1 followed by 10 digits, area code not starting with 0 or 1
  const usCanadaRegex = /^\+1[2-9]\d{2}\d{6}$/;

  // UK: +44 followed by 10-11 digits
  // Mobile: +447 followed by 9 digits (11 total)
  // Landline: +44 followed by 10 digits
  const ukMobileRegex = /^\+447\d{9}$/;
  const ukLandlineRegex = /^\+44\d{10}$/;

  // China: +86 followed by 11 digits, mobile starts with 1
  const chinaMobileRegex = /^\+861\d{10}$/;

  // Germany: +49 followed by 10-11 digits
  // Mobile: +49 followed by 10-11 digits starting with 15,16,17
  const germanyMobileRegex = /^\+49(15|16|17)\d{8,9}$/;
  const germanyLandlineRegex = /^\+49\d{10,11}$/;

  // Australia: +61 followed by 9 digits, mobile starts with 4
  const australiaMobileRegex = /^\+614\d{8}$/;
  const australiaLandlineRegex = /^\+61\d{9}$/;

  // Plain 10-digit Indian number (legacy support)
  const plainIndianRegex = /^[6789]\d{9}$/;

  return indiaRegex.test(cleanValue) ||
         usCanadaRegex.test(cleanValue) ||
         ukMobileRegex.test(cleanValue) ||
         ukLandlineRegex.test(cleanValue) ||
         chinaMobileRegex.test(cleanValue) ||
         germanyMobileRegex.test(cleanValue) ||
         germanyLandlineRegex.test(cleanValue) ||
         australiaMobileRegex.test(cleanValue) ||
         australiaLandlineRegex.test(cleanValue) ||
         plainIndianRegex.test(cleanValue);
};
const sanitizePhoneInput = (value) => String(value || '').replace(/[^\d+]/g, '').slice(0, 16);

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
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch Supplier data on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/';
          return;
        }
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
      props.showAlert?.('Error loading profile', 'danger');
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: id === 'phone' ? sanitizePhoneInput(value) : value
    }));
  };

  const handleCompanyChange = (e) => {
    const { id, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [id]: id === 'companyPhone' ? sanitizePhoneInput(value) : value
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

    if (profileData.phone && !isValidPhoneNumber(profileData.phone)) {
      props.showAlert?.('Please enter a valid 10-digit phone number', 'danger');
      return;
    }

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
      props.showAlert?.('Error updating profile', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();

    if (companyData.companyPhone && !isValidPhoneNumber(companyData.companyPhone)) {
      props.showAlert?.('Please enter a valid 10-digit company phone number', 'danger');
      return;
    }

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
        localStorage.removeItem('forcePasswordChange');
        props.showAlert?.('Password changed successfully. Please login again.', 'success');
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          window.location.href = '/login';
        }, 900);
      } else {
        const errorData = await res.json();
        props.showAlert?.('Failed to change password: ' + (errorData.message || 'Unknown error'), 'danger');
      }
    } catch (error) {
      props.showAlert?.('Error changing password', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setShowDeletionModal(true);
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
                      maxLength={16}
                      pattern="[\+]?[\d\s\-\(\)]*"
                      
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select
                      className="form-control"
                      id="country"
                      value={profileData.country}
                      onChange={handleProfileChange}
                      
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
                      maxLength={16}
                      pattern="[\+]?[\d\s\-\(\)]*"
                      
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="companyCountry">Country</label>
                    <select
                      className="form-control"
                      id="companyCountry"
                      value={companyData.companyCountry}
                      onChange={handleCompanyChange}
                      
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

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        isOpen={showDeletionModal}
        onClose={() => setShowDeletionModal(false)}
        userRole="supplier"
        userEmail={profileData.email}
        showAlert={props.showAlert}
      />
    </>
  );
};

export default Settings;


