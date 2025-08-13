// ForgeTrack/admin-panel/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/authContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import WorkerLogsPage from './pages/WorkerLogsPage';
import ProductManagementPage from './pages/ProductManagementPage';
import CollapsibleSidebar from './components/CollapsibleSidebar';

// PrivateRoute component to protect routes
const PrivateRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">Loading...</div>;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`Access denied: User role '${user.role}' is not authorized.`);
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Main App component
function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}

// Component to render content based on auth state
function AppContent() {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (loading) {
      return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">Loading...</div>;
    }

    return (
        <div className="flex min-h-screen selection:bg-yellow-100 selection:text-black">
            {isAuthenticated && isAdmin && <CollapsibleSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />}
            <div className={`flex-1 transition-all duration-300 ${isAuthenticated && isAdmin && isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/dashboard"
                        element={<PrivateRoute allowedRoles={['admin']}><DashboardPage /></PrivateRoute>}
                    />
                    <Route
                        path="/employees"
                        element={<PrivateRoute allowedRoles={['admin']}><EmployeeManagementPage /></PrivateRoute>}
                    />
                    <Route
                        path="/worker-logs"
                        element={<PrivateRoute allowedRoles={['admin']}><WorkerLogsPage /></PrivateRoute>}
                    />
                    <Route
                        path="/products"
                        element={<PrivateRoute allowedRoles={['admin']}><ProductManagementPage /></PrivateRoute>}
                    />
                    <Route
                        path="/transporter-logs"
                        element={<PrivateRoute allowedRoles={['admin']}><div className="p-6 text-gray-700">Transporter Logs Page (Coming Soon!)</div></PrivateRoute>}
                    />
                     <Route
                        path="/reports"
                        element={<PrivateRoute allowedRoles={['admin']}><div className="p-6 text-gray-700">Reports Page (Coming Soon!)</div></PrivateRoute>}
                    />
                    <Route path="/" element={isAuthenticated && isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </div>
    );
}

export default App;
