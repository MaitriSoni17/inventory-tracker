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

  // Phone number validation (supports international formats with country-specific rules)
  phone: (value) => {
    if (value === null || value === undefined || value === '') return '';

    const stringValue = String(value).trim();
    if (!stringValue) return '';

    // Remove all non-digit characters except +
    const cleanValue = stringValue.replace(/[^\d+]/g, '');

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

    if (indiaRegex.test(cleanValue) ||
        usCanadaRegex.test(cleanValue) ||
        ukMobileRegex.test(cleanValue) ||
        ukLandlineRegex.test(cleanValue) ||
        chinaMobileRegex.test(cleanValue) ||
        germanyMobileRegex.test(cleanValue) ||
        germanyLandlineRegex.test(cleanValue) ||
        australiaMobileRegex.test(cleanValue) ||
        australiaLandlineRegex.test(cleanValue) ||
        plainIndianRegex.test(cleanValue)) {
      return '';
    }

    return 'Please enter a valid phone number with country code (e.g., +91 9876543210 for India, +1 5551234567 for USA)';  },

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
