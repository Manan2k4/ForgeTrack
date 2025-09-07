// ForgeTrack/worker-app/src/utils/api.js
import axios from 'axios';

// Create an Axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api', // Base URL for your backend API
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('workerToken'); // Get token from local storage
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // Add token to Authorization header
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration or invalid tokens
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the error response is 401 (Unauthorized) and token exists, it might be expired
        if (error.response && error.response.status === 401) {
            const token = localStorage.getItem('workerToken');
            if (token) {
                console.warn('Token expired or invalid, logging out...');
                localStorage.removeItem('workerToken'); // Remove invalid token
                localStorage.removeItem('workerUser'); // Remove user data
                // Optionally, redirect to login page
                // Using window.location.href to force a full page reload and clear state
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;