/**
 * Custom API Client with global 401 error handling
 * Automatically handles unauthorized responses and redirects to login
 */

import { dispatchNotificationRefresh } from './notificationEvents';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const BACKEND_RETRY_COOLDOWN_MS = 15000;
let backendUnavailableUntil = 0;

const buildApiUrl = (url) => {
    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

export const apiCall = async (url, options = {}) => {
    try {
        // Avoid flooding repeated failed requests while backend is offline.
        if (Date.now() < backendUnavailableUntil) {
            return {
                ok: false,
                status: 0,
                isNetworkError: true,
                error: 'Backend is temporarily unreachable. Please try again shortly.'
            };
        }

        const token = localStorage.getItem('token');
        const requestUrl = buildApiUrl(url);
        
        // Prepare headers
        const headers = {
            ...options.headers,
        };

        // Add token if it exists
        if (token) {
            headers['auth-token'] = token;
        }

        // Make the fetch call
        const response = await fetch(requestUrl, {
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
            localStorage.removeItem('isImpersonating');
            localStorage.removeItem('impersonatedEmployeeName');
            sessionStorage.removeItem('impersonationBackup');

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
                localStorage.removeItem('isImpersonating');
                localStorage.removeItem('impersonatedEmployeeName');
                sessionStorage.removeItem('impersonationBackup');

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
        const method = String(options.method || 'GET').toUpperCase();
        if (response.ok && method !== 'GET') {
            dispatchNotificationRefresh();
        }

        return response;

    } catch (error) {
        backendUnavailableUntil = Date.now() + BACKEND_RETRY_COOLDOWN_MS;
        return {
            ok: false,
            status: 0,
            isNetworkError: true,
            error: error?.message || 'Network error while contacting backend.'
        };
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
