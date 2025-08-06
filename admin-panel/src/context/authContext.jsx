// ForgeTrack/admin-panel/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api'; // Our configured Axios instance
import { useNavigate } from 'react-router-dom';

// Create the Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Stores authenticated user data
    const [loading, setLoading] = useState(true); // Loading state for initial auth check
    const navigate = useNavigate();

    // Effect to check for stored token on app load
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Call a backend endpoint to verify the token and get user data
                    // This is more secure than client-side decoding alone.
                    // You'll need to add a /api/auth/me route in your backend for this
                    const res = await api.get('/auth/me'); // Example: a route to get current user info
                    setUser(res.data); // Assuming res.data contains user object { _id, username, displayName, role, isActive }
                } catch (error) {
                    console.error('Failed to load user from token:', error);
                    localStorage.removeItem('token'); // Remove invalid token
                    setUser(null);
                }
            }
            setLoading(false); // Finished loading
        };
        loadUser();
    }, []);

    // Login function
    const login = async (username, password) => {
        try {
            const res = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', res.data.token); // Store token
            setUser(res.data); // Set user data from response
            navigate('/dashboard'); // Redirect to dashboard on success
            return true;
        } catch (error) {
            console.error('Login failed:', error.response?.data?.message || error.message);
            // Re-throw specific error message for UI to display
            throw error.response?.data?.message || 'Login failed';
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token'); // Remove token
        setUser(null); // Clear user state
        navigate('/login'); // Redirect to login page
    };

    // Context value provided to children
    const authContextValue = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user, // Convenience flag: true if user object exists
        isAdmin: user && user.role === 'admin' // Convenience flag: true if user is admin
    };

    if (loading) {
        // Simple loading indicator while auth state is being determined
        return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">Loading authentication...</div>;
    }

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    return useContext(AuthContext);
};
