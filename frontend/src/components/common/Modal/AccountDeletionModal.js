import { useState, useEffect } from 'react';
import CenteredModal from './CenteredModal';
import '../../../styles/AccountDeletionModal.css';

const AccountDeletionModal = ({ isOpen, onClose, userRole, userEmail, showAlert }) => {
  const [step, setStep] = useState(1); // 1: Confirmation, 2: Reason, 3: Final Confirmation, 4: Success
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check for existing deletion request when modal opens
  useEffect(() => {
    if (isOpen) {
      checkExistingRequest();
    }
  }, [isOpen]);

  const checkExistingRequest = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('http://localhost:5000/api/deletion/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        }
      });

      const data = await response.json();
      if (data.success && data.hasRequest) {
        setExistingRequest(data.requestData);
      } else {
        setExistingRequest(null);
        // Reset state when modal opens and no existing request
        setStep(1);
        setReason('');
        setLoading(false);
        setDeletionStatus(null);
        setRequestId(null);
      }
    } catch (error) {
      // console.error('Error checking deletion status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCancelExistingRequest = async () => {
    if (!existingRequest) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/deletion/request/${existingRequest._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        }
      });

      const data = await response.json();
      if (data.success) {
        showAlert?.('Previous deletion request cancelled. You can now submit a new one.', 'success');
        setExistingRequest(null);
        setStep(1);
        setReason('');
      } else {
        showAlert?.(data.message || 'Failed to cancel deletion request', 'danger');
      }
    } catch (error) {
      // console.error('Error cancelling deletion request:', error);
      showAlert?.('Error cancelling previous request', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!reason.trim()) {
        showAlert?.('Please provide a reason for deletion', 'warning');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmitDeletion = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/deletion/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert?.(data.message || 'Failed to submit deletion request', 'danger');
        setLoading(false);
        return;
      }

      setRequestId(data.requestId);
      setDeletionStatus(data.message);
      setStep(4);
      setLoading(false);

      // Auto-close after 5 seconds
      setTimeout(() => {
        onClose();
      }, 5000);
    } catch (error) {
      // console.error('Error:', error);
      showAlert?.('An error occurred. Please try again.', 'danger');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep(1);
    setReason('');
    onClose();
  };

  // Step 1: Initial Warning
  const step1Content = (
    <div className="deletion-step">
      <div className="warning-icon">⚠️</div>
      <h3>Account Deletion Warning</h3>
      <p>
        {userRole === 'businessowner'
          ? 'Deleting your account will permanently remove your business profile and all associated data including employees, suppliers, products, categories, warehouses, and orders. This action affects your entire business ecosystem.'
          : 'Deleting your account will remove your profile and all your associated data. Your Business Owner will need to approve this request.'}
      </p>
      <div className="deletion-consequences">
        <h5>This action:</h5>
        <ul>
          <li>✗ Permanently deletes your account</li>
          <li>✗ Cannot be undone</li>
          <li>✗ Will remove all your data from the system</li>
          {userRole !== 'businessowner' && <li>✗ Requires approval from your Business Owner</li>}
          {userRole === 'businessowner' && <li>✗ Will delete all employees, suppliers, products, and orders</li>}
          {userRole === 'businessowner' && <li>✗ Will have a 7-day waiting period before execution</li>}
        </ul>
      </div>
    </div>
  );

  // Step 2: Reason Collection
  const step2Content = (
    <div className="deletion-step">
      <h3>Tell us why you're leaving</h3>
      <p>Please provide your reason for account deletion. This helps us improve our service.</p>
      <div className="form-group">
        <textarea
          className="form-control"
          placeholder="Enter your reason here (optional but appreciated)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows="4"
          maxLength="500"
        />
        <small>{reason.length}/500 characters</small>
      </div>
      <div className="deletion-notice">
        <strong>Note:</strong> {userRole === 'businessowner'
          ? 'Your account will be deleted after a 7-day waiting period. You can cancel anytime during this period.'
          : 'Your Business Owner will receive a notification to approve or deny this request.'}
      </div>
    </div>
  );

  // Step 3: Final Confirmation
  const step3Content = (
    <div className="deletion-step">
      <div className="confirm-icon">⚠️ FINAL CONFIRMATION</div>
      <h3>Are you absolutely certain?</h3>
      <p className="confirmation-text">
        <strong>{userEmail}</strong> and all associated data will be permanently deleted.
      </p>
      <div className="deletion-timeline">
        <h5>Timeline:</h5>
        {userRole === 'businessowner' ? (
          <div className="timeline-steps">
            <div className="timeline-step">
              <span className="step-number">1</span>
              <span className="step-text">Request Submitted</span>
            </div>
            <span className="timeline-arrow">→</span>
            <div className="timeline-step">
              <span className="step-number">2</span>
              <span className="step-text">7-Day Wait Period</span>
            </div>
            <span className="timeline-arrow">→</span>
            <div className="timeline-step">
              <span className="step-number">3</span>
              <span className="step-text">Full Cascade Deletion</span>
            </div>
          </div>
        ) : (
          <div className="timeline-steps">
            <div className="timeline-step">
              <span className="step-number">1</span>
              <span className="step-text">Request Submitted</span>
            </div>
            <span className="timeline-arrow">→</span>
            <div className="timeline-step">
              <span className="step-number">2</span>
              <span className="step-text">Awaiting Approval</span>
            </div>
            <span className="timeline-arrow">→</span>
            <div className="timeline-step">
              <span className="step-number">3</span>
              <span className="step-text">72-Hour Wait</span>
            </div>
            <span className="timeline-arrow">→</span>
            <div className="timeline-step">
              <span className="step-number">4</span>
              <span className="step-text">Account Deleted</span>
            </div>
          </div>
        )}
      </div>
      {userRole === 'businessowner' && (
        <div className="cascade-warning">
          <h5>📦 The Following Will Be Permanently Deleted:</h5>
          <ul className="cascade-deletion-list">
            <li>All Employees and their accounts</li>
            <li>All Suppliers and their information</li>
            <li>All Products and inventory</li>
            <li>All Product Categories</li>
            <li>All Warehouses</li>
            <li>All Orders (Customer & Supplier)</li>
            <li>All Notifications</li>
            <li>Complete Business Records</li>
          </ul>
          <p className="cascade-note">This is a comprehensive deletion that cannot be undone.</p>
        </div>
      )}
      <div className="confirmation-warning">
        <p>This is your last chance to cancel this action.</p>
      </div>
    </div>
  );

  // Step 4: Success
  const step4Content = (
    <div className="deletion-step success">
      <div className="success-icon">✓</div>
      <h3>Request Submitted Successfully</h3>
      <p className="success-message">
        {deletionStatus}
      </p>
      <div className="success-details">
        <p>Request ID: <strong>{requestId}</strong></p>
        <p>You will receive email updates about your deletion request status.</p>
        {userRole !== 'businessowner' && (
          <p>Your Business Owner will review your request shortly.</p>
        )}
      </div>
    </div>
  );

  const getContent = () => {
    // Show existing request warning first
    if (existingRequest) {
      return (
        <div className="deletion-step">
          <div className="info-icon">ℹ️</div>
          <h3>Active Deletion Request Found</h3>
          <p>You already have an active deletion request that is being processed.</p>
          
          <div className="existing-request-details">
            <div className="detail-item">
              <strong>Status:</strong>
              <span className={`status-badge status-${existingRequest.status}`}>
                {existingRequest.status.charAt(0).toUpperCase() + existingRequest.status.slice(1)}
              </span>
            </div>
            <div className="detail-item">
              <strong>Requested On:</strong>
              <span>{new Date(existingRequest.requestDate).toLocaleDateString()}</span>
            </div>
            {existingRequest.scheduledDeletionDate && (
              <div className="detail-item">
                <strong>Scheduled Deletion:</strong>
                <span>{new Date(existingRequest.scheduledDeletionDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="detail-item">
              <strong>Reason:</strong>
              <p className="reason-text">{existingRequest.reason || 'No reason provided'}</p>
            </div>
          </div>

          <div className="request-info-box">
            {existingRequest.status === 'pending' && (
              <p>Your Business Owner is reviewing your request. Please wait for their decision.</p>
            )}
            {existingRequest.status === 'approved' && (
              <p>Your request has been approved. Your account will be disconnected on the scheduled date. You can still cancel this request before that date.</p>
            )}
            {existingRequest.status === 'rejected' && (
              <p>Your deletion request was rejected. You can submit a new request if you'd like.</p>
            )}
          </div>

          <div className="action-options">
            {existingRequest.status === 'rejected' && (
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setExistingRequest(null);
                  setStep(1);
                }}
              >
                Submit New Request
              </button>
            )}
            {(existingRequest.status === 'pending' || existingRequest.status === 'approved') && (
              <button 
                className="btn btn-danger"
                onClick={handleCancelExistingRequest}
                disabled={loading}
              >
                {loading ? 'Cancelling...' : 'Cancel This Request'}
              </button>
            )}
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    switch (step) {
      case 1:
        return step1Content;
      case 2:
        return step2Content;
      case 3:
        return step3Content;
      case 4:
        return step4Content;
      default:
        return null;
    }
  };

  const getButtons = () => {
    // No buttons when checking status
    if (checkingStatus) {
      return [];
    }

    // No buttons when existing request is shown (buttons in content instead)
    if (existingRequest) {
      return [];
    }

    if (step === 4) {
      return [
        {
          label: 'Close',
          variant: 'btn-secondary',
          onClick: onClose,
          closeAfter: false
        }
      ];
    }

    return [
      ...(step > 1
        ? [
          {
            label: 'Back',
            variant: 'btn-secondary',
            onClick: () => setStep(step - 1),
            closeAfter: false
          }
        ]
        : []),
      {
        label: step === 3 ? (loading ? 'Submitting...' : 'Delete My Account') : 'Continue',
        variant: step === 3 ? 'btn-danger' : 'btn-primary',
        onClick: step === 3 ? handleSubmitDeletion : handleContinue,
        closeAfter: false
      },
      {
        label: 'Cancel',
        variant: 'btn-secondary',
        onClick: handleCancel,
        closeAfter: false
      }
    ];
  };

  return (
    <CenteredModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Delete Account"
      buttons={getButtons()}
      closeOnBackdrop={false}
      closeOnEscape={step !== 3}
    >
      {getContent()}
    </CenteredModal>
  );
};

export default AccountDeletionModal;
