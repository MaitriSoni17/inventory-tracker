/**
 * Form Validation Helper
 * Provides reusable validation functions for common form fields
 */

const validationRules = {
  // Required field validation
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return '';
  },

  // Email validation
  email: (value) => {
    if (!value) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  },

  // Password validation
  password: (value, minLength = 6) => {
    if (!value) return '';
    if (value.length < minLength) {
      return `Password must be at least ${minLength} characters long`;
    }
    return '';
  },

  // Confirm password validation
  confirmPassword: (password, confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  },

  // Phone number validation (10 digits for India)
  phone: (value) => {
    if (!value) return '';
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(value.replace(/\D/g, ''))) {
      return 'Please enter a valid 10-digit phone number';
    }
    return '';
  },

  // Number validation
  number: (value, fieldName = 'This field') => {
    if (!value) return '';
    if (isNaN(value) || Number(value) < 0) {
      return `${fieldName} must be a valid positive number`;
    }
    return '';
  },

  // Minimum length validation
  minLength: (value, length, fieldName = 'This field') => {
    if (!value) return '';
    if (value.length < length) {
      return `${fieldName} must be at least ${length} characters`;
    }
    return '';
  },

  // Maximum length validation
  maxLength: (value, length, fieldName = 'This field') => {
    if (!value) return '';
    if (value.length > length) {
      return `${fieldName} must not exceed ${length} characters`;
    }
    return '';
  },

  // URL validation
  url: (value) => {
    if (!value) return '';
    try {
      new URL(value);
      return '';
    } catch {
      return 'Please enter a valid URL';
    }
  },

  // Date validation (not in past)
  dateNotPast: (value) => {
    if (!value) return '';
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return 'Date cannot be in the past';
    }
    return '';
  },

  // Strong password validation
  strongPassword: (value) => {
    if (!value) return '';
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(value)) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }
    return '';
  },

  // Alphanumeric validation
  alphanumeric: (value, fieldName = 'This field') => {
    if (!value) return '';
    const alphanumericRegex = /^[a-zA-Z0-9\s]*$/;
    if (!alphanumericRegex.test(value)) {
      return `${fieldName} can only contain letters and numbers`;
    }
    return '';
  },

  // Custom pattern validation
  pattern: (value, pattern, message) => {
    if (!value) return '';
    if (!pattern.test(value)) {
      return message || 'Invalid format';
    }
    return '';
  },

  // Multiple validation rules
  validate: (value, rules) => {
    for (let rule of rules) {
      const error = rule.validate(value);
      if (error) return error;
    }
    return '';
  }
};

export default validationRules;
