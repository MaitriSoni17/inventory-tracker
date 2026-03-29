/**
 * Custom API Client with global 401 error handling
 * Automatically handles unauthorized responses and redirects to login
 */

export const apiCall = async (url, options = {}) => {
    try {
        const token = localStorage.getItem('token');
        
        // Prepare headers
        const headers = {
            ...options.headers,
        };

        // Add token if it exists
        if (token) {
            headers['auth-token'] = token;
        }

        // Make the fetch call
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle 401 Unauthorized response
        if (response.status === 401) {
            // Clear authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('userId');
            localStorage.removeItem('forcePasswordChange');

            // Return error response for handling in component
            // Components can handle this and show alert before redirect
            return {
                ok: false,
                status: 401,
                error: 'Unauthorized - Session expired. Please login again.',
                isUnauthorized: true,
                shouldRedirect: true
            };
        }

        // Handle 403 deactivated-account response globally
        if (response.status === 403) {
            let errorData = null;
            try {
                errorData = await response.clone().json();
            } catch (parseError) {
                // Ignore parse errors for non-JSON responses
            }

            if (errorData?.code === 'ACCOUNT_DEACTIVATED') {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('userId');
                localStorage.removeItem('forcePasswordChange');

                return {
                    ok: false,
                    status: 403,
                    error: errorData.error || 'Account is deactivated. Please login again.',
                    code: 'ACCOUNT_DEACTIVATED',
                    isDeactivated: true,
                    shouldRedirect: true
                };
            }
        }

        // For other responses, return them as-is
        return response;

    } catch (error) {
        // console.error('API call error:', error);
        throw error;
    }
};

/**
 * Helper function to parse JSON response safely
 */
export const parseResponse = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        // console.error('Error parsing response:', error);
        return null;
    }
};
