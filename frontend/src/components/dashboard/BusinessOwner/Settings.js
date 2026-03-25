import { useEffect, useState } from 'react';
import '../../../styles/settings.css';
import DeletionRequestsManager from './DeletionRequestsManager';
import validationRules from '../../../utils/validationHelper';

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
    lowStockAlerts: true,
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


  // Fetch BusinessOwner data on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchBusinessOwnerData();
  }, []);

  const fetchBusinessOwnerData = async () => {
    try {
      setLoading(true);
      const headers = {
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
          phone: data.phone || '',
          email: data.email || '',
          country: data.country || 'India',
          state: data.state || '',
          city: data.city || '',
          pincode: data.pincode || '',
          address: data.address || '',
          image: data.image || ''
        });
      } else {
        props.showAlert?.('Failed to load profile data', 'danger');
      }
    } catch (error) {
      props.showAlert?.('Error loading profile', 'danger');
    } finally {
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

    if (profileData.phone && validationRules.phone(profileData.phone)) {
      props.showAlert?.(validationRules.phone(profileData.phone), 'danger');
      return;
    }

    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      // const businessOwnerRes = await fetch('http://localhost:5000/api/businessowner/getbusinessowner', {
      //   method: 'POST',
      //   headers
      // });
      // const currentBusinessOwner = await businessOwnerRes.json();

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

    if (companyData.companyPhone && validationRules.phone(companyData.companyPhone)) {
      props.showAlert?.(validationRules.phone(companyData.companyPhone).replace('phone number', 'company phone number'), 'danger');
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

      const dataToSend = {
        fname: profileData.fname,
        lname: profileData.lname,
        email: profileData.email,
        password: passwordData.newPassword,
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
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        props.showAlert?.('Failed to change password', 'danger');
      }
    } catch (error) {
      props.showAlert?.('Error changing password', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = () => {
    setSaving(true);
    setTimeout(() => {
      props.showAlert?.('Preferences saved successfully', 'success');
      setSaving(false);
    }, 500);
  };

  const handleDeleteAccountClick = async () => {
    setShowDeleteModal(true);
    setDeleteConfirmation('');
    
    // Check if there's an existing deletion request
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/businessowner/deletion-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasActiveDeletion) {
          props.showAlert?.(
            'You have an active deletion request. You can cancel it using the "Cancel Deletion Request" button.',
            'info'
          );
        }
      }
    } catch (error) {
      // console.error('Error checking deletion status:', error);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmationText = 'DELETE MY ACCOUNT';
    
    if (deleteConfirmation !== confirmationText) {
      props.showAlert?.(`Please type "${confirmationText}" to confirm`, 'warning');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // console.log('Delete account - Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      if (!token) {
        props.showAlert?.('Authentication token not found. Please login again.', 'danger');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'auth-token': token
      };

      // console.log('Sending delete request with headers:', { ...headers, 'auth-token': headers['auth-token'].substring(0, 20) + '...' });

      const res = await fetch('http://localhost:5000/api/businessowner/delete', {
        method: 'POST',
        headers
      });

      // console.log('Delete response status:', res.status);
      
      if (res.ok) {
        props.showAlert?.('Account deletion has been scheduled. You have 7 days to cancel this request.', 'success');
        // Logout and redirect to login
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/';
        }, 1500);
      } else {
        const errorData = await res.json();
        // console.error('Delete error response:', errorData);
        
        // Check if it's the existing deletion request error
        if (errorData.message && errorData.message.includes('already have an active deletion request')) {
          props.showAlert?.('You already have an active deletion request. Would you like to cancel it and create a new one?', 'warning');
        } else {
          props.showAlert?.('Failed to delete account: ' + (errorData.error || errorData.message || 'Unknown error'), 'danger');
        }
      }
    } catch (error) {
      // console.error('Delete account error:', error);
      props.showAlert?.('Error deleting account: ' + error.message, 'danger');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        props.showAlert?.('Authentication token not found. Please login again.', 'danger');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'auth-token': token
      };

      const res = await fetch('http://localhost:5000/api/businessowner/cancel-deletion', {
        method: 'POST',
        headers
      });

      if (res.ok) {
        const data = await res.json();
        props.showAlert?.(data.message, 'success');
        // Reset the form
        setDeleteConfirmation('');
        setShowDeleteModal(false);
      } else {
        const errorData = await res.json();
        props.showAlert?.('Failed to cancel deletion: ' + (errorData.message || 'Unknown error'), 'danger');
      }
    } catch (error) {
      // console.error('Cancel deletion error:', error);
      props.showAlert?.('Error cancelling deletion: ' + error.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to deactivate your account? You can reactivate it by logging in again.'
    );
    
    if (!confirmed) return;

    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/businessowner/deactivate', {
        method: 'POST',
        headers
      });

      if (res.ok) {
        props.showAlert?.('Account deactivated successfully', 'success');
        // Logout user after deactivation
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
          <button
            className={`settings-tab ${activeTab === 'deletions' ? 'active' : ''}`}
            onClick={() => setActiveTab('deletions')}
          >
            <i className="bi bi-trash me-2"></i>Account Deletions
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
                    <label htmlFor="state">State</label>
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
                  <div className="form-group full-width">
                    <label htmlFor="address">Address</label>
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
                    onClick={() => fetchBusinessOwnerData()}
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
                  <div className="form-group full-width">
                    <label htmlFor="companyAddress">Address</label>
                    <textarea
                      className="form-control"
                      id="companyAddress"
                      rows="3"
                      placeholder="Enter your company street address"
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
                      <p className="text-muted small">Get notified about new orders</p>
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
                      <label htmlFor="lowStockAlerts">Low Stock Alerts</label>
                      <p className="text-muted small">Receive alerts when product stock is low</p>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="lowStockAlerts"
                        checked={preferences.lowStockAlerts}
                        onChange={handlePreferencesChange}
                      />
                    </div>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="weeklyReport">Weekly Reports</label>
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

                <div className="form-actions">
                  <button
                    className="btn-save"
                    onClick={handleSavePreferences}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deletion Requests Tab */}
          {activeTab === 'deletions' && (
            <DeletionRequestsManager showAlert={props.showAlert} />
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            <div className="modal-header">
              <h2>Change Password</h2>
              <button
                className="modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="currentPassword"
                  placeholder="Enter your current password"
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
                <small className="text-muted">At least 6 characters</small>
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
                className="btn-cancel"
                onClick={() => setShowPasswordModal(false)}
              >
                Close
              </button>
              <button
                className="btn-save"
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
        <div className="settings-modal-overlay">
          <div className="settings-modal delete-modal">
            <div className="modal-header delete-header">
              <h2>Delete Account Permanently</h2>
              <button
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <p className="warning-text">
                  <strong>This action cannot be undone!</strong>
                </p>
              </div>
              
              <div className="delete-consequences">
                <h4>When you delete your account:</h4>
                <ul>
                  <li>All your data will be permanently deleted</li>
                  <li>Your account cannot be recovered</li>
                  <li>All associated records will be removed</li>
                  <li>You will be immediately logged out</li>
                </ul>
              </div>

              <div className="delete-info-box">
                <p>
                  <strong>Note:</strong> If you already have a pending deletion request, 
                  you can cancel it using the "Cancel Deletion Request" button below.
                </p>
              </div>

              <div className="delete-confirmation-section">
                <p className="confirmation-instruction">
                  To confirm, type <strong>"DELETE MY ACCOUNT"</strong> below:
                </p>
                <input
                  type="text"
                  className="form-control delete-confirmation-input"
                  placeholder="Type DELETE MY ACCOUNT"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
                <small className="text-muted">
                  Entered: {deleteConfirmation.length}/18
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-warning-action"
                onClick={handleCancelDeletion}
                disabled={saving}
                title="Click to cancel your existing deletion request"
              >
                {saving ? 'Processing...' : 'Cancel Deletion Request'}
              </button>
              <button
                className="btn-danger-action"
                onClick={handleDeleteAccount}
                disabled={saving || deleteConfirmation !== 'DELETE MY ACCOUNT'}
              >
                {saving ? 'Deleting Account...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;

