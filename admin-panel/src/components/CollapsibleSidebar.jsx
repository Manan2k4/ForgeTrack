// ForgeTrack/admin-panel/src/components/CollapsibleSidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/authContext';

// Accept isOpen and toggleSidebar as props
const CollapsibleSidebar = ({ isOpen, toggleSidebar }) => {
    const { logout } = useAuth();

    return (
        <div className="relative">
            {/* Hamburger icon to toggle the sidebar */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 p-2 bg-red-600 text-white rounded-md shadow-lg md:hidden"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Sidebar container */}
            <div
                className={`fixed top-0 left-0 h-full bg-gray-800 text-white transition-all duration-300 ease-in-out z-40
                ${isOpen ? 'w-64' : 'w-0'}
                md:w-64 md:static md:translate-x-0 overflow-hidden shadow-lg`}
            >
                <div className="p-6 text-2xl font-bold text-blue-400 border-b border-gray-700">
                    ForgeTrack Admin
                </div>
                <nav className="flex flex-col flex-1 px-4 py-6 space-y-2">
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
                        to="/products"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                                isActive ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 hover:text-gray-100'
                            }`
                        }
                    >
                        <span className="mr-3">📦</span> Products
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
        </div>
    );
};

export default CollapsibleSidebar;
