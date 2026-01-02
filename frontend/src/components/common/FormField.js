import React from 'react';
import '../../styles/validation.css';

/**
 * FormField Component - Reusable field with built-in validation
 * Provides elegant validation UI with error messages
 */
const FormField = ({
  type = 'text',
  name,
  label,
  placeholder,
  value = '',
  onChange,
  onBlur,
  error = '',
  success = false,
  disabled = false,
  required = false,
  validation = null,
  showValidation = false,
  maxLength = null,
  minLength = null,
  options = [],
  className = '',
  hint = '',
  icon = null,
  showCharCounter = false,
  ...rest
}) => {
  const [touched, setTouched] = React.useState(false);
  const [displayError, setDisplayError] = React.useState(error);

  const handleBlur = (e) => {
    setTouched(true);
    
    // Run validation if provided
    if (validation && typeof validation === 'function') {
      const validationError = validation(e.target.value);
      setDisplayError(validationError);
    }

    if (onBlur) {
      onBlur(e);
    }
  };

  const handleChange = (e) => {
    // Clear error when user starts typing
    if (displayError) {
      setDisplayError('');
    }

    if (onChange) {
      onChange(e);
    }

    // Real-time validation if validation function provided
    if (validation && typeof validation === 'function') {
      const validationError = validation(e.target.value);
      setDisplayError(validationError);
    }
  };

  const isInvalid = displayError && (touched || showValidation);
  const isValid = success && (touched || showValidation) && !displayError;
  
  const fieldClasses = `
    form-control
    ${isInvalid ? 'is-invalid' : ''}
    ${isValid ? 'is-valid' : ''}
    ${disabled ? 'is-loading' : ''}
    ${className}
  `.trim();

  const renderField = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            name={name}
            className={fieldClasses}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={maxLength}
            {...rest}
          />
        );

      case 'select':
        return (
          <select
            name={name}
            className={`form-select ${fieldClasses}`}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            {...rest}
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            name={name}
            className="form-check-input"
            checked={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            {...rest}
          />
        );

      case 'radio':
        return (
          <input
            type="radio"
            name={name}
            className="form-check-input"
            checked={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            {...rest}
          />
        );

      default:
        return (
          <input
            type={type}
            name={name}
            className={fieldClasses}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={maxLength}
            minLength={minLength}
            {...rest}
          />
        );
    }
  };

  return (
    <div className={`form-group ${isInvalid ? 'has-error shake' : ''} ${isValid ? 'has-success' : ''}`}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}

      <div className={`form-field-wrapper ${icon ? 'has-icon' : ''}`}>
        {renderField()}
        {icon && <span className="validation-icon">{icon}</span>}
      </div>

      {hint && !displayError && (
        <div className="info-message">{hint}</div>
      )}

      {displayError && touched && (
        <div className="error-message">{displayError}</div>
      )}

      {success && isValid && !displayError && (
        <div className="success-message">Looks good!</div>
      )}

      {showCharCounter && maxLength && type === 'textarea' && (
        <div className="character-counter">
          <span>
            <span className="character-counter-value">{value.length}</span>
            <span> / {maxLength} characters</span>
          </span>
          {value.length > maxLength * 0.8 && (
            <span className={value.length === maxLength ? 'character-counter-error' : 'character-counter-warning'}>
              {maxLength - value.length} remaining
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FormField;


