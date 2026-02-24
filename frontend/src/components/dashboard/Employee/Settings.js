import { useEffect, useState } from 'react';
import '../../../styles/settings.css';
import AccountDeletionModal from '../../common/Modal/AccountDeletionModal';

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

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderAlerts: true,
    lowStockAlerts: true,
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

  // Fetch Employee data on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchEmployeeData();
    fetchEmployeePreferences();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/employee/getemployee', {
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

  const fetchEmployeePreferences = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const res = await fetch('http://localhost:5000/api/employee/getpreferences', {
        method: 'POST',
        headers
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences({
          emailNotifications: data.emailNotifications !== false,
          orderAlerts: data.orderAlerts !== false,
          lowStockAlerts: data.lowStockAlerts !== false,
          weeklyReport: data.weeklyReport === true
        });
      }
    } catch (error) {
    }
  };

  const handleProfileChange = (e) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handlePreferencesChange = (e) => {
    const { id, type, checked, value } = e.target;
    const newPreferences = {
      ...preferences,
      [id]: type === 'checkbox' ? checked : value
    };
    setPreferences(newPreferences);
    
    // Save preferences immediately
    savePreferencesAsync(newPreferences);
  };

  const savePreferencesAsync = async (prefsToSave) => {
    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      };

      const dataToSend = {
        emailNotifications: prefsToSave.emailNotifications,
        orderAlerts: prefsToSave.orderAlerts,
        lowStockAlerts: prefsToSave.lowStockAlerts,
        weeklyReport: prefsToSave.weeklyReport
      };

      const res = await fetch('http://localhost:5000/api/employee/updatepreferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(dataToSend)
      });

      if (res.ok) {
        props.showAlert?.('Preferences updated successfully', 'success');
      } else {
        props.showAlert?.('Failed to update preferences', 'danger');
      }
    } catch (error) {
      props.showAlert?.('Error updating preferences', 'danger');
    } finally {
      setSaving(false);
    }
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

      const res = await fetch('http://localhost:5000/api/employee/updateemployee', {
        method: 'PUT',
        headers,
        body: JSON.stringify(dataToSend)
      });

      if (res.ok) {
        props.showAlert?.('Profile updated successfully', 'success');
      } else {
        props.showAlert?.('Failed to update profile', 'danger');
      }
    } catch (error) {
      props.showAlert?.('Error updating profile', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      props.showAlert?.('Passwords do not match', 'warning');
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

      const res = await fetch('http://localhost:5000/api/employee/updateemployee', {
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
    savePreferencesAsync(preferences);
  };

  const handleDeleteAccountClick = () => {
    setShowDeletionModal(true);
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

      const res = await fetch('http://localhost:5000/api/employee/deactivateemployee', {
        method: 'PUT',
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
        props.showAlert?.('Failed to deactivate account', 'danger');
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
            <p className="settings-subtitle">Manage your profile and preferences</p>
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

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        isOpen={showDeletionModal}
        onClose={() => setShowDeletionModal(false)}
        userRole="employee"
        userEmail={profileData.email}
        showAlert={props.showAlert}
      />
    </>
  );
};

export default Settings;


