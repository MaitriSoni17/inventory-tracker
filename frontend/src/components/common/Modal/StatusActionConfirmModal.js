import { useEffect, useMemo, useState } from 'react';
import CenteredModal from './CenteredModal';

const StatusActionConfirmModal = ({
  isOpen,
  onClose,
  actionType,
  entityType,
  entityName,
  onConfirm,
  loading = false
}) => {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const requiredWord = useMemo(() => {
    return actionType === 'reactivate' ? 'REACTIVATE' : 'DEACTIVATE';
  }, [actionType]);

  const title = useMemo(() => {
    return `${actionType === 'reactivate' ? 'Reactivate' : 'Deactivate'} ${entityType || 'Account'}`;
  }, [actionType, entityType]);

  const description = useMemo(() => {
    if (!entityName) {
      return 'Type the confirmation word to continue.';
    }

    return `${actionType === 'reactivate' ? 'Reactivating' : 'Deactivating'} ${entityName} will ${actionType === 'reactivate' ? 'restore' : 'block'} account access.`;
  }, [actionType, entityName]);

  const isValid = confirmText.trim().toUpperCase() === requiredWord;

  const handleConfirm = async () => {
    if (!isValid || loading) {
      return;
    }

    await onConfirm();
  };

  return (
    <CenteredModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
    >
      <div className="mb-3">
        <label className="form-label fw-semibold">
          Type <span className="text-danger">{requiredWord}</span> to confirm
        </label>
        <input
          type="text"
          className="form-control"
          placeholder={requiredWord}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${actionType === 'reactivate' ? 'btn-success' : 'btn-danger'}`}
          onClick={handleConfirm}
          disabled={!isValid || loading}
        >
          {loading
            ? (actionType === 'reactivate' ? 'Reactivating...' : 'Deactivating...')
            : (actionType === 'reactivate' ? 'Reactivate' : 'Deactivate')}
        </button>
      </div>
    </CenteredModal>
  );
};

export default StatusActionConfirmModal;
