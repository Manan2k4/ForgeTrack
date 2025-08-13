// ForgeTrack/admin-panel/src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const Sidebar = () => {
    const { logout } = useAuth();

    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col min-h-screen shadow-lg">
            <div className="p-6 text-2xl font-bold text-blue-400 border-b border-gray-700">
                ForgeTrack Admin
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                            isActive ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 hover:text-gray-100'
                        }`
                    }
                >
                    <span className="mr-3">📊</span> Dashboard
                </NavLink>
                <NavLink
                    to="/employees"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                            isActive ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 hover:text-gray-100'
                        }`
                    }
                >
                    <span className="mr-3">👷</span> Employees
                </NavLink>
                <NavLink
                    to="/worker-logs"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                            isActive ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 hover:text-gray-100'
                        }`
                    }
                >
                    <span className="mr-3">📝</span> Worker Logs
                </NavLink>
                <NavLink
                    to="/products" // <-- NEW: Add a link for product management
                    className={({ isActive }) =>
                        `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                            isActive ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 hover:text-gray-100'
                        }`
                    }
                >
                    <span className="mr-3">📦</span> Products
                </NavLink>
                <NavLink
                    to="/transporter-logs"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                            isActive ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 hover:text-gray-100'
                        }`
                    }
                >
                    <span className="mr-3">🚚</span> Transporter Logs
                </NavLink>
                <NavLink
                    to="/reports"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                            isActive ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 hover:text-gray-100'
                        }`
                    }
                >
                    <span className="mr-3">📈</span> Reports
                </NavLink>
            </nav>
            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200 text-white font-semibold"
                >
                    <span className="mr-2">🚪</span> Log Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
