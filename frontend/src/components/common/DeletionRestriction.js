import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import AccountDeletionModal from './Modal/AccountDeletionModal';

const DeletionRestriction = ({ showAlert }) => {
  const { role, userDetails, deletionRestriction } = useRole();
  const [showDeletionModal, setShowDeletionModal] = useState(false);

  const isEmployeeTypeRole = role && role !== 'businessowner' && role !== 'supplier';
  const isEligibleRole = role === 'supplier' || isEmployeeTypeRole;

  const scheduledText = useMemo(() => {
    if (!deletionRestriction?.scheduledDeletionDate) {
      return 'soon';
    }

    const date = new Date(deletionRestriction.scheduledDeletionDate);
    if (Number.isNaN(date.getTime())) {
      return 'soon';
    }

    return date.toLocaleString();
  }, [deletionRestriction?.scheduledDeletionDate]);

  if (!isEligibleRole || !deletionRestriction) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container py-5">
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4 p-md-5 text-center">
          <h3 className="mb-3">Account Deletion in Progress</h3>
          <p className="mb-2">
            Your account deletion request has already been approved.
          </p>
          <p className="mb-4">
            Access is restricted until deletion completes. Scheduled deletion time: <strong>{scheduledText}</strong>
          </p>
          <button
            className="btn btn-danger px-4"
            onClick={() => setShowDeletionModal(true)}
          >
            Cancel Deletion Request
          </button>
        </div>
      </div>

      <AccountDeletionModal
        isOpen={showDeletionModal}
        onClose={() => setShowDeletionModal(false)}
        userRole={role === 'supplier' ? 'supplier' : 'employee'}
        userEmail={userDetails?.email || ''}
        showAlert={showAlert}
      />
    </div>
  );
};

export default DeletionRestriction;
