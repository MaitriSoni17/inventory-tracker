import React, { useState, useEffect } from 'react';
import CenteredModal from '../../common/Modal/CenteredModal';
import '../../../styles/DeletionRequestsManager.css';

const DeletionRequestsManager = ({ showAlert }) => {
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [dataSummary, setDataSummary] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loadingDataSummary, setLoadingDataSummary] = useState(false);

  // Fetch deletion requests on mount
  useEffect(() => {
    fetchDeletionRequests();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDeletionRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDeletionRequests = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/deletion/pending-requests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        }
      });

      const data = await response.json();
      if (data.success) {
        setDeletionRequests(data.requests || []);
      }
      setLoading(false);
    } catch (error) {
      // console.error('Error fetching deletion requests:', error);
      showAlert?.('Failed to fetch deletion requests', 'danger');
      setLoading(false);
    }
  };

  const handleApproveClick = async (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setDataSummary(null);
    setLoadingDataSummary(true);
    setShowModal(true);

    // Fetch data summary for this user
    try {
      const endpoint = request.userRole === 'supplier' 
        ? `http://localhost:5000/api/supplier/${request.userId}`
        : `http://localhost:5000/api/employee/${request.userId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        }
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Build data summary
        const summary = {
          email: userData.email,
          name: `${userData.fname || ''} ${userData.lname || ''}`.trim(),
          role: request.userRole,
          createdDate: new Date(userData.createdAt).toLocaleDateString(),
          lastActive: userData.lastActive ? new Date(userData.lastActive).toLocaleDateString() : 'Unknown',
          // Additional data that will be preserved
          preserved: {
            profileData: userData.fname || userData.lname || userData.phone,
            address: userData.city || userData.state || userData.address,
            documents: 'All historical records'
          }
        };
        
        setDataSummary(summary);
      }
    } catch (error) {
      // console.error('Error fetching user data summary:', error);
      // Continue with modal even if summary fetch fails
    } finally {
      setLoadingDataSummary(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/deletion/approve/${selectedRequest._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        }
      });

      const data = await response.json();
      if (data.success) {
        showAlert?.('Deletion request approved successfully', 'success');
        setShowModal(false);
        fetchDeletionRequests();
      } else {
        showAlert?.(data.message || 'Failed to approve deletion request', 'danger');
      }
    } catch (error) {
      // console.error('Error approving deletion request:', error);
      showAlert?.('An error occurred while approving the request', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/deletion/reject/${selectedRequest._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ rejectionReason })
      });

      const data = await response.json();
      if (data.success) {
        showAlert?.('Deletion request rejected successfully', 'success');
        setShowModal(false);
        fetchDeletionRequests();
      } else {
        showAlert?.(data.message || 'Failed to reject deletion request', 'danger');
      }
    } catch (error) {
      // console.error('Error rejecting deletion request:', error);
      showAlert?.('An error occurred while rejecting the request', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', label: 'Pending' },
      approved: { class: 'badge-success', label: 'Approved' },
      rejected: { class: 'badge-danger', label: 'Rejected' },
      cancelled: { class: 'badge-secondary', label: 'Cancelled' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const getApprovalModal = () => {
    return (
      <CenteredModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Review Deletion Request`}
        buttons={[
          {
            label: actionLoading ? 'Processing...' : 'Approve',
            variant: 'btn-success',
            onClick: handleApprove,
            closeAfter: false
          },
          {
            label: 'Reject',
            variant: 'btn-danger',
            onClick: handleReject,
            closeAfter: false
          },
          {
            label: 'Close',
            variant: 'btn-secondary',
            onClick: () => setShowModal(false),
            closeAfter: false
          }
        ]}
      >
        {selectedRequest && (
          <div className="request-review">
            <div className="review-section">
              <h5>User Information</h5>
              <p>
                <strong>Email:</strong> {selectedRequest.userEmail}
              </p>
              <p>
                <strong>Role:</strong> {selectedRequest.userRole.charAt(0).toUpperCase() + selectedRequest.userRole.slice(1)}
              </p>
              <p>
                <strong>Requested Date:</strong> {formatDate(selectedRequest.requestDate)}
              </p>
            </div>

            <div className="review-section">
              <h5>Reason for Deletion</h5>
              <p className="reason-text">{selectedRequest.reason || 'No reason provided'}</p>
            </div>

            {selectedRequest.status === 'pending' && (
              <>
                <div className="review-section data-preservation-info">
                  <h5>
                    <i className="bi bi-info-circle me-2"></i>Data Preservation Notice
                  </h5>
                  <div className="preservation-content">
                    <p>
                      <strong>When you approve this request:</strong>
                    </p>
                    <ul className="preservation-list">
                      <li>
                        <strong>✓ Account Connection Removed:</strong> This {selectedRequest.userRole} will be disconnected from your business
                      </li>
                      <li>
                        <strong>✓ Data Preserved:</strong> All their profile information, historical records, and documents remain archived
                      </li>
                      <li>
                        <strong>✓ Access Revoked:</strong> They can no longer log in with their {selectedRequest.userRole} account
                      </li>
                      <li>
                        <strong>✓ No Data Loss:</strong> Their information is retained for audit and compliance purposes
                      </li>
                    </ul>
                    <p className="timeline-note">
                      The user will have a 72-hour grace period to cancel this request after approval.
                    </p>
                  </div>
                </div>

                <div className="review-section">
                  <h5>Timeline if Approved</h5>
                  <ul className="timeline-info">
                    <li><strong>Immediately:</strong> Request marked as approved</li>
                    <li><strong>↓ 72 hours:</strong> User can still cancel by requesting to keep their account</li>
                    <li><strong>After 72 hours:</strong> Account automatically disconnected and data archived</li>
                  </ul>
                </div>

                <div className="review-section">
                  <label htmlFor="rejectionReason" className="form-label">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    id="rejectionReason"
                    className="form-control"
                    placeholder="Explain why you're rejecting this deletion request (optional)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows="3"
                    maxLength="500"
                  />
                  <small>{rejectionReason.length}/500 characters</small>
                </div>
              </>
            )}
          </div>
        )}
      </CenteredModal>
    );
  };

  if (loading) {
    return (
      <div className="deletion-requests-manager">
        <div className="loading-state">Loading deletion requests...</div>
      </div>
    );
  }

  return (
    <div className="deletion-requests-manager">
      <div className="manager-header">
        <h3>Account Deletion Requests</h3>
        <p className="subtitle">
          Manage deletion requests from your Employees and Suppliers
        </p>
      </div>

      {/* Information Box */}
      <div className="info-banner">
        <div className="info-icon">
          <i className="bi bi-info-circle-fill"></i>
        </div>
        <div className="info-content">
          <h5>How the Deletion Process Works</h5>
          <ul className="info-list">
            <li><strong>Step 1:</strong> Employee/Supplier requests account deletion with a reason</li>
            <li><strong>Step 2:</strong> You review the request and approve or reject it</li>
            <li><strong>Step 3:</strong> If approved, the user gets a 72-hour grace period to cancel</li>
            <li><strong>Step 4:</strong> After 72 hours, their account is automatically disconnected from your business and data is archived</li>
            <li><strong>Data Safety:</strong> No data is ever lost - all information is preserved for compliance and audit purposes</li>
          </ul>
        </div>
      </div>

      {deletionRequests.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-inbox"></i>
          <p>No pending deletion requests</p>
          <small>Deletion requests from your employees and suppliers will appear here</small>
        </div>
      ) : (
        <div className="requests-list">
          {deletionRequests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="card-header">
                <div className="header-left">
                  <h5>{request.userEmail}</h5>
                  <span className="role-badge">
                    {request.userRole === 'supplier' ? '🏢 Supplier' : '👤 Employee'}
                  </span>
                </div>
                <div className="header-right">
                  {getStatusBadge(request.status)}
                </div>
              </div>

              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <label>Requested</label>
                    <span>{formatDate(request.requestDate)}</span>
                  </div>
                  <div className="info-item">
                    <label>Reason</label>
                    <span className="reason-preview">
                      {request.reason || 'No reason provided'}
                    </span>
                  </div>
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="card-footer">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleApproveClick(request)}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Review & Approve
                  </button>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="card-footer approval-info">
                  <i className="bi bi-info-circle me-2"></i>
                  <span>
                    Approved on {formatDate(request.approvalDate)}. 
                    Account will be deleted on {formatDate(request.scheduledDeletionDate)}
                  </span>
                </div>
              )}

              {request.status === 'rejected' && (
                <div className="card-footer rejection-info">
                  <div className="rejection-reason">
                    <strong>Rejection Reason:</strong>
                    <p>{request.rejectionReason}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {getApprovalModal()}
    </div>
  );
};

export default DeletionRequestsManager;
