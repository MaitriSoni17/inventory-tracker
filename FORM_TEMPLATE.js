// ============================================
// FORM VALIDATION TEMPLATE
// Copy this template for quick form setup
// ============================================

import React, { useState } from 'react';
import validationRules from '../../utils/validationHelper';
import '../styles/validation.css';

function MyForm(props) {
    // Step 1: State Management
    const [formData, setFormData] = useState({
        firstName: '',
        email: '',
        phone: '',
        // Add all your fields here
    });

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 2: Validation Function
    const validateForm = () => {
        const newErrors = {};

        // Validate firstName
        const firstNameError = validationRules.required(formData.firstName, 'First Name');
        if (firstNameError) newErrors.firstName = firstNameError;

        // Validate email
        const emailError = validationRules.required(formData.email, 'Email');
        if (emailError) {
            newErrors.email = emailError;
        } else {
            const emailFormatError = validationRules.email(formData.email);
            if (emailFormatError) newErrors.email = emailFormatError;
        }

        // Validate phone (optional)
        if (formData.phone) {
            const phoneError = validationRules.phone(formData.phone);
            if (phoneError) newErrors.phone = phoneError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Step 3: Individual Field Validation (for real-time feedback)
    const handleBlur = (fieldName) => {
        setTouched({ ...touched, [fieldName]: true });

        let error = '';
        const field = formData[fieldName];

        switch (fieldName) {
            case 'firstName':
                error = validationRules.required(field, 'First Name');
                break;
            case 'email':
                error = validationRules.required(field, 'Email') || validationRules.email(field);
                break;
            case 'phone':
                error = field ? validationRules.phone(field) : '';
                break;
            default:
                break;
        }

        if (error) {
            setErrors({ ...errors, [fieldName]: error });
        } else {
            setErrors({ ...errors, [fieldName]: '' });
        }
    };

    // Step 4: Input Change Handler
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    // Step 5: Form Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate before submitting
        if (!validateForm()) {
            props.showAlert("Please fix the errors in the form", "danger");
            return;
        }

        setIsSubmitting(true);
        try {
            // Make API call here
            const response = await fetch('YOUR_API_ENDPOINT', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(formData)
            });

            const json = await response.json();

            if (json.success) {
                // Clear form on success
                setFormData({ firstName: '', email: '', phone: '' });
                setErrors({});
                setTouched({});
                props.showAlert("Success!", "success");
            } else {
                props.showAlert(json.message || "Error occurred", "danger");
            }
        } catch (error) {
            props.showAlert("Connection error: " + error.message, "danger");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper function to check if there are real validation errors
    const hasErrors = () => {
        return Object.values(errors).some(error => error && error.trim() !== '');
    };

    return (
        <div className="container p-4">
            <h2>My Form</h2>

            {/* Error Summary - Shows all errors at top */}
            {Object.keys(errors).length > 0 && Object.values(touched).some(v => v) && (
                <div className="validation-summary" style={{ marginBottom: '2rem' }}>
                    <div className="validation-summary-title">
                        Please fix the following errors:
                    </div>
                    <ul className="validation-summary-list">
                        {errors.firstName && <li>{errors.firstName}</li>}
                        {errors.email && <li>{errors.email}</li>}
                        {errors.phone && <li>{errors.phone}</li>}
                    </ul>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* First Name Field */}
                <div className="form-group">
                    <label htmlFor="firstName" className="form-label">
                        First Name <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        className={`form-control ${
                            errors.firstName && touched.firstName ? 'is-invalid' : ''
                        } ${
                            !errors.firstName && touched.firstName && formData.firstName ? 'is-valid' : ''
                        }`}
                        placeholder="Enter first name"
                        value={formData.firstName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('firstName')}
                        disabled={isSubmitting}
                    />
                    {errors.firstName && touched.firstName && (
                        <div className="error-message">{errors.firstName}</div>
                    )}
                    {!errors.firstName && touched.firstName && formData.firstName && (
                        <div className="success-message">Looks good!</div>
                    )}
                </div>

                {/* Email Field */}
                <div className="form-group">
                    <label htmlFor="email" className="form-label">
                        Email Address <span className="required">*</span>
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className={`form-control ${
                            errors.email && touched.email ? 'is-invalid' : ''
                        } ${
                            !errors.email && touched.email && formData.email ? 'is-valid' : ''
                        }`}
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={() => handleBlur('email')}
                        disabled={isSubmitting}
                    />
                    {errors.email && touched.email && (
                        <div className="error-message">{errors.email}</div>
                    )}
                </div>

                {/* Phone Field (Optional) */}
                <div className="form-group">
                    <label htmlFor="phone" className="form-label">
                        Phone Number
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className={`form-control ${
                            errors.phone && touched.phone ? 'is-invalid' : ''
                        } ${
                            !errors.phone && touched.phone && formData.phone ? 'is-valid' : ''
                        }`}
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={() => handleBlur('phone')}
                        disabled={isSubmitting}
                    />
                    {errors.phone && touched.phone && (
                        <div className="error-message">{errors.phone}</div>
                    )}
                    {!touched.phone && (
                        <div className="info-message">Optional - 10 digit number</div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="form-group">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || hasErrors()}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default MyForm;

// ============================================
// CUSTOMIZATION NOTES
// ============================================

/*
1. Replace 'MyForm' with your actual component name
2. Update formData initial state with all your fields
3. Add validation rules in validateForm()
4. Add cases in handleBlur() for each field
5. Add form fields in JSX for each state property
6. Update API endpoint in handleSubmit()
7. Adjust styling classes as needed
8. Import in your parent component

Example field validations:
- Text: validationRules.required(value, 'Field Name')
- Email: validationRules.email(value)
- Password: validationRules.password(value, 6)
- Phone: validationRules.phone(value)
- Number: validationRules.number(value, 'Field Name')
- Date: validationRules.dateNotPast(value)
- URL: validationRules.url(value)
- Length: validationRules.minLength(value, 5, 'Field Name')
*/
