import { useEffect, useRef } from 'react';
import '../../../styles/CenteredModal.css';

const CenteredModal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  buttons = [],
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  const modalRef = useRef(null);
  const firstInteractiveRef = useRef(null);

  // Handle Escape key press
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus trap - set focus to first interactive element
  useEffect(() => {
    if (isOpen && firstInteractiveRef.current) {
      firstInteractiveRef.current.focus();
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (event) => {
    if (closeOnBackdrop && event.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      ref={modalRef}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
            ref={firstInteractiveRef}
          />
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {description && <p className="modal-description">{description}</p>}
          {children}
        </div>

        {/* Modal Footer with Buttons */}
        {buttons.length > 0 && (
          <div className="modal-footer">
            {buttons.map((button, index) => (
              <button
                key={index}
                type="button"
                className={`btn modal-btn ${button.variant || 'btn-secondary'}`}
                onClick={() => {
                  button.onClick();
                  if (button.closeAfter !== false) {
                    onClose();
                  }
                }}
                ref={index === 0 && !firstInteractiveRef.current ? firstInteractiveRef : null}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CenteredModal;
